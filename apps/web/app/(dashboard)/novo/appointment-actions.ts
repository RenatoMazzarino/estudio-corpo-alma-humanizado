"use server";

import { z } from "zod";
import { createAppointment as createAppointmentImpl } from "../../../src/modules/appointments/actions";
import { listClientAddresses } from "../../../src/modules/clients/repository";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";

export async function createAppointment(formData: FormData): Promise<void> {
  return createAppointmentImpl(formData);
}

export async function getClientAddresses(clientId: string): Promise<{ data: unknown[]; error?: string | null }> {
  const parsed = z.object({ clientId: z.string().uuid() }).safeParse({ clientId });
  if (!parsed.success) {
    return { data: [], error: "Cliente inválido" };
  }

  const { data, error } = await listClientAddresses(FIXED_TENANT_ID, parsed.data.clientId);
  return { data: (data as unknown[] | null) ?? [], error: error?.message ?? null };
}
