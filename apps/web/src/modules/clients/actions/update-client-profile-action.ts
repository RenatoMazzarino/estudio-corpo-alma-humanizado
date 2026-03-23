import { revalidatePath } from "next/cache";
import { AppError } from "../../../shared/errors/AppError";
import { mapSupabaseError } from "../../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../shared/errors/result";
import { updateClientSchema } from "../../../shared/validation/clients";
import { requireDashboardAccessForServerAction } from "../../auth/dashboard-access";
import {
  replaceClientAddresses,
  replaceClientEmails,
  replaceClientHealthItems,
  replaceClientPhones,
  updateClient,
} from "../repository";
import {
  buildAddressLine,
  getInitials,
  normalizeDateTimeLocal,
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
  const client_code = (formData.get("client_code") as string | null) || null;
  const name = formData.get("name") as string | null;
  const public_name = (formData.get("public_name") as string | null) || null;
  const system_name = (formData.get("system_name") as string | null) || null;
  const short_name = (formData.get("short_name") as string | null) || null;
  const phone = (formData.get("phone") as string | null) || null;
  const is_vip = formData.get("is_vip") === "on";
  const needs_attention = formData.get("needs_attention") === "on";
  const preferences_notes = (formData.get("preferences_notes") as string | null) || null;
  const contraindications = (formData.get("contraindications") as string | null) || null;
  const clinical_history = (formData.get("clinical_history") as string | null) || null;
  const anamnese_url = (formData.get("anamnese_url") as string | null) || null;
  const anamnese_form_status = (formData.get("anamnese_form_status") as string | null) || null;
  const anamnese_form_sent_at = normalizeDateTimeLocal((formData.get("anamnese_form_sent_at") as string | null) || null);
  const anamnese_form_answered_at = normalizeDateTimeLocal(
    (formData.get("anamnese_form_answered_at") as string | null) || null
  );
  const marketing_opt_in = formData.get("marketing_opt_in") === "on";
  const is_minor = formData.get("is_minor") === "on";
  const is_minor_override_raw = formData.get("is_minor_override");
  const is_minor_override =
    is_minor_override_raw === "on"
      ? true
      : is_minor_override_raw === "off"
      ? false
      : null;
  const guardian_name = (formData.get("guardian_name") as string | null) || null;
  const guardian_phone = (formData.get("guardian_phone") as string | null) || null;
  const guardian_cpf = (formData.get("guardian_cpf") as string | null) || null;
  const guardian_relationship = (formData.get("guardian_relationship") as string | null) || null;
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
  const removeAvatar = formData.get("remove_avatar") === "on";

  const parsed = updateClientSchema.safeParse({
    clientId,
    client_code,
    name,
    public_name,
    system_name,
    short_name,
    phone,
    is_vip,
    needs_attention,
    preferences_notes,
    contraindications,
    clinical_history,
    anamnese_url,
    anamnese_form_status,
    anamnese_form_sent_at,
    anamnese_form_answered_at,
    marketing_opt_in,
    is_minor,
    is_minor_override,
    guardian_name,
    guardian_phone,
    guardian_cpf,
    guardian_relationship,
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
    name: parsed.data.system_name ?? parsed.data.name,
    public_name: parsed.data.public_name,
    system_name: parsed.data.system_name,
    short_name: parsed.data.short_name,
    phone: parsed.data.phone,
    is_vip: parsed.data.is_vip ?? false,
    needs_attention: parsed.data.needs_attention ?? false,
    preferences_notes: parsed.data.preferences_notes,
    contraindications: parsed.data.contraindications,
    clinical_history: parsed.data.clinical_history,
    anamnese_url: parsed.data.anamnese_url,
    anamnese_form_status: parsed.data.anamnese_form_status,
    anamnese_form_sent_at: parsed.data.anamnese_form_sent_at,
    anamnese_form_answered_at: parsed.data.anamnese_form_answered_at,
    marketing_opt_in: parsed.data.marketing_opt_in ?? false,
    is_minor: parsed.data.is_minor ?? false,
    is_minor_override: parsed.data.is_minor_override ?? null,
    guardian_name: parsed.data.guardian_name,
    guardian_phone: parsed.data.guardian_phone,
    guardian_cpf: parsed.data.guardian_cpf,
    guardian_relationship: parsed.data.guardian_relationship,
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
      normalized_number: (phoneEntry.number_e164 ?? phoneEntry.number_raw).replace(/\D/g, "") || null,
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
      normalized_email: emailEntry.email.trim().toLowerCase(),
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

    const resolvedAddresses: Parameters<typeof replaceClientAddresses>[2] = normalizedAddresses.map(
      (addressEntry, index) => ({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        client_id: parsed.data.clientId,
        label: addressEntry.label ?? (index === 0 ? "principal" : "outro"),
        is_primary: addressEntry.is_primary ?? index === 0,
        address_cep: addressEntry.address_cep ?? null,
        address_logradouro: addressEntry.address_logradouro ?? null,
        address_numero: addressEntry.address_numero ?? null,
        address_complemento: addressEntry.address_complemento ?? null,
        address_bairro: addressEntry.address_bairro ?? null,
        address_cidade: addressEntry.address_cidade ?? null,
        address_estado: addressEntry.address_estado ?? null,
        referencia: addressEntry.referencia ?? null,
      })
    );

    if (resolvedAddresses.length > 0 && !resolvedAddresses.some((addressEntry) => addressEntry.is_primary)) {
      const firstAddress = resolvedAddresses[0];
      if (firstAddress) firstAddress.is_primary = true;
    }

    const { error: addressError } = await replaceClientAddresses(tenantId, parsed.data.clientId, resolvedAddresses);
    const mappedAddressError = mapSupabaseError(addressError);
    if (mappedAddressError) return fail(mappedAddressError);
  }

  if (healthItemsJson) {
    const items = parseJson<HealthItemPayload[]>(healthItemsJson, []);
    const normalizedItems = items
      .map((item) => ({
        label: item.label?.trim(),
        type: item.type,
        notes: item.notes ?? null,
        severity: item.severity ?? null,
        is_active: item.is_active ?? true,
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
        notes: item.notes,
        severity: item.severity,
        is_active: item.is_active,
      }))
    );
    const mappedHealthError = mapSupabaseError(healthError);
    if (mappedHealthError) return fail(mappedHealthError);
  }

  if (removeAvatar && !(avatarFile instanceof File && avatarFile.size > 0)) {
    const { error: clearAvatarError } = await updateClient(tenantId, parsed.data.clientId, {
      avatar_url: null,
    });
    const mappedClearAvatarError = mapSupabaseError(clearAvatarError);
    if (mappedClearAvatarError) return fail(mappedClearAvatarError);
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
