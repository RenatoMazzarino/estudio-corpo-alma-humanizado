"use server";

import { submitPublicAppointment as submitPublicAppointmentImpl } from "../../../../src/modules/appointments/actions";
import type { ActionResult } from "../../../../src/shared/errors/result";

interface PublicAppointmentInput {
  tenantSlug: string;
  serviceId: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  isHomeVisit?: boolean;
}

export async function submitPublicAppointment(
  data: PublicAppointmentInput
): Promise<ActionResult<{ appointmentId: string | null }>> {
  return submitPublicAppointmentImpl(data);
}
