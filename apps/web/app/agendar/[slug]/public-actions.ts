"use server";

import { createClient } from "../../../lib/supabase/server";

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
    const startDateTime = new Date(`${data.date}T${data.time}:00`);

    const { data: appointmentId, error } = await supabase.rpc("create_public_appointment", {
        tenant_slug: data.tenantSlug,
        service_id: data.serviceId,
        start_time: startDateTime.toISOString(),
        client_name: data.clientName,
        client_phone: data.clientPhone,
        is_home_visit: data.isHomeVisit || false
    });

    if (error) {
        throw new Error("Erro ao salvar agendamento: " + error.message);
    }

    return { success: true, appointmentId };
}
