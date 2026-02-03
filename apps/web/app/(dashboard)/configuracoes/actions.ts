"use server";

import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { AppError } from "../../../src/shared/errors/AppError";
import { mapSupabaseError } from "../../../src/shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../src/shared/errors/result";
import { updateSettings, upsertBusinessHours, deleteInvalidBusinessHours } from "../../../src/modules/settings/repository";

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

  if (Number.isNaN(buffer_before_minutes) || Number.isNaN(buffer_after_minutes)) {
    return fail(new AppError("Buffers inválidos", "VALIDATION_ERROR", 400));
  }

  const legacyTotal = buffer_before_minutes + buffer_after_minutes;
  const { error } = await updateSettings(FIXED_TENANT_ID, {
    buffer_before_minutes,
    buffer_after_minutes,
    default_studio_buffer: legacyTotal,
    default_home_buffer: legacyTotal,
  });

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  return ok({ ok: true });
}
