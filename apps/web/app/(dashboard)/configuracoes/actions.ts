"use server";

import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { AppError } from "../../../src/shared/errors/AppError";
import { mapSupabaseError } from "../../../src/shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../src/shared/errors/result";
import { updateSettings, upsertBusinessHours, deleteInvalidBusinessHours } from "../../../src/modules/settings/repository";
import { configurePointDeviceToPdv, listPointDevices } from "../../../src/modules/payments/mercadopago-orders";

const DEFAULT_ATTENDANCE_CHECKLIST = [
  "Separar materiais e itens de higiene",
  "Confirmar endereço/portaria",
  "Rever restrições (anamnese)",
];

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
    attendance_checklist_enabled,
    attendance_checklist_items: normalizedChecklistItems,
  });

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  revalidatePath("/configuracoes");
  revalidatePath("/");

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
