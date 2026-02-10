"use server";

import { addMinutes, endOfDay, endOfMonth, format, parseISO, startOfDay, startOfMonth } from "date-fns";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { BRAZIL_TZ_OFFSET } from "../../../src/shared/timezone";
import { AppError } from "../../../src/shared/errors/AppError";
import { mapSupabaseError } from "../../../src/shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../src/shared/errors/result";
import {
  deleteAvailabilityBlockById,
  insertAvailabilityBlocks,
  listAppointmentsInRange,
  listAvailabilityBlocksInRange,
} from "../../../src/modules/appointments/repository";

const blockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(2),
  blockType: z.enum(["shift", "personal", "vacation", "administrative"]),
  fullDay: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  force: z.boolean().optional(),
});

export async function getMonthOverview(monthStr: string) {
  const base = new Date(`${monthStr}-01T00:00:00`);
  const start = startOfMonth(base).toISOString();
  const end = endOfMonth(base).toISOString();

  const [{ data: blocks }, { data: appointments }] = await Promise.all([
    listAvailabilityBlocksInRange(FIXED_TENANT_ID, start, end),
    listAppointmentsInRange(FIXED_TENANT_ID, start, end),
  ]);

  return {
    blocks: blocks ?? [],
    appointments: appointments ?? [],
  };
}

export async function createAvailabilityBlock(
  payload: z.infer<typeof blockSchema>
): Promise<ActionResult<{ id?: string; requiresConfirm?: boolean; conflicts?: { appointments: number } }>> {
  const parsed = blockSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Parâmetros inválidos para bloqueio", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { date, title, blockType, fullDay, startTime, endTime, force } = parsed.data;

  if (!fullDay && (!startTime || !endTime)) {
    return fail(new AppError("Informe horário inicial e final", "VALIDATION_ERROR", 400));
  }

  const dayStart = startOfDay(parseISO(`${date}T00:00:00${BRAZIL_TZ_OFFSET}`));
  const dayEnd = endOfDay(dayStart);

  const blockStart = fullDay
    ? dayStart
    : new Date(`${date}T${startTime}:00${BRAZIL_TZ_OFFSET}`);
  const blockEnd = fullDay ? dayEnd : new Date(`${date}T${endTime}:00${BRAZIL_TZ_OFFSET}`);

  if (!blockStart || !blockEnd || blockEnd <= blockStart) {
    return fail(new AppError("Horário inválido para bloqueio", "VALIDATION_ERROR", 400));
  }

  const [{ data: blocks }, { data: appointments }] = await Promise.all([
    listAvailabilityBlocksInRange(FIXED_TENANT_ID, dayStart.toISOString(), dayEnd.toISOString()),
    listAppointmentsInRange(FIXED_TENANT_ID, dayStart.toISOString(), dayEnd.toISOString()),
  ]);

  const overlappingBlock = (blocks ?? []).some((block) => {
    const existingStart = parseISO(block.start_time);
    const existingEnd = parseISO(block.end_time);
    return existingStart < blockEnd && existingEnd > blockStart;
  });

  if (overlappingBlock) {
    return fail(new AppError("Já existe um bloqueio sobreposto neste horário.", "CONFLICT", 409));
  }

  const conflicts = (appointments ?? [])
    .filter((appt) => !["canceled_by_client", "canceled_by_studio", "no_show"].includes(appt.status ?? ""))
    .filter((appt) => {
      const apptStart = parseISO(appt.start_time);
      const duration =
        appt.total_duration_minutes ??
        (Array.isArray(appt.services) ? appt.services[0]?.duration_minutes : appt.services?.duration_minutes) ??
        30;
      const apptEnd = addMinutes(apptStart, duration);
      return apptStart < blockEnd && apptEnd > blockStart;
    });

  if (conflicts.length > 0 && !force) {
    return ok({ requiresConfirm: true, conflicts: { appointments: conflicts.length } });
  }

  const { data: inserted, error } = await insertAvailabilityBlocks([
    {
      tenant_id: FIXED_TENANT_ID,
      title,
      start_time: blockStart.toISOString(),
      end_time: blockEnd.toISOString(),
      reason: blockType,
      block_type: blockType,
      is_full_day: fullDay,
    },
  ]);

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath("/bloqueios");
  revalidatePath("/");

  return ok({ id: inserted?.[0]?.id });
}

export async function deleteAvailabilityBlock(id: string): Promise<ActionResult<{ id: string }>> {
  if (!id) return fail(new AppError("ID inválido", "VALIDATION_ERROR", 400));
  const { error } = await deleteAvailabilityBlockById(FIXED_TENANT_ID, id);
  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);
  revalidatePath("/bloqueios");
  revalidatePath("/");
  return ok({ id });
}

export const formatBlockTimeLabel = (block: { start_time: string; end_time: string; is_full_day?: boolean | null }) => {
  if (block.is_full_day) {
    return "Dia todo";
  }
  const startLabel = format(parseISO(block.start_time), "HH:mm");
  const endLabel = format(parseISO(block.end_time), "HH:mm");
  return `${startLabel} - ${endLabel}`;
};
