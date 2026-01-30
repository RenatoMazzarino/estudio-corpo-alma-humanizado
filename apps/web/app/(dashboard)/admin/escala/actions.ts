"use server";

import { createShiftBlocks as createShiftBlocksImpl, clearMonthBlocks as clearMonthBlocksImpl } from "../../../../src/modules/appointments/actions";
import type { ActionResult } from "../../../../src/shared/errors/result";

export async function createShiftBlocks(
  type: "even" | "odd",
  monthStr: string
): Promise<ActionResult<{ count: number }>> {
  return createShiftBlocksImpl(type, monthStr);
}

export async function clearMonthBlocks(monthStr: string): Promise<ActionResult<{ month: string }>> {
  return clearMonthBlocksImpl(monthStr);
}
