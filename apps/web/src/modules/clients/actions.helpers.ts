import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Buffer } from "buffer";
import { createServiceClient } from "../../../lib/supabase/service";
import { AppError } from "../../shared/errors/AppError";

export function buildAddressLine(payload: {
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

export function getInitials(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "CA";
  return trimmed.substring(0, 2).toUpperCase();
}

export function parseJson<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (!raw || typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function normalizeImportPhone(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = parsePhoneNumberFromString(trimmed, "BR");
  return {
    number_raw: trimmed,
    number_e164: parsed?.isValid() ? parsed.format("E.164") : null,
  };
}

export function normalizeImportEmail(raw: string) {
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeBirthday(raw?: string | null) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  return null;
}

export function parsePhotoDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const contentType = match[1] ?? "image/png";
  const base64 = match[2] ?? "";
  if (!base64) return null;
  const extension = contentType.split("/")[1] ?? "png";
  const buffer = Buffer.from(base64, "base64");
  return { buffer, contentType, extension };
}

export async function uploadClientAvatar(clientId: string, avatarFile: File) {
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
  return publicUrlData.publicUrl;
}

export type PhonePayload = {
  number_raw: string;
  number_e164?: string | null;
  label?: string | null;
  is_primary?: boolean;
  is_whatsapp?: boolean;
};

export type EmailPayload = {
  email: string;
  label?: string | null;
  is_primary?: boolean;
};

export type AddressPayload = {
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

export type HealthItemPayload = {
  label: string;
  type: "allergy" | "condition" | "tag";
};

export type ImportAddressPayload = {
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

export type ImportContactPayload = {
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
