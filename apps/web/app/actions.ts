"use server";

import { upsertService as upsertServiceImpl, deleteService as deleteServiceImpl } from "../src/modules/services/actions";
import {
  startAppointment as startAppointmentImpl,
  finishAppointment as finishAppointmentImpl,
  cancelAppointment as cancelAppointmentImpl,
} from "../src/modules/appointments/actions";
import type { ActionResult } from "../src/shared/errors/result";
import { z } from "zod";
import { getAppointmentById } from "../src/modules/appointments/repository";
import { FIXED_TENANT_ID } from "../lib/tenant-context";

export async function upsertService(formData: FormData) {
  return upsertServiceImpl(formData);
}

export async function deleteService(id: string): Promise<ActionResult<{ id: string }>> {
  return deleteServiceImpl(id);
}

export async function startAppointment(id: string) {
  return startAppointmentImpl(id);
}

export async function finishAppointment(id: string) {
  return finishAppointmentImpl(id);
}

export async function cancelAppointment(id: string) {
  return cancelAppointmentImpl(id);
}

export async function appointmentExists(id: string): Promise<boolean> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse({ id });
  if (!parsed.success) return false;
  const { data } = await getAppointmentById(FIXED_TENANT_ID, parsed.data.id);
  return Boolean(data);
}
