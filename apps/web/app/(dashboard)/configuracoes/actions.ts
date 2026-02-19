"use server";

import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { AppError } from "../../../src/shared/errors/AppError";
import { mapSupabaseError } from "../../../src/shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../src/shared/errors/result";
import {
  updateSettings,
  upsertBusinessHours,
  deleteInvalidBusinessHours,
  listPixPaymentKeys,
  insertPixPaymentKey,
  setAllPixKeysInactive,
  setPixPaymentKeyActive,
  deletePixPaymentKey,
  type PixPaymentKeyType,
} from "../../../src/modules/settings/repository";
import { configurePointDeviceToPdv, listPointDevices } from "../../../src/modules/payments/mercadopago-orders";
import { disconnectSpotifyIntegration } from "../../../src/modules/integrations/spotify/server";

const DEFAULT_ATTENDANCE_CHECKLIST = [
  "Separar materiais e itens de higiene",
  "Confirmar endereço/portaria",
  "Rever restrições (anamnese)",
];

const PIX_KEY_TYPES: PixPaymentKeyType[] = ["cnpj", "cpf", "email", "phone", "evp"];

function normalizePixKeyType(type: string): PixPaymentKeyType {
  return PIX_KEY_TYPES.includes(type as PixPaymentKeyType) ? (type as PixPaymentKeyType) : "cnpj";
}

function mapPixKeysForResponse(
  keys: Array<{
    id: string;
    key_type: string;
    key_value: string;
    label: string | null;
    is_active: boolean;
  }>
) {
  return keys.map((item) => ({
    id: item.id,
    key_type: normalizePixKeyType(item.key_type),
    key_value: item.key_value,
    label: item.label,
    is_active: item.is_active,
  }));
}

function getPixTypeLabel(type: PixPaymentKeyType) {
  switch (type) {
    case "cnpj":
      return "CNPJ";
    case "cpf":
      return "CPF";
    case "email":
      return "E-mail";
    case "phone":
      return "Telefone";
    case "evp":
      return "Aleatória (EVP)";
    default:
      return "Chave";
  }
}

function normalizePixKeyValue(type: PixPaymentKeyType, rawValue: string) {
  const value = rawValue.trim();
  if (!value) {
    throw new AppError("Informe a chave Pix.", "VALIDATION_ERROR", 400);
  }

  if (type === "cnpj") {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 14) {
      throw new AppError("CNPJ inválido para chave Pix.", "VALIDATION_ERROR", 400);
    }
    return digits;
  }

  if (type === "cpf") {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 11) {
      throw new AppError("CPF inválido para chave Pix.", "VALIDATION_ERROR", 400);
    }
    return digits;
  }

  if (type === "phone") {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      throw new AppError("Telefone inválido para chave Pix.", "VALIDATION_ERROR", 400);
    }
    return `+${digits}`;
  }

  if (type === "email") {
    const normalized = value.toLowerCase();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    if (!valid) {
      throw new AppError("E-mail inválido para chave Pix.", "VALIDATION_ERROR", 400);
    }
    return normalized;
  }

  const normalized = value.toLowerCase();
  const evpRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!evpRegex.test(normalized)) {
    throw new AppError("Chave aleatória (EVP) inválida.", "VALIDATION_ERROR", 400);
  }
  return normalized;
}

async function fetchPixKeysForTenant() {
  const { data, error } = await listPixPaymentKeys(FIXED_TENANT_ID);
  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);
  return ok(data ?? []);
}

export async function saveBusinessHours(formData: FormData): Promise<ActionResult<{ ok: true }>> {
  const payload = [];

  for (let day = 0; day <= 6; day++) {
    const open = formData.get(`day_${day}_open`) as string | null;
    const close = formData.get(`day_${day}_close`) as string | null;
    const isClosed = formData.get(`day_${day}_closed`) === "on";

    if (!open || !close) {
      return fail(new AppError("Horário inválido", "VALIDATION_ERROR", 400));
    }

    payload.push({
      tenant_id: FIXED_TENANT_ID,
      day_of_week: day,
      open_time: open,
      close_time: close,
      is_closed: isClosed,
    });
  }

  const { error } = await upsertBusinessHours(payload);
  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  await deleteInvalidBusinessHours(FIXED_TENANT_ID);

  return ok({ ok: true });
}

