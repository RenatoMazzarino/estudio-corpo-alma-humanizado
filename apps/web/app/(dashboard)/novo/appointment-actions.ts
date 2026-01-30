"use server";

import { createAppointment as createAppointmentImpl } from "../../../src/modules/appointments/actions";

export async function createAppointment(formData: FormData): Promise<void> {
  return createAppointmentImpl(formData);
}
