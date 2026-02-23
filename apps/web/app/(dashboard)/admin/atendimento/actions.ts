"use server";

import { finishAdminAppointment } from "../../../../src/modules/appointments/actions";
import type { ActionResult } from "../../../../src/shared/errors/result";
import { requireDashboardAccessForServerAction } from "../../../../src/modules/auth/dashboard-access";

interface FinishAppointmentParams {
  appointmentId: string;
  paymentMethod: "pix" | "cash" | "card";
  finalAmount: number;
  notes: string;
  actualDurationMinutes?: number | null;
}

export async function finishAppointment(
  payload: FinishAppointmentParams
): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
  return finishAdminAppointment(payload);
}
