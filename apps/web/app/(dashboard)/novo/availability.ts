"use server";

import { getAvailableSlots as getAvailableSlotsImpl } from "../../../src/modules/appointments/availability";
import { listAvailabilityBlocksInRange } from "../../../src/modules/appointments/repository";
import { startOfDay, endOfDay } from "date-fns";

interface GetSlotsParams {
  tenantId: string;
  serviceId: string;
  date: string;
  isHomeVisit?: boolean;
  ignoreBlocks?: boolean;
}

export async function getAvailableSlots(params: GetSlotsParams): Promise<string[]> {
  return getAvailableSlotsImpl(params);
}

interface GetBlockStatusParams {
  tenantId: string;
  date: string;
}

export async function getDateBlockStatus(
  params: GetBlockStatusParams
): Promise<{ hasBlocks: boolean; hasShift: boolean }> {
  const base = new Date(`${params.date}T00:00:00`);
  const start = startOfDay(base).toISOString();
  const end = endOfDay(base).toISOString();

  const { data } = await listAvailabilityBlocksInRange(params.tenantId, start, end);
  const blocks = data ?? [];
  const blockTypes = blocks
    .map((block) => block.block_type ?? block.reason)
    .filter((value): value is string => Boolean(value));
  const hasShift = blockTypes.includes("shift");
  return { hasBlocks: blocks.length > 0, hasShift };
}
