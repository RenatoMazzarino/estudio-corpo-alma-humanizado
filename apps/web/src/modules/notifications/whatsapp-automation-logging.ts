import { createServiceClient } from "../../../lib/supabase/service";
import type { Json } from "../../../lib/supabase/types";

export async function logAppointmentAutomationMessage(params: {
  tenantId: string;
  appointmentId: string | null;
  type: string;
  status: string;
  payload: Json;
  sentAt?: string | null;
}) {
  if (!params.appointmentId) return;
  const supabase = createServiceClient();
  const { error } = await supabase.from("appointment_messages").insert({
    appointment_id: params.appointmentId,
    tenant_id: params.tenantId,
    type: params.type,
    status: params.status,
    payload: params.payload,
    sent_at: params.sentAt ?? null,
  });
  if (error) {
    console.error("[whatsapp-automation] Falha ao registrar log de mensagem:", error);
  }
}
