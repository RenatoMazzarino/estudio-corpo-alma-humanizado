"use server";

import type { ActionResult } from "../../../shared/errors/result";
import {
  cancelAppointmentOperation,
  finishAppointmentOperation,
  startAppointmentOperation,
} from "../lifecycle-operations";
import {
  clearMonthBlocksOperation,
  createShiftBlocksOperation,
  finishAdminAppointmentOperation,
  type FinishAppointmentParams,
} from "../admin-operations";

export async function startAppointmentImpl(id: string): Promise<ActionResult<{ id: string }>> {
  return startAppointmentOperation(id);
}

export async function finishAppointmentImpl(id: string): Promise<ActionResult<{ id: string }>> {
  return finishAppointmentOperation(id);
}

export async function cancelAppointmentImpl(
  id: string,
  options?: { notifyClient?: boolean }
): Promise<ActionResult<{ id: string }>> {
  return cancelAppointmentOperation(id, options);
}

export async function finishAdminAppointmentImpl(
  payload: FinishAppointmentParams
): Promise<ActionResult<{ appointmentId: string }>> {
  return finishAdminAppointmentOperation(payload);
}

export async function createShiftBlocksImpl(
  type: "even" | "odd",
  monthStr: string,
  force?: boolean
): Promise<ActionResult<{ count: number; requiresConfirm?: boolean; conflicts?: { blocks: number; appointments: number } }>> {
  return createShiftBlocksOperation(type, monthStr, force);
}

export async function clearMonthBlocksImpl(monthStr: string): Promise<ActionResult<{ month: string }>> {
  return clearMonthBlocksOperation(monthStr);
}

export type { FinishAppointmentParams };
