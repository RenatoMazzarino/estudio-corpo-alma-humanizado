type OutboxEventInput = {
  eventType: string;
  payload?: Record<string, unknown> | null;
};

export type PushMessage = {
  heading: string;
  message: string;
  url: string;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export function buildPushMessageForEvent(event: OutboxEventInput): PushMessage | null {
  const payload = asRecord(event.payload);
  const appointmentId = typeof payload.appointment_id === "string" ? payload.appointment_id : null;

  switch (event.eventType) {
    case "appointment.created":
      return {
        heading: "Novo agendamento",
        message: "Um novo agendamento foi criado no estúdio.",
        url: appointmentId ? `/atendimento/${appointmentId}` : "/",
      };
    case "appointment.updated":
      return {
        heading: "Agendamento atualizado",
        message: "Um agendamento foi alterado e precisa de atenção.",
        url: appointmentId ? `/atendimento/${appointmentId}` : "/",
      };
    case "appointment.canceled":
      return {
        heading: "Agendamento cancelado",
        message: "Um atendimento foi cancelado.",
        url: "/mensagens?tab=fila",
      };
    case "payment.created":
      return {
        heading: "Novo pagamento registrado",
        message: "Um novo pagamento foi registrado no sistema.",
        url: "/caixa",
      };
    case "payment.status_changed":
      return {
        heading: "Atualização de pagamento",
        message: "Houve alteração no status de pagamento.",
        url: "/caixa",
      };
    case "whatsapp.job.status_changed": {
      const toStatus = typeof payload.to_status === "string" ? payload.to_status : "";
      if (toStatus === "failed") {
        return {
          heading: "Falha na automação WhatsApp",
          message: "Uma mensagem automática falhou e precisa de revisão.",
          url: "/mensagens?tab=fila",
        };
      }
      return null;
    }
    default:
      return null;
  }
}

