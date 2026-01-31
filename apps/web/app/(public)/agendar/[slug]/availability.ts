"use server";

import { getAvailableSlots as getAvailableSlotsImpl } from "../../../../src/modules/appointments/availability";

interface GetSlotsParams {
  tenantId: string;
  serviceId: string;
  date: string;
  isHomeVisit?: boolean;
}

export async function getAvailableSlots(params: GetSlotsParams): Promise<string[]> {
  return getAvailableSlotsImpl(params);
}
