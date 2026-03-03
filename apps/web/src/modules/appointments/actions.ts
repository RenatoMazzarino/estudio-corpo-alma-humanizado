"use server";

import type { ActionResult } from "../../shared/errors/result";
import {
  cancelAppointmentImpl,
  clearMonthBlocksImpl,
  createShiftBlocksImpl,
  finishAdminAppointmentImpl,
  finishAppointmentImpl,
  startAppointmentImpl,
} from "./actions/lifecycle-admin";
import {
  createAppointmentImpl,
  updateInternalAppointmentImpl,
} from "./actions/internal-booking";
import {
  submitPublicAppointmentImpl,
  triggerCreatedNotificationsForAppointmentImpl,
} from "./actions/public-notifications";
import type { FinishAppointmentParams } from "./admin-operations";
import type { SubmitPublicAppointmentInput } from "./public-booking";

export async function startAppointment(id: string, tenantId: string): Promise<ActionResult<{ id: string }>> {
  return startAppointmentImpl(id, tenantId);
}

export async function finishAppointment(id: string, tenantId: string): Promise<ActionResult<{ id: string }>> {
  return finishAppointmentImpl(id, tenantId);
}

export async function cancelAppointment(
  id: string,
  tenantId: string,
  options?: { notifyClient?: boolean }
): Promise<ActionResult<{ id: string }>> {
  return cancelAppointmentImpl(id, tenantId, options);
}

export async function createAppointment(
  formData: FormData,
  tenantId: string
): Promise<void | { appointmentId: string; date: string; startTimeIso: string }> {
  return createAppointmentImpl(formData, tenantId);
}

export async function triggerCreatedNotificationsForAppointment(payload: {
  appointmentId: string;
  startTimeIso: string;
  source?: string | null;
}, tenantId: string): Promise<ActionResult<{ appointmentId: string; scheduled: boolean }>> {
  return triggerCreatedNotificationsForAppointmentImpl(payload, tenantId);
}

export async function updateInternalAppointment(formData: FormData, tenantId: string): Promise<void> {
  return updateInternalAppointmentImpl(formData, tenantId);
}

export async function submitPublicAppointment(
  data: SubmitPublicAppointmentInput
): Promise<ActionResult<{ appointmentId: string | null }>> {
  return submitPublicAppointmentImpl(data);
}

export async function finishAdminAppointment(
  payload: FinishAppointmentParams,
  tenantId: string
): Promise<ActionResult<{ appointmentId: string }>> {
  return finishAdminAppointmentImpl(payload, tenantId);
}

export async function createShiftBlocks(
  type: "even" | "odd",
  monthStr: string,
  tenantId: string,
  force?: boolean
): Promise<ActionResult<{ count: number; requiresConfirm?: boolean; conflicts?: { blocks: number; appointments: number } }>> {
  return createShiftBlocksImpl(type, monthStr, tenantId, force);
}

export async function clearMonthBlocks(monthStr: string, tenantId: string): Promise<ActionResult<{ month: string }>> {
  return clearMonthBlocksImpl(monthStr, tenantId);
}
