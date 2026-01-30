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
    isHomeVisit?: boolean;
}

export async function submitPublicAppointment(data: PublicBookingData) {
    const supabase = await createClient();

    // 1. Criar ou Buscar Cliente
    let clientId: string;

    const { data: existingClient, error: existingClientError } = await supabase
        .from("clients")
        .select("id")
        .eq("tenant_id", data.tenantId)
        .eq("name", data.clientName)
        .single();
    
    if (existingClientError && existingClientError.code !== "PGRST116") {
        throw new Error("Erro ao buscar cliente: " + existingClientError.message);
    }

    if (existingClient) {
        clientId = existingClient.id;
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
    const { data: service, error: serviceError } = await supabase
        .from("services")
        .select("*")
        .eq("id", data.serviceId)
        .single();

    if (serviceError || !service) throw new Error("Serviço não encontrado");

    // 3. Buscar Settings para buffer (opcional, ou confiar no service/hardcoded para total_duration)
    // Para simplificar, vamos calcular o preço e usar um calculation básico aqui ou buscar settings.
    // O ideal é buscar settings.
    const { data: settings, error: settingsError } = await supabase
        .from("settings")
        .select("default_home_buffer, default_studio_buffer")
        .eq("tenant_id", data.tenantId)
        .single();

    if (settingsError && settingsError.code !== "PGRST116") {
        throw new Error("Erro ao buscar configurações: " + settingsError.message);
    }

    // 3. Calcular Valores
    const isHome = data.isHomeVisit || false;
    let finalPrice = Number(service.price);
    let totalDuration = service.duration_minutes;
    
    if (isHome) {
        finalPrice += Number(service.home_visit_fee || 0);
        // Buffer Domiciliar
        const homeBuffer = settings?.default_home_buffer || 60;
        totalDuration += homeBuffer; // Duração Total (Serviço + Trânsito)
    } else {
        // Buffer Estúdio (opcional se salvamos no total_duration ou não. Normalmente total_duration no banco inclui buffer?
        // A especificação diz: "slot deve ter tamanho = serviceDuration + buffer". 
        // Vamos salvar o total_duration_minutes como o tempo ocupado REAL (com buffer).
        const studioBuffer = service.custom_buffer_minutes ?? (settings?.default_studio_buffer || 30);
        totalDuration += studioBuffer;
    }

    const startDateTime = new Date(`${data.date}T${data.time}:00`);
    // finished_at é quando o SERVIÇO acaba (sem buffer) ou com buffer? 
    // Geralmente finished_at é quando o cliente VAI EMBORA.
    // O total_duration_minutes é o BLOCO TOTAL (com trânsito).
    // Se for Home Visit: finished_at = start + service_duration. E o resto é trânsito.
    // Mas para simplificar colisão, vamos assumir finished_at = start + service_duration.
    
    const finishedAt = addMinutes(startDateTime, service.duration_minutes);

    const { error: bookingError } = await supabase
        .from("appointments")
        .insert({
            client_id: clientId,
            service_name: service.name,
            start_time: startDateTime.toISOString(),
            finished_at: finishedAt.toISOString(),
            price: finalPrice,
            status: "pending", 
            tenant_id: data.tenantId,
            is_home_visit: isHome,
            total_duration_minutes: totalDuration,
            payment_status: 'pending' // Estado inicial financeiro
        });

    if (bookingError) throw new Error("Erro ao salvar agendamento: " + bookingError.message);

    return { success: true };
}