export async function saveSettings(formData: FormData): Promise<ActionResult<{ ok: true }>> {
  const buffer_before_minutes = Number(formData.get("buffer_before_minutes"));
  const buffer_after_minutes = Number(formData.get("buffer_after_minutes"));
  const signal_percentage = Number(formData.get("signal_percentage"));
  const public_base_url = (formData.get("public_base_url") as string | null)?.trim() ?? "";
  const mp_point_enabled = formData.get("mp_point_enabled") === "on";
  const mp_point_terminal_id = (formData.get("mp_point_terminal_id") as string | null)?.trim() ?? "";
  const mp_point_terminal_name = (formData.get("mp_point_terminal_name") as string | null)?.trim() ?? "";
  const mp_point_terminal_model = (formData.get("mp_point_terminal_model") as string | null)?.trim() ?? "";
  const mp_point_terminal_external_id =
    (formData.get("mp_point_terminal_external_id") as string | null)?.trim() ?? "";
  const spotify_enabled = formData.get("spotify_enabled") === "on";
  const spotify_playlist_url = (formData.get("spotify_playlist_url") as string | null)?.trim() ?? "";
  const attendance_checklist_enabled = formData.get("attendance_checklist_enabled") === "on";
  const attendance_checklist_items_raw =
    (formData.get("attendance_checklist_items") as string | null) ?? "";
  const attendance_checklist_items = attendance_checklist_items_raw
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
  const normalizedChecklistItems =
    attendance_checklist_items.length > 0 ? attendance_checklist_items : DEFAULT_ATTENDANCE_CHECKLIST;

  if (Number.isNaN(buffer_before_minutes) || Number.isNaN(buffer_after_minutes)) {
    return fail(new AppError("Buffers inválidos", "VALIDATION_ERROR", 400));
  }

  if (Number.isNaN(signal_percentage) || signal_percentage < 0 || signal_percentage > 100) {
    return fail(new AppError("Percentual de sinal inválido", "VALIDATION_ERROR", 400));
  }

  if (public_base_url && !/^https?:\/\//i.test(public_base_url)) {
    return fail(new AppError("URL pública inválida (use http/https)", "VALIDATION_ERROR", 400));
  }

  if (spotify_playlist_url) {
    const isSpotifyUrl =
      /^https:\/\/open\.spotify\.com\/playlist\/[A-Za-z0-9]+/i.test(spotify_playlist_url) ||
      /^spotify:playlist:[A-Za-z0-9]+/i.test(spotify_playlist_url);
    if (!isSpotifyUrl) {
      return fail(
        new AppError("Playlist do Spotify inválida. Use link da playlist ou URI spotify:playlist.", "VALIDATION_ERROR", 400)
      );
    }
  }

  const legacyTotal = buffer_before_minutes + buffer_after_minutes;
  const { error } = await updateSettings(FIXED_TENANT_ID, {
    buffer_before_minutes,
    buffer_after_minutes,
    default_studio_buffer: legacyTotal,
    default_home_buffer: legacyTotal,
    signal_percentage,
    public_base_url: public_base_url || null,
    mp_point_enabled,
    mp_point_terminal_id: mp_point_terminal_id || null,
    mp_point_terminal_name: mp_point_terminal_name || null,
    mp_point_terminal_model: mp_point_terminal_model || null,
    mp_point_terminal_external_id: mp_point_terminal_external_id || null,
    spotify_enabled,
    spotify_playlist_url: spotify_playlist_url || null,
    attendance_checklist_enabled,
    attendance_checklist_items: normalizedChecklistItems,
  });

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  revalidatePath("/configuracoes");
  revalidatePath("/");

  return ok({ ok: true });
}

export async function disconnectSpotify(): Promise<ActionResult<{ ok: true }>> {
  const result = await disconnectSpotifyIntegration();
  if (!result.ok) return fail(result.error);

  revalidatePath("/configuracoes");
  revalidatePath("/atendimento");
  return ok({ ok: true });
}

export async function fetchPointDevices(): Promise<ActionResult<{
  devices: Array<{ id: string; name: string; model: string | null; external_id: string | null; status: string | null }>;
}>> {
  const result = await listPointDevices();
  if (!result.ok) return fail(result.error);
  return ok({ devices: result.data });
}

export async function configurePointTerminal(payload: {
  terminalId: string;
  externalId: string;
  terminalName?: string | null;
  terminalModel?: string | null;
}): Promise<ActionResult<{ ok: true }>> {
  const terminalId = payload.terminalId?.trim();
  const externalId = payload.externalId?.trim();
  if (!terminalId || !externalId) {
    return fail(new AppError("Terminal e identificador externo são obrigatórios.", "VALIDATION_ERROR", 400));
  }

  const configureResult = await configurePointDeviceToPdv({ terminalId, externalId });
  if (!configureResult.ok) return fail(configureResult.error);

  const { error } = await updateSettings(FIXED_TENANT_ID, {
    mp_point_enabled: true,
    mp_point_terminal_id: terminalId,
    mp_point_terminal_external_id: externalId,
    mp_point_terminal_name: payload.terminalName?.trim() || null,
    mp_point_terminal_model: payload.terminalModel?.trim() || null,
  });
  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  revalidatePath("/configuracoes");
  revalidatePath("/");
  return ok({ ok: true });
}

