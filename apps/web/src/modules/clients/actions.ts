"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { AppError } from "../../shared/errors/AppError";
import { mapSupabaseError } from "../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import { createClientSchema, updateClientNotesSchema, updateClientSchema } from "../../shared/validation/clients";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";
import type { Json } from "../../../lib/supabase/types";
import { Buffer } from "buffer";
import {
  createClient,
  updateClient,
  deleteClient as deleteClientRepo,
  findClientByNamePhone,
  replaceClientPhones,
  replaceClientEmails,
  upsertClientAddresses,
  replaceClientHealthItems,
} from "./repository";
import { createServiceClient } from "../../../lib/supabase/service";
import { requireDashboardAccessForServerAction } from "../auth/dashboard-access";

function buildAddressLine(payload: {
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}) {
  const parts = [
    payload.logradouro?.trim(),
    payload.numero?.trim(),
    payload.complemento?.trim(),
    payload.bairro?.trim(),
    payload.cidade?.trim(),
    payload.estado?.trim(),
    payload.cep?.trim(),
  ].filter((value) => value && value.length > 0);

  return parts.length > 0 ? parts.join(", ") : null;
}

function getInitials(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "CA";
  return trimmed.substring(0, 2).toUpperCase();
}

function parseJson<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (!raw || typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeImportPhone(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = parsePhoneNumberFromString(trimmed, "BR");
  return {
    number_raw: trimmed,
    number_e164: parsed?.isValid() ? parsed.format("E.164") : null,
  };
}

function normalizeImportEmail(raw: string) {
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBirthday(raw?: string | null) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  return null;
}

function parsePhotoDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const contentType = match[1] ?? "image/png";
  const base64 = match[2] ?? "";
  if (!base64) return null;
  const extension = contentType.split("/")[1] ?? "png";
  const buffer = Buffer.from(base64, "base64");
  return { buffer, contentType, extension };
}

type PhonePayload = {
  number_raw: string;
  number_e164?: string | null;
  label?: string | null;
  is_primary?: boolean;
  is_whatsapp?: boolean;
};

type EmailPayload = {
  email: string;
  label?: string | null;
  is_primary?: boolean;
};

type AddressPayload = {
  id?: string;
  label?: string | null;
  is_primary?: boolean;
  address_cep?: string | null;
  address_logradouro?: string | null;
  address_numero?: string | null;
  address_complemento?: string | null;
  address_bairro?: string | null;
  address_cidade?: string | null;
  address_estado?: string | null;
  referencia?: string | null;
};

type HealthItemPayload = {
  label: string;
  type: "allergy" | "condition" | "tag";
};

type ImportAddressPayload = {
  label?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  full?: string | null;
};

type ImportContactPayload = {
  name: string;
  phones?: string[];
  emails?: string[];
  birthday?: string | null;
  addresses?: ImportAddressPayload[];
  organization?: string | null;
  note?: string | null;
  photo?: string | null;
  raw?: Record<string, unknown>;
};

export async function createClientAction(formData: FormData): Promise<void> {

  await requireDashboardAccessForServerAction();
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
  const data_nascimento = (formData.get("data_nascimento") as string | null) || null;
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
  const extraData = parseJson<Record<string, unknown>>(formData.get("extra_data_json"), {});
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
    data_nascimento,
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
    data_nascimento: parsed.data.data_nascimento,
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
    extra_data: extraData as Json,
    tenant_id: FIXED_TENANT_ID,
  });

  const mappedError = mapSupabaseError(error);
  if (mappedError) throw mappedError;
  if (!data) throw new AppError("Cliente não criado", "UNKNOWN", 500);

  const clientId = data.id;

  const resolvedPhones = normalizedPhones.map((phone, index) => ({
    tenant_id: FIXED_TENANT_ID,
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
    const { error: phoneError } = await replaceClientPhones(FIXED_TENANT_ID, clientId, resolvedPhones);
    const mappedPhoneError = mapSupabaseError(phoneError);
    if (mappedPhoneError) throw mappedPhoneError;
  }

  const resolvedEmails = normalizedEmails.map((emailEntry, index) => ({
    tenant_id: FIXED_TENANT_ID,
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
    const { error: emailError } = await replaceClientEmails(FIXED_TENANT_ID, clientId, resolvedEmails);
    const mappedEmailError = mapSupabaseError(emailError);
    if (mappedEmailError) throw mappedEmailError;
  }

  const resolvedAddresses = addresses.map((address, index) => ({
    id: address.id,
    tenant_id: FIXED_TENANT_ID,
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
      FIXED_TENANT_ID,
      clientId,
      normalizedHealthItems.map((item) => ({
        tenant_id: FIXED_TENANT_ID,
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
    const { error: avatarError } = await updateClient(FIXED_TENANT_ID, clientId, {
      avatar_url: publicUrlData.publicUrl,
    });
    const mappedAvatarError = mapSupabaseError(avatarError);
    if (mappedAvatarError) throw mappedAvatarError;
  }

  redirect("/clientes");
}

export async function updateClientNotes(clientId: string, notes: string): Promise<ActionResult<{ id: string }>> {

  await requireDashboardAccessForServerAction();
  const parsed = updateClientNotesSchema.safeParse({ clientId, notes });
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos para observações", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await updateClient(FIXED_TENANT_ID, clientId, {
    observacoes_gerais: parsed.data.notes || null,
  });

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath(`/clientes/${clientId}`);
  return ok({ id: clientId });
}

export async function updateClientProfileAction(formData: FormData): Promise<ActionResult<{ id: string }>> {

  await requireDashboardAccessForServerAction();
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
  const data_nascimento = (formData.get("data_nascimento") as string | null) || null;
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
  const healthItemsJson = formData.get("health_items_json");
  const extraData = parseJson<Record<string, unknown>>(formData.get("extra_data_json"), {});

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
    data_nascimento,
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
    data_nascimento: parsed.data.data_nascimento,
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
    extra_data: extraData as Json,
  };

  if (parsed.data.observacoes_gerais !== undefined) {
    updatePayload.observacoes_gerais = parsed.data.observacoes_gerais;
  }

  const { error } = await updateClient(FIXED_TENANT_ID, parsed.data.clientId, updatePayload);

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
      tenant_id: FIXED_TENANT_ID,
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
    const { error: phoneError } = await replaceClientPhones(FIXED_TENANT_ID, parsed.data.clientId, resolvedPhones);
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
      tenant_id: FIXED_TENANT_ID,
      client_id: parsed.data.clientId,
      label: emailEntry.label ?? null,
      email: emailEntry.email,
      is_primary: emailEntry.is_primary ?? index === 0,
    }));
    if (resolvedEmails.length > 0 && !resolvedEmails.some((emailEntry) => emailEntry.is_primary)) {
      const firstEmail = resolvedEmails[0];
      if (firstEmail) firstEmail.is_primary = true;
    }
    const { error: emailError } = await replaceClientEmails(FIXED_TENANT_ID, parsed.data.clientId, resolvedEmails);
    const mappedEmailError = mapSupabaseError(emailError);
    if (mappedEmailError) return fail(mappedEmailError);
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
      FIXED_TENANT_ID,
      parsed.data.clientId,
      normalizedItems.map((item) => ({
        tenant_id: FIXED_TENANT_ID,
        client_id: parsed.data.clientId,
        label: item.label,
        type: item.type,
      }))
    );
    const mappedHealthError = mapSupabaseError(healthError);
    if (mappedHealthError) return fail(mappedHealthError);
  }

  revalidatePath(`/clientes/${parsed.data.clientId}`);
  return ok({ id: parsed.data.clientId });
}

