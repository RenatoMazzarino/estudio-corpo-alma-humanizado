"use server";

import { createServiceClient } from "../../lib/supabase/service";
import { redirect } from "next/navigation";
import { FIXED_TENANT_ID } from "../../lib/tenant-context";
import { addMinutes } from "date-fns";
import { AppError } from "../../src/shared/errors/AppError";
import { mapSupabaseError } from "../../src/shared/errors/mapSupabaseError";
import { createInternalAppointmentSchema } from "../../src/shared/validation/appointments";

export async function createAppointment(formData: FormData): Promise<void> {
  const supabase = createServiceClient();
  
  const clientName = formData.get("clientName") as string | null;
  const serviceId = formData.get("serviceId") as string | null;
  const date = formData.get("date") as string | null; 
  const time = formData.get("time") as string | null; 

  const parsed = createInternalAppointmentSchema.safeParse({
    clientName,
    serviceId,
    date,
    time,
  });

  if (!parsed.success) {
    throw new AppError("Dados incompletos", "VALIDATION_ERROR", 400, parsed.error);
  }

  // 1. Cria ou busca cliente
  const { data: newClient, error: clientError } = await supabase
    .from("clients")
    .insert({ 
      name: parsed.data.clientName, 
      initials: parsed.data.clientName.slice(0, 2).toUpperCase(),
      tenant_id: FIXED_TENANT_ID 
    })
    .select()
    .single();

  const mappedClientError = mapSupabaseError(clientError);
  if (mappedClientError || !newClient) {
    throw mappedClientError ?? new AppError("Erro ao criar cliente", "UNKNOWN", 500);
  }

  // 2. Busca info do Serviço
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("*")
    .eq("id", parsed.data.serviceId)
    .single();

  const mappedServiceError = mapSupabaseError(serviceError);
  if (mappedServiceError || !service) {
      throw mappedServiceError ?? new AppError("Serviço não encontrado", "NOT_FOUND", 404);
  }

  // 3. Cria o agendamento
  if (newClient) {
    const startDateTime = new Date(`${parsed.data.date}T${parsed.data.time}:00`);
    const endDateTime = addMinutes(startDateTime, service.duration_minutes);

    const { error: appointmentError } = await supabase.from("appointments").insert({
      client_id: newClient.id,
      service_id: service.id,
      service_name: service.name,
      start_time: startDateTime.toISOString(),
      finished_at: endDateTime.toISOString(), // Salvando o horário previsto de término
      price: service.price, // Salvando o preço oficial do serviço
      status: "pending",
      tenant_id: FIXED_TENANT_ID
    });

    const mappedAppointmentError = mapSupabaseError(appointmentError);
    if (mappedAppointmentError) {
      throw mappedAppointmentError;
    }
  }

  // 4. Redirecionamento
  redirect(`/?date=${parsed.data.date}`);
}
