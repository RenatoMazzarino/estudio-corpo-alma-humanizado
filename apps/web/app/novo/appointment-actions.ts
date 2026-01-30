"use server";

import { createClient } from "../../lib/supabase/server";
import { redirect } from "next/navigation";
import { FIXED_TENANT_ID } from "../../lib/tenant-context";
import { addMinutes } from "date-fns";

export async function createAppointment(formData: FormData) {
  const supabase = await createClient();
  
  const clientName = formData.get("clientName") as string;
  const serviceId = formData.get("serviceId") as string;
  const date = formData.get("date") as string; 
  const time = formData.get("time") as string; 

  if (!clientName || !serviceId || !date || !time) {
    throw new Error("Dados incompletos");
  }

  // 1. Cria ou busca cliente
  const { data: newClient } = await supabase
    .from("clients")
    .insert({ 
      name: clientName, 
      initials: clientName.slice(0, 2).toUpperCase(),
      tenant_id: FIXED_TENANT_ID 
    })
    .select()
    .single();

  // 2. Busca info do Serviço
  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (!service) {
      throw new Error("Serviço não encontrado");
  }

  // 3. Cria o agendamento
  if (newClient) {
    const startDateTime = new Date(`${date}T${time}:00`);
    const endDateTime = addMinutes(startDateTime, service.duration_minutes);

    await supabase.from("appointments").insert({
      client_id: newClient.id,
      service_name: service.name,
      start_time: startDateTime.toISOString(),
      finished_at: endDateTime.toISOString(), // Salvando o horário previsto de término
      price: service.price, // Salvando o preço oficial do serviço
      status: "pending",
      tenant_id: FIXED_TENANT_ID
    });
  }

  // 4. Redirecionamento
  redirect(`/?date=${date}`);
}
