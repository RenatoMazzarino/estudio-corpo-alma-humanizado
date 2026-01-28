"use server";

import { createClient } from "../../../lib/supabase/server";
import { addMinutes } from "date-fns";

interface PublicBookingData {
    tenantId: string;
    serviceId: string;
    date: string;
    time: string;
    clientName: string;
    clientPhone: string;
}

export async function submitPublicAppointment(data: PublicBookingData) {
    const supabase = await createClient();

    // 1. Criar ou Buscar Cliente (Publicamente, vamos simplificar e criar um novo ou usar existente com mesmo nome?)
    // Para simplificar V1: Cria um cliente novo se não achar pelo nome exato, ou usa o existente.
    
    // Check if client exists
    let clientId: string;

    const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("tenant_id", data.tenantId)
        .eq("name", data.clientName)
        .single();
    
    if (existingClient) {
        clientId = existingClient.id;
        // Opcional: Atualizar telefone se não tiver
    } else {
        const { data: newClient, error: clientError } = await supabase
            .from("clients")
            .insert({
                name: data.clientName,
                phone: data.clientPhone,
                initials: data.clientName.slice(0, 2).toUpperCase(),
                tenant_id: data.tenantId
            })
            .select("id")
            .single();
        
        if (clientError || !newClient) throw new Error("Erro ao criar cliente");
        clientId = newClient.id;
    }

    // 2. Buscar dados do serviço para calcular duração e preço
    const { data: service } = await supabase
        .from("services")
        .select("*")
        .eq("id", data.serviceId)
        .single();

    if (!service) throw new Error("Serviço não encontrado");

    // 3. Criar Agendamento
    const startDateTime = new Date(`${data.date}T${data.time}:00`);
    const endDateTime = addMinutes(startDateTime, service.duration_minutes);

    const { error: bookingError } = await supabase
        .from("appointments")
        .insert({
            client_id: clientId,
            service_name: service.name,
            start_time: startDateTime.toISOString(),
            finished_at: endDateTime.toISOString(),
            price: service.price,
            status: "pending", 
            tenant_id: data.tenantId
        });

    if (bookingError) throw new Error("Erro ao salvar agendamento");

    return { success: true };
}
