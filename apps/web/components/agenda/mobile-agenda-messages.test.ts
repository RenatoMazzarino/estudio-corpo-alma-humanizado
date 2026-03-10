import { describe, expect, it } from "vitest";
import { buildAgendaMessage } from "./mobile-agenda-messages";
import type { AttendanceOverview } from "../../lib/attendance/attendance-types";

const baseAppointment = {
  id: "appt-1",
  service_name: "Drenagem Linfática",
  start_time: "2026-03-11T21:30:00.000Z",
  finished_at: null,
  status: "confirmed",
  payment_status: "partial",
  is_home_visit: false,
  price: 220,
  clients: {
    id: "client-1",
    name: "Renata",
    initials: "RE",
    phone: "11999999999",
    endereco_completo: "Rua Exemplo, 123, Centro, Amparo - SP",
  },
} satisfies AttendanceOverview["appointment"];

describe("mobile-agenda-messages", () => {
  it("renderiza lembrete 24h de estúdio pago integral com opções rápidas", () => {
    const message = buildAgendaMessage("reminder_24h", baseAppointment, "https://public.corpoealmahumanizado.com.br", {
      checkoutTotal: 220,
      paidAmount: 220,
    });

    expect(message).toContain("Seu atendimento já está totalmente pago");
    expect(message).toContain("Opções de resposta: CONFIRMAR | REAGENDAR | FALAR COM A JANA");
  });

  it("renderiza lembrete 24h de domicílio com saldo pendente", () => {
    const message = buildAgendaMessage(
      "reminder_24h",
      { ...baseAppointment, is_home_visit: true },
      "https://public.corpoealmahumanizado.com.br",
      {
        checkoutTotal: 260,
        paidAmount: 40,
      }
    );

    expect(message).toContain("no seu endereço");
    expect(message).toContain("Total a pagar no dia");
    expect(message).toContain("R$ 220,00");
  });
});
