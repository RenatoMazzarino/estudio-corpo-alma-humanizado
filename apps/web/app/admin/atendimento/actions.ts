"use server";

import { finishAdminAppointment } from "../../../src/modules/appointments/actions";
import type { ActionResult } from "../../../src/shared/errors/result";

interface FinishAppointmentParams {
  appointmentId: string;
  paymentMethod: "pix" | "cash" | "card";
  finalAmount: number;
  notes: string;
}

export async function finishAppointment(
  payload: FinishAppointmentParams
): Promise<ActionResult<{ appointmentId: string }>> {
  return finishAdminAppointment(payload);
}
