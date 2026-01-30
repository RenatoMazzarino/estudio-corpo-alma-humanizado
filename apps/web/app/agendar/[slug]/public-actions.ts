"use server";

import { createClient } from "../../../lib/supabase/server";
import { AppError } from "../../../src/shared/errors/AppError";
import { mapSupabaseError } from "../../../src/shared/errors/mapSupabaseError";
import { fail, ok } from "../../../src/shared/errors/result";
import { publicBookingSchema } from "../../../src/shared/validation/appointments";

interface PublicBookingData {
    tenantSlug: string;
    serviceId: string;
    date: string;
    time: string;
    clientName: string;
    clientPhone: string;
    isHomeVisit?: boolean;
}

export async function submitPublicAppointment(data: PublicBookingData) {
  const supabase = await createClient();
  const parsed = publicBookingSchema.safeParse(data);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos para agendamento", "VALIDATION_ERROR", 400, parsed.error));
  }

  const startDateTime = new Date(`${parsed.data.date}T${parsed.data.time}:00`);

  const { data: appointmentId, error } = await supabase.rpc("create_public_appointment", {
    tenant_slug: parsed.data.tenantSlug,
    service_id: parsed.data.serviceId,
    start_time: startDateTime.toISOString(),
    client_name: parsed.data.clientName,
    client_phone: parsed.data.clientPhone,
    is_home_visit: parsed.data.isHomeVisit || false,
  });

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  return ok({ appointmentId });
}
