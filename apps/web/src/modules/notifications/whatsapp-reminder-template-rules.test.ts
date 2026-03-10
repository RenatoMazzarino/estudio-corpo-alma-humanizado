import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_REMINDER_TEMPLATE_MATRIX,
  resolveReminderPaymentScenario,
  resolveReminderTemplateSelection,
} from "./whatsapp-reminder-template-rules";
import { getWhatsAppTemplateFromLibrary } from "./whatsapp-template-library";

describe("whatsapp-reminder-template-rules", () => {
  it("garante que os 4 templates de lembrete existem na biblioteca local", () => {
    const allTemplateNames = Object.values(APPOINTMENT_REMINDER_TEMPLATE_MATRIX).flatMap((locationMatrix) =>
      Object.values(locationMatrix)
    );

    const missing = allTemplateNames.filter((name) => !getWhatsAppTemplateFromLibrary(name));
    expect(missing).toEqual([]);
    expect(new Set(allTemplateNames).size).toBe(4);
  });

  it("resolve lembrete de estúdio pago integral", () => {
    const selection = resolveReminderTemplateSelection({
      isHomeVisit: false,
      totalAmount: 220,
      paidAmount: 220,
      paymentStatus: "paid",
    });

    expect(selection.templateName).toBe("lembrete_confirmacao_24h_estudio_pago_integral");
    expect(selection.location).toBe("studio");
    expect(selection.paymentScenario).toBe("paid_integral");
  });

  it("resolve lembrete domiciliar com saldo pendente", () => {
    const selection = resolveReminderTemplateSelection({
      isHomeVisit: true,
      totalAmount: 220,
      paidAmount: 80,
      paymentStatus: "partial",
    });

    expect(selection.templateName).toBe("lembrete_confirmacao_24h_domicilio_saldo_pendente");
    expect(selection.location).toBe("home");
    expect(selection.paymentScenario).toBe("saldo_pendente");
  });

  it("bloqueia envio quando template selecionado não está ativo", () => {
    expect(() =>
      resolveReminderTemplateSelection({
        isHomeVisit: false,
        totalAmount: 220,
        paidAmount: 220,
        paymentStatus: "paid",
        resolveTemplateStatus: () => "in_review",
      })
    ).toThrowError(/Nenhum template ativo disponível para lembrete 24h/);
  });

  it("classifica cenário financeiro do lembrete", () => {
    expect(
      resolveReminderPaymentScenario({
        totalAmount: 220,
        paidAmount: 220,
        paymentStatus: "paid",
      })
    ).toBe("paid_integral");

    expect(
      resolveReminderPaymentScenario({
        totalAmount: 220,
        paidAmount: 100,
        paymentStatus: "partial",
      })
    ).toBe("saldo_pendente");
  });
});