export async function deleteClientAction(clientId: string): Promise<ActionResult<{ id: string }>> {

  await requireDashboardAccessForServerAction();
  const parsed = z.object({ clientId: z.string().uuid() }).safeParse({ clientId });
  if (!parsed.success) {
    return fail(new AppError("Cliente inválido", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await deleteClientRepo(FIXED_TENANT_ID, parsed.data.clientId);
  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath("/clientes");
  return ok({ id: parsed.data.clientId });
}

export async function importClientsFromContacts(
  contacts: ImportContactPayload[]
): Promise<ActionResult<{ created: number; skipped: number }>> {

  await requireDashboardAccessForServerAction();
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
      const { data: existingClient } = await findClientByNamePhone(FIXED_TENANT_ID, name, primaryPhone);
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

    const rawPayload = (contact.raw ?? { ...contact, photo: null }) as Json;
    const { data: createdClient, error } = await createClient({
      tenant_id: FIXED_TENANT_ID,
      name,
      phone: primaryPhone,
      email: primaryEmail,
      data_nascimento: normalizeBirthday(contact.birthday) ?? null,
      endereco_completo: addressLine ?? null,
      address_cep: primaryAddress?.cep ?? null,
      address_logradouro: primaryAddress?.logradouro ?? primaryAddress?.full ?? null,
      address_numero: primaryAddress?.numero ?? null,
      address_complemento: primaryAddress?.complemento ?? null,
      address_bairro: primaryAddress?.bairro ?? null,
      address_cidade: primaryAddress?.cidade ?? null,
      address_estado: primaryAddress?.estado ?? null,
      initials: getInitials(name),
      extra_data: rawPayload,
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
        tenant_id: FIXED_TENANT_ID,
        client_id: clientId,
        label: index === 0 ? "Principal" : "Outro",
        number_raw: phoneEntry.number_raw,
        number_e164: phoneEntry.number_e164 ?? null,
        is_primary: index === 0,
        is_whatsapp: index === 0,
      }));
      const { error: phoneError } = await replaceClientPhones(FIXED_TENANT_ID, clientId, resolvedPhones);
      const mappedPhoneError = mapSupabaseError(phoneError);
      if (mappedPhoneError) {
        skipped += 1;
        continue;
      }
    }

    if (normalizedEmails.length > 0) {
      const resolvedEmails = normalizedEmails.map((email, index) => ({
        tenant_id: FIXED_TENANT_ID,
        client_id: clientId,
        label: index === 0 ? "Principal" : "Outro",
        email,
        is_primary: index === 0,
      }));
      const { error: emailError } = await replaceClientEmails(FIXED_TENANT_ID, clientId, resolvedEmails);
      const mappedEmailError = mapSupabaseError(emailError);
      if (mappedEmailError) {
        skipped += 1;
        continue;
      }
    }

    if (addresses.length > 0) {
      const resolvedAddresses = addresses.map((address, index) => ({
        tenant_id: FIXED_TENANT_ID,
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
          await updateClient(FIXED_TENANT_ID, clientId, { avatar_url: publicUrlData.publicUrl });
        }
      }
    }

    created += 1;
  }

  revalidatePath("/clientes");
  return ok({ created, skipped });
}
