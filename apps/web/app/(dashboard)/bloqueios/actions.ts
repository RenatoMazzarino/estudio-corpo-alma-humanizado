"use server";

import { addMinutes, endOfMonth, parseISO, startOfMonth } from "date-fns";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { BRAZIL_TZ_OFFSET } from "../../../src/shared/timezone";
import { AppError } from "../../../src/shared/errors/AppError";
import { mapSupabaseError } from "../../../src/shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../src/shared/errors/result";
import { requireDashboardAccessForServerAction } from "../../../src/modules/auth/dashboard-access";
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
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  force: z.boolean().optional(),
});

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);

const isValidDate = (value: Date) => !Number.isNaN(value.getTime());

export async function getMonthOverview(monthStr: string) {

  await requireDashboardAccessForServerAction();
  const parsedMonth = monthSchema.safeParse(monthStr);
  const safeMonth = parsedMonth.success ? parsedMonth.data : new Date().toISOString().slice(0, 7);
  const base = parseISO(`${safeMonth}-01T00:00:00${BRAZIL_TZ_OFFSET}`);
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

  await requireDashboardAccessForServerAction();
  const parsed = blockSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Parâmetros inválidos para bloqueio", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { date, title, blockType, fullDay, startTime, endTime, force } = parsed.data;

  if (!fullDay && (!startTime || !endTime)) {
    return fail(new AppError("Informe horário inicial e final", "VALIDATION_ERROR", 400));
  }

  const dayStart = new Date(`${date}T00:00:00${BRAZIL_TZ_OFFSET}`);
  const dayEnd = new Date(`${date}T23:59:59${BRAZIL_TZ_OFFSET}`);

  const blockStart = fullDay
    ? dayStart
    : new Date(`${date}T${startTime}:00${BRAZIL_TZ_OFFSET}`);
  const blockEnd = fullDay ? dayEnd : new Date(`${date}T${endTime}:00${BRAZIL_TZ_OFFSET}`);

  if (!isValidDate(blockStart) || !isValidDate(blockEnd) || blockEnd <= blockStart) {
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

  const { error } = await insertAvailabilityBlocks([
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

  revalidatePath("/");

  return ok({});
}

export async function deleteAvailabilityBlock(id: string): Promise<ActionResult<{ id: string }>> {

  await requireDashboardAccessForServerAction();
  if (!id) return fail(new AppError("ID inválido", "VALIDATION_ERROR", 400));
  const { error } = await deleteAvailabilityBlockById(FIXED_TENANT_ID, id);
  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);
  revalidatePath("/");
  return ok({ id });
}
