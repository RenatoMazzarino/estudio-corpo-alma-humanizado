import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppointmentMessage } from "../../lib/attendance/attendance-types";
import {
  formatSentLabel,
  formatStatusMoment,
  getAutomationStatusLabel,
  getInitials,
  getStatusInfo,
  isMessageSent,
  messageByRawType,
  messageByType,
  paymentStatusMap,
} from "./appointment-details-sheet.helpers";

const baseMessage: AppointmentMessage = {
  id: "msg-1",
  appointment_id: "apt-1",
  type: "created_confirmation",
  status: "drafted",
  payload: null,
  sent_at: null,
  created_at: "2026-03-01T12:00:00.000Z",
};

afterEach(() => {
  vi.useRealTimers();
});

describe("appointment-details-sheet.helpers", () => {
  it("localiza mensagem por tipo e tipo raw", () => {
    const messages: AppointmentMessage[] = [
      baseMessage,
      {
        ...baseMessage,
        id: "msg-2",
        type: "reminder_24h",
      },
      {
        ...baseMessage,
        id: "msg-3",
        type: "created_confirmation" as AppointmentMessage["type"],
        status: "sent_auto",
      },
    ];

    expect(messageByType(messages, "reminder_24h")?.id).toBe("msg-2");
    expect(messageByType(messages, "payment_receipt")).toBeNull();

    const rawMessages = [
      ...messages,
      {
        ...baseMessage,
        id: "msg-4",
        type: "auto_appointment_created" as unknown as AppointmentMessage["type"],
      },
    ];
    expect(messageByRawType(rawMessages, "auto_appointment_created")?.id).toBe("msg-4");
  });

  it("reconhece status enviados", () => {
    expect(isMessageSent("sent_manual")).toBe(true);
    expect(isMessageSent("sent_auto")).toBe(true);
    expect(isMessageSent("delivered")).toBe(true);
    expect(isMessageSent("failed")).toBe(false);
    expect(isMessageSent(null)).toBe(false);
  });

  it("formata labels de envio e momento de status", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T15:30:00.000Z"));

    expect(formatSentLabel(null)).toBe("Pendente de envio");
    expect(formatSentLabel("2026-03-10T12:00:00.000Z")).toContain("Enviada hoje às");
    expect(formatSentLabel("2026-03-09T12:00:00.000Z")).toContain("Enviada ontem às");

    expect(formatStatusMoment("invalid-date")).toBeNull();
    expect(formatStatusMoment("2026-03-10T12:00:00.000Z")).toContain("hoje às");
  });

  it("gera label de status da automação", () => {
    expect(getAutomationStatusLabel(null)).toBe("Automação: pendente / sem envio");

    const queued = {
      ...baseMessage,
      status: "queued_auto" as unknown as AppointmentMessage["status"],
    };
    expect(getAutomationStatusLabel(queued)).toBe("Automação: em fila");

    const delivered = {
      ...baseMessage,
      status: "provider_delivered" as unknown as AppointmentMessage["status"],
      sent_at: "2026-03-09T12:00:00.000Z",
    };
    expect(getAutomationStatusLabel(delivered)).toContain("Automação: entregue");

    const unknown = {
      ...baseMessage,
      status: "custom_status" as unknown as AppointmentMessage["status"],
    };
    expect(getAutomationStatusLabel(unknown)).toBe("Automação: custom_status");
  });

  it("resolve iniciais, status do agendamento e mapa de status financeiro", () => {
    expect(getInitials("Renato Mazzarino")).toBe("RM");
    expect(getInitials("Renato")).toBe("RE");
    expect(getInitials("   ")).toBe("");

    expect(getStatusInfo("completed").label).toBe("Concluído");
    expect(getStatusInfo("unknown").label).toBe("Agendado");

    expect(paymentStatusMap.paid.label).toBe("PAGO");
    expect(paymentStatusMap.waived.label).toBe("LIBERADO");
  });
});
