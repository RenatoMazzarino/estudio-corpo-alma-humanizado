import { revalidatePath } from "next/cache";
import { AppError } from "../../../shared/errors/AppError";
import { mapSupabaseError } from "../../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../shared/errors/result";
import { updateClientSchema } from "../../../shared/validation/clients";
import { requireDashboardAccessForServerAction } from "../../auth/dashboard-access";
import {
  listClientAddresses,
  replaceClientAddresses,
  replaceClientEmails,
  replaceClientHealthItems,
  replaceClientPhones,
  updateClient,
} from "../repository";
import {
  buildAddressLine,
  getInitials,
  parseJson,
  uploadClientAvatar,
  type AddressPayload,
  type EmailPayload,
  type HealthItemPayload,
  type PhonePayload,
} from "../actions.helpers";

export async function runUpdateClientProfileAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { tenantId } = await requireDashboardAccessForServerAction();
  const clientId = formData.get("clientId") as string | null;
  const name = formData.get("name") as string | null;
  const phone = (formData.get("phone") as string | null) || null;
  const is_vip = formData.get("is_vip") === "on";
  const needs_attention = formData.get("needs_attention") === "on";
  const preferences_notes = (formData.get("preferences_notes") as string | null) || null;
  const contraindications = (formData.get("contraindications") as string | null) || null;
  const clinical_history = (formData.get("clinical_history") as string | null) || null;
  const anamnese_url = (formData.get("anamnese_url") as string | null) || null;
  const marketing_opt_in = formData.get("marketing_opt_in") === "on";
  const is_minor = formData.get("is_minor") === "on";
  const guardian_name = (formData.get("guardian_name") as string | null) || null;
  const guardian_phone = (formData.get("guardian_phone") as string | null) || null;
  const guardian_cpf = (formData.get("guardian_cpf") as string | null) || null;
  const observacoes_gerais = (formData.get("observacoes_gerais") as string | null) || null;
  const email = (formData.get("email") as string | null) || null;
  const public_first_name = (formData.get("public_first_name") as string | null) || null;
  const public_last_name = (formData.get("public_last_name") as string | null) || null;
  const internal_reference = (formData.get("internal_reference") as string | null) || null;
  const birth_date =
    ((formData.get("birth_date") as string | null) || (formData.get("data_nascimento") as string | null) || null);
  const cpf = (formData.get("cpf") as string | null) || null;
  const endereco_completo = (formData.get("endereco_completo") as string | null) || null;
  const address_cep = (formData.get("address_cep") as string | null) || null;
  const address_logradouro = (formData.get("address_logradouro") as string | null) || null;
  const address_numero = (formData.get("address_numero") as string | null) || null;
  const address_complemento = (formData.get("address_complemento") as string | null) || null;
  const address_bairro = (formData.get("address_bairro") as string | null) || null;
  const address_cidade = (formData.get("address_cidade") as string | null) || null;
  const address_estado = (formData.get("address_estado") as string | null) || null;
  const profissao = (formData.get("profissao") as string | null) || null;
  const como_conheceu = (formData.get("como_conheceu") as string | null) || null;
  const healthTagsRaw = (formData.get("health_tags") as string | null) || null;
  const health_tags =
    healthTagsRaw && healthTagsRaw.trim().length > 0
      ? healthTagsRaw
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : null;
  const phonesJson = formData.get("phones_json");
  const emailsJson = formData.get("emails_json");
  const addressesJson = formData.get("addresses_json");
  const healthItemsJson = formData.get("health_items_json");
  const avatarFile = formData.get("avatar");

  const parsed = updateClientSchema.safeParse({
    clientId,
    name,
    phone,
    is_vip,
    needs_attention,
    preferences_notes,
    contraindications,
    clinical_history,
    anamnese_url,
    marketing_opt_in,
    is_minor,
    guardian_name,
    guardian_phone,
    guardian_cpf,
    observacoes_gerais,
    email,
    public_first_name,
    public_last_name,
    internal_reference,
    birth_date,
    cpf,
    endereco_completo,
    address_cep,
    address_logradouro,
    address_numero,
    address_complemento,
    address_bairro,
    address_cidade,
    address_estado,
    profissao,
    como_conheceu,
    health_tags,
  });

  if (!parsed.success) {
    return fail(new AppError("Dados inválidos para cliente", "VALIDATION_ERROR", 400, parsed.error));
  }

  const updatePayload: Parameters<typeof updateClient>[2] = {
    name: parsed.data.name,
    phone: parsed.data.phone,
    is_vip: parsed.data.is_vip ?? false,
    needs_attention: parsed.data.needs_attention ?? false,
    preferences_notes: parsed.data.preferences_notes,
    contraindications: parsed.data.contraindications,
    clinical_history: parsed.data.clinical_history,
    anamnese_url: parsed.data.anamnese_url,
    marketing_opt_in: parsed.data.marketing_opt_in ?? false,
    is_minor: parsed.data.is_minor ?? false,
    guardian_name: parsed.data.guardian_name,
    guardian_phone: parsed.data.guardian_phone,
    guardian_cpf: parsed.data.guardian_cpf,
    email: parsed.data.email,
    public_first_name: parsed.data.public_first_name,
    public_last_name: parsed.data.public_last_name,
    internal_reference: parsed.data.internal_reference,
    birth_date: parsed.data.birth_date,
    cpf: parsed.data.cpf,
    endereco_completo:
      buildAddressLine({
        cep: parsed.data.address_cep,
        logradouro: parsed.data.address_logradouro,
        numero: parsed.data.address_numero,
        complemento: parsed.data.address_complemento,
        bairro: parsed.data.address_bairro,
        cidade: parsed.data.address_cidade,
        estado: parsed.data.address_estado,
      }) ?? parsed.data.endereco_completo,
    address_cep: parsed.data.address_cep,
    address_logradouro: parsed.data.address_logradouro,
    address_numero: parsed.data.address_numero,
    address_complemento: parsed.data.address_complemento,
    address_bairro: parsed.data.address_bairro,
    address_cidade: parsed.data.address_cidade,
    address_estado: parsed.data.address_estado,
    profissao: parsed.data.profissao,
    como_conheceu: parsed.data.como_conheceu,
    health_tags: parsed.data.health_tags,
    initials: getInitials(parsed.data.name),
  };

  if (parsed.data.observacoes_gerais !== undefined) {
    updatePayload.observacoes_gerais = parsed.data.observacoes_gerais;
  }

  const { error } = await updateClient(tenantId, parsed.data.clientId, updatePayload);
  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  if (phonesJson) {
    const phones = parseJson<PhonePayload[]>(phonesJson, []);
    const normalizedPhones = phones.filter((phoneEntry) => phoneEntry.number_raw && phoneEntry.number_raw.trim().length > 0);
    const primaryPhone = normalizedPhones.find((phoneEntry) => phoneEntry.is_primary) ?? normalizedPhones[0] ?? null;
    if (primaryPhone && parsed.data.phone) {
      primaryPhone.number_raw = parsed.data.phone;
    }
    const resolvedPhones = normalizedPhones.map((phoneEntry, index) => ({
      tenant_id: tenantId,
      client_id: parsed.data.clientId,
      label: phoneEntry.label ?? null,
      number_raw: phoneEntry.number_raw,
      number_e164: phoneEntry.number_e164 ?? null,
      is_primary: phoneEntry.is_primary ?? index === 0,
      is_whatsapp: phoneEntry.is_whatsapp ?? false,
    }));
    if (resolvedPhones.length > 0 && !resolvedPhones.some((phoneEntry) => phoneEntry.is_primary)) {
      const firstPhone = resolvedPhones[0];
      if (firstPhone) firstPhone.is_primary = true;
    }
    if (resolvedPhones.length > 0 && !resolvedPhones.some((phoneEntry) => phoneEntry.is_whatsapp)) {
      const firstPhone = resolvedPhones[0];
      if (firstPhone) firstPhone.is_whatsapp = true;
    }
    const { error: phoneError } = await replaceClientPhones(tenantId, parsed.data.clientId, resolvedPhones);
    const mappedPhoneError = mapSupabaseError(phoneError);
    if (mappedPhoneError) return fail(mappedPhoneError);
  }

  if (emailsJson) {
    const emails = parseJson<EmailPayload[]>(emailsJson, []);
    const normalizedEmails = emails.filter((emailEntry) => emailEntry.email && emailEntry.email.trim().length > 0);
    const primaryEmail = normalizedEmails.find((emailEntry) => emailEntry.is_primary) ?? normalizedEmails[0] ?? null;
    if (primaryEmail && parsed.data.email) {
      primaryEmail.email = parsed.data.email;
    }
    const resolvedEmails = normalizedEmails.map((emailEntry, index) => ({
      tenant_id: tenantId,
      client_id: parsed.data.clientId,
      label: emailEntry.label ?? null,
      email: emailEntry.email,
      is_primary: emailEntry.is_primary ?? index === 0,
    }));
    if (resolvedEmails.length > 0 && !resolvedEmails.some((emailEntry) => emailEntry.is_primary)) {
      const firstEmail = resolvedEmails[0];
      if (firstEmail) firstEmail.is_primary = true;
    }
    const { error: emailError } = await replaceClientEmails(tenantId, parsed.data.clientId, resolvedEmails);
    const mappedEmailError = mapSupabaseError(emailError);
    if (mappedEmailError) return fail(mappedEmailError);
  }

  if (addressesJson) {
    const addresses = parseJson<AddressPayload[]>(addressesJson, []);
    const normalizedAddresses = addresses.filter((addressEntry) =>
      [
        addressEntry.address_cep,
        addressEntry.address_logradouro,
        addressEntry.address_numero,
        addressEntry.address_complemento,
        addressEntry.address_bairro,
        addressEntry.address_cidade,
        addressEntry.address_estado,
      ].some((value) => (value ?? "").trim().length > 0)
    );

    if (normalizedAddresses.length > 0) {
      const { data: existingAddresses, error: existingAddressesError } = await listClientAddresses(
        tenantId,
        parsed.data.clientId
      );
      const mappedExistingAddressesError = mapSupabaseError(existingAddressesError);
      if (mappedExistingAddressesError) return fail(mappedExistingAddressesError);

      const existingNonPrimaryAddresses = (existingAddresses ?? []).filter((addressEntry) => !addressEntry.is_primary);
      const submittedPrimaryAddress =
        normalizedAddresses.find((addressEntry) => addressEntry.is_primary) ?? normalizedAddresses[0];
      const existingPrimaryAddress =
        (existingAddresses ?? []).find((addressEntry) => addressEntry.is_primary) ?? null;

      const resolvedAddresses = [
        {
          id: submittedPrimaryAddress?.id ?? existingPrimaryAddress?.id,
          tenant_id: tenantId,
          client_id: parsed.data.clientId,
          label: submittedPrimaryAddress?.label ?? "Principal",
          is_primary: true,
          address_cep: submittedPrimaryAddress?.address_cep ?? null,
          address_logradouro: submittedPrimaryAddress?.address_logradouro ?? null,
          address_numero: submittedPrimaryAddress?.address_numero ?? null,
          address_complemento: submittedPrimaryAddress?.address_complemento ?? null,
          address_bairro: submittedPrimaryAddress?.address_bairro ?? null,
          address_cidade: submittedPrimaryAddress?.address_cidade ?? null,
          address_estado: submittedPrimaryAddress?.address_estado ?? null,
          referencia: submittedPrimaryAddress?.referencia ?? null,
        },
        ...existingNonPrimaryAddresses.map((addressEntry) => ({
          id: addressEntry.id,
          tenant_id: tenantId,
          client_id: parsed.data.clientId,
          label: addressEntry.label ?? "Outro",
          is_primary: false,
          address_cep: addressEntry.address_cep ?? null,
          address_logradouro: addressEntry.address_logradouro ?? null,
          address_numero: addressEntry.address_numero ?? null,
          address_complemento: addressEntry.address_complemento ?? null,
          address_bairro: addressEntry.address_bairro ?? null,
          address_cidade: addressEntry.address_cidade ?? null,
          address_estado: addressEntry.address_estado ?? null,
          referencia: addressEntry.referencia ?? null,
        })),
      ];

      const { error: addressError } = await replaceClientAddresses(tenantId, parsed.data.clientId, resolvedAddresses);
      const mappedAddressError = mapSupabaseError(addressError);
      if (mappedAddressError) return fail(mappedAddressError);
    }
  }

  if (healthItemsJson) {
    const items = parseJson<HealthItemPayload[]>(healthItemsJson, []);
    const normalizedItems = items
      .map((item) => ({
        label: item.label?.trim(),
        type: item.type,
      }))
      .filter((item) => item.label && item.label.length > 0) as HealthItemPayload[];
    const { error: healthError } = await replaceClientHealthItems(
      tenantId,
      parsed.data.clientId,
      normalizedItems.map((item) => ({
        tenant_id: tenantId,
        client_id: parsed.data.clientId,
        label: item.label,
        type: item.type,
      }))
    );
    const mappedHealthError = mapSupabaseError(healthError);
    if (mappedHealthError) return fail(mappedHealthError);
  }

  if (avatarFile instanceof File && avatarFile.size > 0) {
    try {
      const avatarUrl = await uploadClientAvatar(parsed.data.clientId, avatarFile);
      const { error: avatarError } = await updateClient(tenantId, parsed.data.clientId, {
        avatar_url: avatarUrl,
      });
      const mappedAvatarError = mapSupabaseError(avatarError);
      if (mappedAvatarError) return fail(mappedAvatarError);
    } catch (error) {
      return fail(error instanceof AppError ? error : new AppError("Falha ao enviar imagem do cliente", "STORAGE_ERROR", 500, error));
    }
  }

  revalidatePath(`/clientes/${parsed.data.clientId}/editar`);
  revalidatePath(`/clientes/${parsed.data.clientId}`);
  return ok({ id: parsed.data.clientId });
}
