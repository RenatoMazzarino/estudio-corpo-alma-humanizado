"use server";

import { createAppointmentImpl as createAppointmentImplOperation } from "./create-internal-booking";
import { updateInternalAppointmentForTenant as updateInternalAppointmentForTenantOperation } from "./update-internal-booking";

export async function createAppointmentImpl(
  formData: FormData,
  tenantId: string
): Promise<void | { appointmentId: string; date: string; startTimeIso: string }> {
  return createAppointmentImplOperation(formData, tenantId);
}

export async function updateInternalAppointmentImpl(formData: FormData, tenantId: string): Promise<void> {
  return updateInternalAppointmentForTenantOperation(formData, tenantId);
}
