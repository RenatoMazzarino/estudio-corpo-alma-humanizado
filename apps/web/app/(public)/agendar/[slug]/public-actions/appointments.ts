"use server";

import { submitPublicAppointment as submitPublicAppointmentImpl } from "../../../../../src/modules/appointments/actions";
import type { ActionResult } from "../../../../../src/shared/errors/result";

interface PublicAppointmentInput {
  tenantSlug: string;
  serviceId: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientCpf?: string;
  isHomeVisit?: boolean;
  addressCep?: string;
  addressLogradouro?: string;
  addressNumero?: string;
  addressComplemento?: string;
  addressBairro?: string;
  addressCidade?: string;
  addressEstado?: string;
  displacementFee?: number;
  displacementDistanceKm?: number;
}

export async function submitPublicAppointment(
  data: PublicAppointmentInput
): Promise<ActionResult<{ appointmentId: string | null }>> {
  return submitPublicAppointmentImpl(data);
}
