import { revalidatePath } from "next/cache";
import { mapSupabaseError } from "../../../shared/errors/mapSupabaseError";
import { ok, type ActionResult } from "../../../shared/errors/result";
import { createServiceClient } from "../../../../lib/supabase/service";
import { requireDashboardAccessForServerAction } from "../../auth/dashboard-access";
import {
  createClient,
  findClientByNamePhone,
  replaceClientEmails,
  replaceClientPhones,
  updateClient,
  upsertClientAddresses,
} from "../repository";
import {
  buildAddressLine,
  getInitials,
  normalizeBirthday,
  normalizeImportEmail,
  normalizeImportPhone,
  parsePhotoDataUrl,
  type ImportContactPayload,
} from "../actions.helpers";

export async function runImportClientsFromContacts(
  contacts: ImportContactPayload[]
): Promise<ActionResult<{ created: number; skipped: number }>> {
  const { tenantId } = await requireDashboardAccessForServerAction();
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return ok({ created: 0, skipped: 0 });
  }

  let created = 0;
  let skipped = 0;

  for (const contact of contacts) {
    const name = contact.name?.trim();
    if (!name) {
      skipped += 1;
      continue;
    }

    const normalizedPhones = (contact.phones ?? [])
      .map(normalizeImportPhone)
      .filter(Boolean) as { number_raw: string; number_e164: string | null }[];
    const normalizedEmails = (contact.emails ?? [])
      .map(normalizeImportEmail)
      .filter(Boolean) as string[];

    const primaryPhone = normalizedPhones[0]?.number_raw ?? null;
    const primaryEmail = normalizedEmails[0] ?? null;

    if (primaryPhone) {
      const { data: existingClient } = await findClientByNamePhone(tenantId, name, primaryPhone);
      if (existingClient?.id) {
        skipped += 1;
        continue;
      }
    }

    const addresses = contact.addresses ?? [];
    const primaryAddress = addresses[0] ?? null;
    const addressLine =
      primaryAddress?.full ??
      buildAddressLine({
        cep: primaryAddress?.cep ?? null,
        logradouro: primaryAddress?.logradouro ?? null,
        numero: primaryAddress?.numero ?? null,
        complemento: primaryAddress?.complemento ?? null,
        bairro: primaryAddress?.bairro ?? null,
        cidade: primaryAddress?.cidade ?? null,
        estado: primaryAddress?.estado ?? null,
      });

    const { data: createdClient, error } = await createClient({
      tenant_id: tenantId,
      name,
      phone: primaryPhone,
      email: primaryEmail,
      birth_date: normalizeBirthday(contact.birthday) ?? null,
      endereco_completo: addressLine ?? null,
      address_cep: primaryAddress?.cep ?? null,
      address_logradouro: primaryAddress?.logradouro ?? primaryAddress?.full ?? null,
      address_numero: primaryAddress?.numero ?? null,
      address_complemento: primaryAddress?.complemento ?? null,
      address_bairro: primaryAddress?.bairro ?? null,
      address_cidade: primaryAddress?.cidade ?? null,
      address_estado: primaryAddress?.estado ?? null,
      initials: getInitials(name),
      marketing_opt_in: false,
    });

    const mappedError = mapSupabaseError(error);
    if (mappedError || !createdClient) {
      skipped += 1;
      continue;
    }

    const clientId = createdClient.id;

    if (normalizedPhones.length > 0) {
      const resolvedPhones = normalizedPhones.map((phoneEntry, index) => ({
        tenant_id: tenantId,
        client_id: clientId,
        label: index === 0 ? "Principal" : "Outro",
        number_raw: phoneEntry.number_raw,
        number_e164: phoneEntry.number_e164 ?? null,
        is_primary: index === 0,
        is_whatsapp: index === 0,
      }));
      const { error: phoneError } = await replaceClientPhones(tenantId, clientId, resolvedPhones);
      const mappedPhoneError = mapSupabaseError(phoneError);
      if (mappedPhoneError) {
        skipped += 1;
        continue;
      }
    }

    if (normalizedEmails.length > 0) {
      const resolvedEmails = normalizedEmails.map((email, index) => ({
        tenant_id: tenantId,
        client_id: clientId,
        label: index === 0 ? "Principal" : "Outro",
        email,
        is_primary: index === 0,
      }));
      const { error: emailError } = await replaceClientEmails(tenantId, clientId, resolvedEmails);
      const mappedEmailError = mapSupabaseError(emailError);
      if (mappedEmailError) {
        skipped += 1;
        continue;
      }
    }

    if (addresses.length > 0) {
      const resolvedAddresses = addresses.map((address, index) => ({
        tenant_id: tenantId,
        client_id: clientId,
        label: address.label ?? (index === 0 ? "Principal" : "Outro"),
        is_primary: index === 0,
        address_cep: address.cep ?? null,
        address_logradouro: address.logradouro ?? address.full ?? null,
        address_numero: address.numero ?? null,
        address_complemento: address.complemento ?? null,
        address_bairro: address.bairro ?? null,
        address_cidade: address.cidade ?? null,
        address_estado: address.estado ?? null,
      }));
      const { error: addressError } = await upsertClientAddresses(resolvedAddresses);
      const mappedAddressError = mapSupabaseError(addressError);
      if (mappedAddressError) {
        skipped += 1;
        continue;
      }
    }

    if (contact.photo) {
      const parsedPhoto = parsePhotoDataUrl(contact.photo);
      if (parsedPhoto) {
        const supabase = createServiceClient();
        const filePath = `clients/${clientId}/import-${Date.now()}.${parsedPhoto.extension}`;
        const { error: uploadError } = await supabase.storage.from("client-avatars").upload(filePath, parsedPhoto.buffer, {
          upsert: true,
          contentType: parsedPhoto.contentType,
        });
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from("client-avatars").getPublicUrl(filePath);
          await updateClient(tenantId, clientId, { avatar_url: publicUrlData.publicUrl });
        }
      }
    }

    created += 1;
  }

  revalidatePath("/clientes");
  return ok({ created, skipped });
}
