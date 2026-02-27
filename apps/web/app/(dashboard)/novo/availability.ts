"use server";

import { eachDayOfInterval, endOfMonth, format, isBefore, parseISO, startOfDay, startOfMonth } from "date-fns";
import { getAvailableSlots as getAvailableSlotsImpl } from "../../../src/modules/appointments/availability";
import { listAvailabilityBlocksInRange } from "../../../src/modules/appointments/repository";
import { requireDashboardAccessForServerAction } from "../../../src/modules/auth/dashboard-access";
import { BRAZIL_TZ_OFFSET } from "../../../src/shared/timezone";

interface GetSlotsParams {
  tenantId: string;
  serviceId: string;
  date: string;
  isHomeVisit?: boolean;
  ignoreBlocks?: boolean;
}

export async function getAvailableSlots(params: GetSlotsParams): Promise<string[]> {

  await requireDashboardAccessForServerAction();
  return getAvailableSlotsImpl(params);
}

interface GetMonthAvailabilityParams {
  tenantId: string;
  serviceId: string;
  month: string; // YYYY-MM
  isHomeVisit?: boolean;
  ignoreBlocks?: boolean;
}

export async function getMonthAvailableDays(params: GetMonthAvailabilityParams): Promise<Record<string, boolean>> {
  await requireDashboardAccessForServerAction();

  const base = parseISO(`${params.month}-01T00:00:00${BRAZIL_TZ_OFFSET}`);
  const start = startOfMonth(base);
  const end = endOfMonth(base);
  const today = startOfDay(new Date());
  const days = eachDayOfInterval({ start, end });

  const results = await Promise.all(
    days.map(async (day) => {
      const iso = format(day, "yyyy-MM-dd");
      if (isBefore(day, today)) return { date: iso, available: false };
      try {
        const slots = await getAvailableSlotsImpl({
          tenantId: params.tenantId,
          serviceId: params.serviceId,
          date: iso,
          isHomeVisit: params.isHomeVisit,
          ignoreBlocks: params.ignoreBlocks,
        });
        return { date: iso, available: slots.length > 0 };
      } catch {
        return { date: iso, available: false };
      }
    })
  );

  return results.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.date] = item.available;
    return acc;
  }, {});
}

interface GetBlockStatusParams {
  tenantId: string;
  date: string;
}

export async function getDateBlockStatus(
  params: GetBlockStatusParams
): Promise<{ hasBlocks: boolean; hasShift: boolean }> {

  await requireDashboardAccessForServerAction();
  const start = new Date(`${params.date}T00:00:00${BRAZIL_TZ_OFFSET}`).toISOString();
  const end = new Date(`${params.date}T23:59:59.999${BRAZIL_TZ_OFFSET}`).toISOString();

  const { data } = await listAvailabilityBlocksInRange(params.tenantId, start, end);
  const blocks = data ?? [];
  const blockTypes = blocks
    .map((block) => block.block_type ?? block.reason)
    .filter((value): value is string => Boolean(value));
  const hasShift = blockTypes.includes("shift");
  return { hasBlocks: blocks.length > 0, hasShift };
}
