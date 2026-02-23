"use server";

import { createShiftBlocks as createShiftBlocksImpl, clearMonthBlocks as clearMonthBlocksImpl } from "../../../../src/modules/appointments/actions";
import type { ActionResult } from "../../../../src/shared/errors/result";
import { requireDashboardAccessForServerAction } from "../../../../src/modules/auth/dashboard-access";

export async function createShiftBlocks(
  type: "even" | "odd",
  monthStr: string,
  force?: boolean
): Promise<ActionResult<{ count: number; requiresConfirm?: boolean; conflicts?: { blocks: number; appointments: number } }>> {

  await requireDashboardAccessForServerAction();
  return createShiftBlocksImpl(type, monthStr, force);
}

export async function clearMonthBlocks(monthStr: string): Promise<ActionResult<{ month: string }>> {

  await requireDashboardAccessForServerAction();
  return clearMonthBlocksImpl(monthStr);
}
