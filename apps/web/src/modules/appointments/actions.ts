"use server";

import type { ActionResult } from "../../shared/errors/result";
import {
  cancelAppointmentImpl,
  clearMonthBlocksImpl,
  createShiftBlocksImpl,
  finishAdminAppointmentImpl,
  finishAppointmentImpl,
  startAppointmentImpl,
  type FinishAppointmentParams,
} from "./actions/lifecycle-admin";
import {
  createAppointmentImpl,
  updateInternalAppointmentImpl,
} from "./actions/internal-booking";
import {
  submitPublicAppointmentImpl,
  triggerCreatedNotificationsForAppointmentImpl,
  type SubmitPublicAppointmentInput,
} from "./actions/public-notifications";

export async function startAppointment(id: string): Promise<ActionResult<{ id: string }>> {
  return startAppointmentImpl(id);
}

export async function finishAppointment(id: string): Promise<ActionResult<{ id: string }>> {
  return finishAppointmentImpl(id);
}

export async function cancelAppointment(
  id: string,
  options?: { notifyClient?: boolean }
): Promise<ActionResult<{ id: string }>> {
  return cancelAppointmentImpl(id, options);
}

export async function createAppointment(
  formData: FormData
): Promise<void | { appointmentId: string; date: string; startTimeIso: string }> {
  return createAppointmentImpl(formData);
}

export async function triggerCreatedNotificationsForAppointment(payload: {
  appointmentId: string;
  startTimeIso: string;
  source?: string | null;
}): Promise<ActionResult<{ appointmentId: string; scheduled: boolean }>> {
  return triggerCreatedNotificationsForAppointmentImpl(payload);
}

export async function updateInternalAppointment(formData: FormData): Promise<void> {
  return updateInternalAppointmentImpl(formData);
}

export async function submitPublicAppointment(
  data: SubmitPublicAppointmentInput
): Promise<ActionResult<{ appointmentId: string | null }>> {
  return submitPublicAppointmentImpl(data);
}

export async function finishAdminAppointment(
  payload: FinishAppointmentParams
): Promise<ActionResult<{ appointmentId: string }>> {
  return finishAdminAppointmentImpl(payload);
}

export async function createShiftBlocks(
  type: "even" | "odd",
  monthStr: string,
  force?: boolean
): Promise<ActionResult<{ count: number; requiresConfirm?: boolean; conflicts?: { blocks: number; appointments: number } }>> {
  return createShiftBlocksImpl(type, monthStr, force);
}

export async function clearMonthBlocks(monthStr: string): Promise<ActionResult<{ month: string }>> {
  return clearMonthBlocksImpl(monthStr);
}

export type {
  FinishAppointmentParams,
  SubmitPublicAppointmentInput,
};