export async function addPixKey(payload: {
  keyType: PixPaymentKeyType;
  keyValue: string;
  label?: string | null;
  makeActive?: boolean;
}): Promise<
  ActionResult<{
    keys: Array<{
      id: string;
      key_type: PixPaymentKeyType;
      key_value: string;
      label: string | null;
      is_active: boolean;
    }>;
  }>
> {
  if (!PIX_KEY_TYPES.includes(payload.keyType)) {
    return fail(new AppError("Tipo de chave Pix inválido.", "VALIDATION_ERROR", 400));
  }

  let normalizedValue = "";
  try {
    normalizedValue = normalizePixKeyValue(payload.keyType, payload.keyValue);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    return fail(new AppError("Não foi possível validar a chave Pix.", "VALIDATION_ERROR", 400));
  }

  const currentKeysResult = await fetchPixKeysForTenant();
  if (!currentKeysResult.ok) return currentKeysResult;
  const currentKeys = currentKeysResult.data;

  const shouldActivate =
    Boolean(payload.makeActive) || currentKeys.length === 0 || !currentKeys.some((item) => item.is_active);

  if (shouldActivate) {
    const { error: clearError } = await setAllPixKeysInactive(FIXED_TENANT_ID);
    const mappedClear = mapSupabaseError(clearError);
    if (mappedClear) return fail(mappedClear);
  }

  const label = payload.label?.trim() || `${getPixTypeLabel(payload.keyType)} principal`;
  const { error: insertError } = await insertPixPaymentKey({
    tenantId: FIXED_TENANT_ID,
    keyType: payload.keyType,
    keyValue: normalizedValue,
    label,
    isActive: shouldActivate,
  });

  const mappedInsert = mapSupabaseError(insertError);
  if (mappedInsert) return fail(mappedInsert);

  const nextKeysResult = await fetchPixKeysForTenant();
  if (!nextKeysResult.ok) return nextKeysResult;

  revalidatePath("/configuracoes");
  revalidatePath("/atendimento");

  return ok({
    keys: mapPixKeysForResponse(nextKeysResult.data),
  });
}

export async function activatePixKey(payload: {
  keyId: string;
}): Promise<
  ActionResult<{
    keys: Array<{
      id: string;
      key_type: PixPaymentKeyType;
      key_value: string;
      label: string | null;
      is_active: boolean;
    }>;
  }>
> {
  const keyId = payload.keyId?.trim();
  if (!keyId) {
    return fail(new AppError("Selecione uma chave Pix válida.", "VALIDATION_ERROR", 400));
  }

  const { error: clearError } = await setAllPixKeysInactive(FIXED_TENANT_ID);
  const mappedClear = mapSupabaseError(clearError);
  if (mappedClear) return fail(mappedClear);

  const { error: activateError } = await setPixPaymentKeyActive(FIXED_TENANT_ID, keyId);
  const mappedActivate = mapSupabaseError(activateError);
  if (mappedActivate) return fail(mappedActivate);

  const nextKeysResult = await fetchPixKeysForTenant();
  if (!nextKeysResult.ok) return nextKeysResult;

  revalidatePath("/configuracoes");
  revalidatePath("/atendimento");

  return ok({
    keys: mapPixKeysForResponse(nextKeysResult.data),
  });
}

export async function removePixKey(payload: {
  keyId: string;
}): Promise<
  ActionResult<{
    keys: Array<{
      id: string;
      key_type: PixPaymentKeyType;
      key_value: string;
      label: string | null;
      is_active: boolean;
    }>;
  }>
> {
  const keyId = payload.keyId?.trim();
  if (!keyId) {
    return fail(new AppError("Chave Pix inválida para remoção.", "VALIDATION_ERROR", 400));
  }

  const { data: deletedRow, error: deleteError } = await deletePixPaymentKey(FIXED_TENANT_ID, keyId);
  const mappedDelete = mapSupabaseError(deleteError);
  if (mappedDelete) return fail(mappedDelete);

  const keysResult = await fetchPixKeysForTenant();
  if (!keysResult.ok) return keysResult;

  if (deletedRow?.is_active && keysResult.data.length > 0) {
    const firstKey = keysResult.data[0];
    if (!firstKey) {
      return fail(new AppError("Não foi possível definir a chave Pix ativa.", "UNKNOWN", 500));
    }

    const { error: clearError } = await setAllPixKeysInactive(FIXED_TENANT_ID);
    const mappedClear = mapSupabaseError(clearError);
    if (mappedClear) return fail(mappedClear);

    const { error: activateError } = await setPixPaymentKeyActive(FIXED_TENANT_ID, firstKey.id);
    const mappedActivate = mapSupabaseError(activateError);
    if (mappedActivate) return fail(mappedActivate);
  }

  const nextKeysResult = await fetchPixKeysForTenant();
  if (!nextKeysResult.ok) return nextKeysResult;

  revalidatePath("/configuracoes");
  revalidatePath("/atendimento");

  return ok({
    keys: mapPixKeysForResponse(nextKeysResult.data),
  });
}
