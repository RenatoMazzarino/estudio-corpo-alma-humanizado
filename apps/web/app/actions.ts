"use server";

import { upsertService as upsertServiceImpl, deleteService as deleteServiceImpl } from "../src/modules/services/actions";
import {
  startAppointment as startAppointmentImpl,
  finishAppointment as finishAppointmentImpl,
  cancelAppointment as cancelAppointmentImpl,
} from "../src/modules/appointments/actions";
import { fail, ok, type ActionResult } from "../src/shared/errors/result";
import { z } from "zod";
import { getAppointmentById } from "../src/modules/appointments/repository";
import { FIXED_TENANT_ID } from "../lib/tenant-context";
import { AppError } from "../src/shared/errors/AppError";
import { mapSupabaseError } from "../src/shared/errors/mapSupabaseError";
import { requireDashboardAccessForServerAction } from "../src/modules/auth/dashboard-access";

export async function upsertService(formData: FormData) {

  await requireDashboardAccessForServerAction();
  return upsertServiceImpl(formData);
}

export async function deleteService(id: string): Promise<ActionResult<{ id: string }>> {

  await requireDashboardAccessForServerAction();
  return deleteServiceImpl(id);
}

export async function startAppointment(id: string) {

  await requireDashboardAccessForServerAction();
  return startAppointmentImpl(id);
}

export async function finishAppointment(id: string) {

  await requireDashboardAccessForServerAction();
  return finishAppointmentImpl(id);
}

export async function cancelAppointment(id: string) {

  await requireDashboardAccessForServerAction();
  return cancelAppointmentImpl(id);
}

export async function appointmentExists(
  id: string
): Promise<ActionResult<{ exists: boolean }>> {

  await requireDashboardAccessForServerAction();
  const parsed = z.object({ id: z.string().uuid() }).safeParse({ id });
  if (!parsed.success) {
    return fail(new AppError("ID inválido", "VALIDATION_ERROR", 400, parsed.error));
  }
  const { data, error } = await getAppointmentById(FIXED_TENANT_ID, parsed.data.id);
  const mappedError = mapSupabaseError(error);
  if (mappedError) {
    return fail(mappedError);
  }
  return ok({ exists: Boolean(data) });
}
