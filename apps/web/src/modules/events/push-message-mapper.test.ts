import { describe, expect, it } from "vitest";
import { buildPushMessageForEvent } from "./push-message-mapper";

describe("buildPushMessageForEvent", () => {
  it("monta notificação para appointment.updated", () => {
    const message = buildPushMessageForEvent({
      eventType: "appointment.updated",
      payload: { appointment_id: "appt-123" },
    });
    expect(message).toEqual({
      heading: "Agendamento atualizado",
      message: "Um agendamento foi alterado e precisa de atenção.",
      url: "/atendimento/appt-123",
    });
  });

  it("retorna null para status não crítico de whatsapp.job.status_changed", () => {
    const message = buildPushMessageForEvent({
      eventType: "whatsapp.job.status_changed",
      payload: { to_status: "sent" },
    });
    expect(message).toBeNull();
  });

  it("monta notificação de falha para status crítico de whatsapp.job.status_changed", () => {
    const message = buildPushMessageForEvent({
      eventType: "whatsapp.job.status_changed",
      payload: { to_status: "failed" },
    });
    expect(message).toEqual({
      heading: "Falha na automação WhatsApp",
      message: "Uma mensagem automática falhou e precisa de revisão.",
      url: "/mensagens?tab=fila",
    });
  });
});

