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

export async function startAppointmentImpl(id: string, tenantId: string): Promise<ActionResult<{ id: string }>> {
  return startAppointmentOperation(id, tenantId);
}

export async function finishAppointmentImpl(id: string, tenantId: string): Promise<ActionResult<{ id: string }>> {
  return finishAppointmentOperation(id, tenantId);
}

export async function cancelAppointmentImpl(
  id: string,
  tenantId: string,
  options?: { notifyClient?: boolean }
): Promise<ActionResult<{ id: string }>> {
  return cancelAppointmentOperation(id, tenantId, options);
}

export async function finishAdminAppointmentImpl(
  payload: FinishAppointmentParams,
  tenantId: string
): Promise<ActionResult<{ appointmentId: string }>> {
  return finishAdminAppointmentOperation(payload, tenantId);
}

export async function createShiftBlocksImpl(
  type: "even" | "odd",
  monthStr: string,
  tenantId: string,
  force?: boolean
): Promise<ActionResult<{ count: number; requiresConfirm?: boolean; conflicts?: { blocks: number; appointments: number } }>> {
  return createShiftBlocksOperation(type, monthStr, tenantId, force);
}

export async function clearMonthBlocksImpl(monthStr: string, tenantId: string): Promise<ActionResult<{ month: string }>> {
  return clearMonthBlocksOperation(monthStr, tenantId);
}
