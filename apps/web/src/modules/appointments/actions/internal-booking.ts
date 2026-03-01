"use server";

import { createAppointmentImpl as createAppointmentImplOperation } from "./create-internal-booking";
import { updateInternalAppointmentImpl as updateInternalAppointmentImplOperation } from "./update-internal-booking";

export async function createAppointmentImpl(
  formData: FormData
): Promise<void | { appointmentId: string; date: string; startTimeIso: string }> {
  return createAppointmentImplOperation(formData);
}

export async function updateInternalAppointmentImpl(formData: FormData): Promise<void> {
  return updateInternalAppointmentImplOperation(formData);
}
