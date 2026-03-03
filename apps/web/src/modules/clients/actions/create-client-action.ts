import { redirect } from "next/navigation";
import { AppError } from "../../../shared/errors/AppError";
import { mapSupabaseError } from "../../../shared/errors/mapSupabaseError";
import { createClientSchema } from "../../../shared/validation/clients";
import { createServiceClient } from "../../../../lib/supabase/service";
import { requireDashboardAccessForServerAction } from "../../auth/dashboard-access";
import {
  createClient,
  replaceClientEmails,
  replaceClientHealthItems,
  replaceClientPhones,
  updateClient,
  upsertClientAddresses,
} from "../repository";
import {
  buildAddressLine,
  getInitials,
  parseJson,
  type AddressPayload,
  type EmailPayload,
  type HealthItemPayload,
  type PhonePayload,
} from "../actions.helpers";

export async function runCreateClientAction(formData: FormData): Promise<void> {
  const { tenantId } = await requireDashboardAccessForServerAction();
  const name = formData.get("name") as string | null;
  const phoneField = (formData.get("phone") as string | null) || null;
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
  const observacoes_gerais = formData.has("observacoes_gerais")
    ? ((formData.get("observacoes_gerais") as string | null) || null)
    : undefined;
  const emailField = (formData.get("email") as string | null) || null;
  const public_first_name = (formData.get("public_first_name") as string | null) || null;
  const public_last_name = (formData.get("public_last_name") as string | null) || null;
  const internal_reference = (formData.get("internal_reference") as string | null) || null;
  const birth_date =
    ((formData.get("birth_date") as string | null) || (formData.get("data_nascimento") as string | null) || null);
  const cpf = (formData.get("cpf") as string | null) || null;
  const endereco_completo = (formData.get("endereco_completo") as string | null) || null;
  const addressCepField = (formData.get("address_cep") as string | null) || null;
  const addressLogradouroField = (formData.get("address_logradouro") as string | null) || null;
  const addressNumeroField = (formData.get("address_numero") as string | null) || null;
  const addressComplementoField = (formData.get("address_complemento") as string | null) || null;
  const addressBairroField = (formData.get("address_bairro") as string | null) || null;
  const addressCidadeField = (formData.get("address_cidade") as string | null) || null;
  const addressEstadoField = (formData.get("address_estado") as string | null) || null;
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
  const phones = parseJson<PhonePayload[]>(formData.get("phones_json"), []);
  const emails = parseJson<EmailPayload[]>(formData.get("emails_json"), []);
  const addresses = parseJson<AddressPayload[]>(formData.get("addresses_json"), []);
  const healthItems = parseJson<HealthItemPayload[]>(formData.get("health_items_json"), []);
  const avatarFile = formData.get("avatar");

  const normalizedPhones = phones.filter((phone) => phone.number_raw && phone.number_raw.trim().length > 0);
  const primaryPhone = normalizedPhones.find((phone) => phone.is_primary) ?? normalizedPhones[0] ?? null;
  const phone = primaryPhone?.number_raw ?? phoneField;

  const normalizedEmails = emails.filter((email) => email.email && email.email.trim().length > 0);
  const primaryEmail = normalizedEmails.find((email) => email.is_primary) ?? normalizedEmails[0] ?? null;
  const email = primaryEmail?.email ?? emailField;

  const primaryAddress = addresses.find((address) => address.is_primary) ?? addresses[0] ?? null;
  const address_cep = primaryAddress?.address_cep ?? addressCepField;
  const address_logradouro = primaryAddress?.address_logradouro ?? addressLogradouroField;
  const address_numero = primaryAddress?.address_numero ?? addressNumeroField;
  const address_complemento = primaryAddress?.address_complemento ?? addressComplementoField;
  const address_bairro = primaryAddress?.address_bairro ?? addressBairroField;
  const address_cidade = primaryAddress?.address_cidade ?? addressCidadeField;
  const address_estado = primaryAddress?.address_estado ?? addressEstadoField;

  const parsed = createClientSchema.safeParse({
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
    throw new AppError("Dados inválidos para cliente", "VALIDATION_ERROR", 400, parsed.error);
  }

  const { data, error } = await createClient({
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
    observacoes_gerais: parsed.data.observacoes_gerais,
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
    tenant_id: tenantId,
  });

  const mappedError = mapSupabaseError(error);
  if (mappedError) throw mappedError;
  if (!data) throw new AppError("Cliente não criado", "UNKNOWN", 500);

  const clientId = data.id;

  const resolvedPhones = normalizedPhones.map((phone, index) => ({
    tenant_id: tenantId,
    client_id: clientId,
    label: phone.label ?? null,
    number_raw: phone.number_raw,
    number_e164: phone.number_e164 ?? null,
    is_primary: phone.is_primary ?? index === 0,
    is_whatsapp: phone.is_whatsapp ?? false,
  }));
  if (resolvedPhones.length > 0 && !resolvedPhones.some((phone) => phone.is_primary)) {
    const firstPhone = resolvedPhones[0];
    if (firstPhone) firstPhone.is_primary = true;
  }
  if (resolvedPhones.length > 0 && !resolvedPhones.some((phone) => phone.is_whatsapp)) {
    const firstPhone = resolvedPhones[0];
    if (firstPhone) firstPhone.is_whatsapp = true;
  }

  if (resolvedPhones.length > 0) {
    const { error: phoneError } = await replaceClientPhones(tenantId, clientId, resolvedPhones);
    const mappedPhoneError = mapSupabaseError(phoneError);
    if (mappedPhoneError) throw mappedPhoneError;
  }

  const resolvedEmails = normalizedEmails.map((emailEntry, index) => ({
    tenant_id: tenantId,
    client_id: clientId,
    label: emailEntry.label ?? null,
    email: emailEntry.email,
    is_primary: emailEntry.is_primary ?? index === 0,
  }));
  if (resolvedEmails.length > 0 && !resolvedEmails.some((emailEntry) => emailEntry.is_primary)) {
    const firstEmail = resolvedEmails[0];
    if (firstEmail) firstEmail.is_primary = true;
  }

  if (resolvedEmails.length > 0) {
    const { error: emailError } = await replaceClientEmails(tenantId, clientId, resolvedEmails);
    const mappedEmailError = mapSupabaseError(emailError);
    if (mappedEmailError) throw mappedEmailError;
  }

  const resolvedAddresses = addresses.map((address, index) => ({
    id: address.id,
    tenant_id: tenantId,
    client_id: clientId,
    label: address.label ?? "Principal",
    is_primary: address.is_primary ?? index === 0,
    address_cep: address.address_cep ?? null,
    address_logradouro: address.address_logradouro ?? null,
    address_numero: address.address_numero ?? null,
    address_complemento: address.address_complemento ?? null,
    address_bairro: address.address_bairro ?? null,
    address_cidade: address.address_cidade ?? null,
    address_estado: address.address_estado ?? null,
    referencia: address.referencia ?? null,
  }));

  if (resolvedAddresses.length > 0) {
    const { error: addressError } = await upsertClientAddresses(resolvedAddresses);
    const mappedAddressError = mapSupabaseError(addressError);
    if (mappedAddressError) throw mappedAddressError;
  }

  const normalizedHealthItems = healthItems
    .map((item) => ({
      label: item.label?.trim(),
      type: item.type,
    }))
    .filter((item) => item.label && item.label.length > 0) as HealthItemPayload[];

  if (normalizedHealthItems.length > 0) {
    const { error: healthError } = await replaceClientHealthItems(
      tenantId,
      clientId,
      normalizedHealthItems.map((item) => ({
        tenant_id: tenantId,
        client_id: clientId,
        label: item.label,
        type: item.type,
      }))
    );
    const mappedHealthError = mapSupabaseError(healthError);
    if (mappedHealthError) throw mappedHealthError;
  }

  if (avatarFile instanceof File && avatarFile.size > 0) {
    const supabase = createServiceClient();
    const extension = avatarFile.name.split(".").pop() || "png";
    const filePath = `clients/${clientId}/${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("client-avatars")
      .upload(filePath, avatarFile, { upsert: true });

    if (uploadError) {
      throw new AppError("Falha ao enviar imagem do cliente", "STORAGE_ERROR", 500, uploadError);
    }

    const { data: publicUrlData } = supabase.storage.from("client-avatars").getPublicUrl(filePath);
    const { error: avatarError } = await updateClient(tenantId, clientId, {
      avatar_url: publicUrlData.publicUrl,
    });
    const mappedAvatarError = mapSupabaseError(avatarError);
    if (mappedAvatarError) throw mappedAvatarError;
  }

  redirect("/clientes");
}
