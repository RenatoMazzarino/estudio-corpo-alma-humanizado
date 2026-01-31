"use server";

import { startOfMonth, endOfMonth } from "date-fns";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { listAppointmentsInRange, listAvailabilityBlocksInRange } from "../../../src/modules/appointments/repository";

export async function getMonthOverview(monthStr: string) {
  const base = new Date(`${monthStr}-01T00:00:00`);
  const start = startOfMonth(base).toISOString();
  const end = endOfMonth(base).toISOString();

  const [{ data: blocks }, { data: appointments }] = await Promise.all([
    listAvailabilityBlocksInRange(FIXED_TENANT_ID, start, end),
    listAppointmentsInRange(FIXED_TENANT_ID, start, end),
  ]);

  return {
    blocks: blocks ?? [],
    appointments: appointments ?? [],
  };
}
