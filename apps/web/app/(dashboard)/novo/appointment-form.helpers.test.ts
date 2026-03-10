import { describe, expect, it } from "vitest";
import { buildCreatedMessage } from "./appointment-form.helpers";

describe("buildCreatedMessage", () => {
  it("espelha template de estúdio com pagamento no atendimento (sem oi flora)", () => {
    const message = buildCreatedMessage({
      clientName: "Renato",
      date: "2026-03-09",
      time: "14:30",
      serviceName: "Drenagem Linfática",
      isHomeVisit: false,
      totalAmount: 220,
      paidAmount: 0,
      paymentStatus: "pending",
      paymentLinkPublicId: "pay-abc-123",
    });

    expect(message).toContain("Olá, *Renato*! Tudo bem? ✨");
    expect(message).not.toContain("Sou a Flora, Assistente Virtual");
    expect(message).toContain("Segunda-feira, dia 09 de março");
    expect(message).toContain("PAGAR AGORA: https://public.corpoealmahumanizado.com.br/pagamento/pay-abc-123");
    expect(message).toContain("Mensagem automática. Não é necessário confirmar.");
  });

  it("espelha template de domicílio com sinal pago (sem oi flora)", () => {
    const message = buildCreatedMessage({
      clientName: "Renato",
      date: "2026-03-09",
      time: "18:00",
      serviceName: "Massagem Terapêutica",
      isHomeVisit: true,
      locationLine: "Rua Exemplo, 123, Centro, Amparo - SP",
      totalAmount: 260,
      displacementFee: 40,
      paidAmount: 80,
      paymentStatus: "partial",
      receiptPublicId: "rec-abc-123",
    });

    expect(message).toContain("Olá, *Renato*! Tudo bem? ✨");
    expect(message).toContain("no seu endereço: Rua Exemplo, 123, Centro, Amparo - SP");
    expect(message).toContain("Sinal já pago");
    expect(message).toContain("VER COMPROVANTE: https://public.corpoealmahumanizado.com.br/comprovante/pagamento/rec-abc-123");
    expect(message).toContain("Mensagem automática. Não é necessário confirmar.");
  });
});
