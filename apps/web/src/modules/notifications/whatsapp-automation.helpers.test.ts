import { describe, expect, it } from "vitest";
import {
  buildMessageTypeFromJobType,
  extractMetaStatusFailureMessage,
  formatAppointmentDateForTemplate,
  isSupportedWhatsAppJobType,
  mapButtonSelectionToAction,
  mapMetaStatusToAppointmentMessageStatus,
  normalizeMetaStatus,
  resolvePublicBaseUrlFromWebhookOrigin,
} from "./whatsapp-automation.helpers";

describe("whatsapp-automation.helpers", () => {
  it("reconhece tipos suportados de job", () => {
    expect(isSupportedWhatsAppJobType("appointment_created")).toBe(true);
    expect(isSupportedWhatsAppJobType("appointment_reminder")).toBe(true);
    expect(isSupportedWhatsAppJobType("invalid_type")).toBe(false);
  });

  it("mapeia tipo de job para tipo de mensagem", () => {
    expect(buildMessageTypeFromJobType("appointment_created")).toBe("auto_appointment_created");
    expect(buildMessageTypeFromJobType("appointment_reminder")).toBe("auto_appointment_reminder");
    expect(buildMessageTypeFromJobType("appointment_canceled")).toBe("auto_appointment_canceled");
  });

  it("normaliza status e converte para status de mensagem de agendamento", () => {
    expect(normalizeMetaStatus(" Delivered ")).toBe("delivered");
    expect(mapMetaStatusToAppointmentMessageStatus("sent")).toBe("provider_sent");
    expect(mapMetaStatusToAppointmentMessageStatus("failed")).toBe("provider_failed");
    expect(mapMetaStatusToAppointmentMessageStatus("custom")).toBe("provider_custom");
  });

  it("mapeia seleção de botão para ação interna", () => {
    expect(mapButtonSelectionToAction("Confirmar presença")).toBe("confirm");
    expect(mapButtonSelectionToAction("Reagendar")).toBe("reschedule");
    expect(mapButtonSelectionToAction("Falar com a Jana")).toBe("talk_to_jana");
    expect(mapButtonSelectionToAction("")).toBe(null);
  });

  it("resume erros de status da Meta", () => {
    const message = extractMetaStatusFailureMessage([
      { code: 131047, title: "Rate limit hit", message: "Too many requests" },
      { code: "470", message: "Message failed" },
    ]);
    expect(message).toContain("131047");
    expect(message).toContain("Too many requests");
    expect(message).toContain("470");
  });

  it("resolve base URL pública com origem do webhook quando válida", () => {
    expect(resolvePublicBaseUrlFromWebhookOrigin("https://public.corpoealmahumanizado.com.br/path")).toBe(
      "https://public.corpoealmahumanizado.com.br"
    );
  });

  it("retorna placeholders para data inválida", () => {
    expect(formatAppointmentDateForTemplate("invalid-date")).toEqual({
      dateLabel: "--",
      timeLabel: "--:--",
    });
  });
});
