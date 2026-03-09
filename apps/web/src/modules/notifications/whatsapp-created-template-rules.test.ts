import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_NOTICE_TEMPLATE_MATRIX,
  DEFAULT_FLORA_REINTRO_AFTER_DAYS,
  resolveCreatedAppointmentTemplateSelection,
  resolveFloraIntroVariantByHistory,
  resolveNoticeIntroVariantFromPayload,
  resolveNoticePaymentScenario,
  resolvePreferredNoticeIntroVariant,
} from "./whatsapp-created-template-rules";
import { getWhatsAppTemplateFromLibrary } from "./whatsapp-template-library";

describe("whatsapp-created-template-rules", () => {
  it("garante que todos os templates do matrix existem na biblioteca local", () => {
    const allTemplateNames = Object.values(APPOINTMENT_NOTICE_TEMPLATE_MATRIX).flatMap((locationMatrix) =>
      Object.values(locationMatrix).flatMap((paymentMatrix) => Object.values(paymentMatrix))
    );

    const missing = allTemplateNames.filter((name) => !getWhatsAppTemplateFromLibrary(name));
    expect(missing).toEqual([]);
    expect(new Set(allTemplateNames).size).toBe(12);
  });

  it("resolve cenário de estúdio com sinal e mantém variante com_flora quando ativa", () => {
    const selection = resolveCreatedAppointmentTemplateSelection({
      isHomeVisit: false,
      totalAmount: 220,
      paidAmount: 80,
      paymentStatus: "partial",
      preferredIntroVariant: "com_flora",
    });

    expect(selection.templateName).toBe("aviso_agendamento_no_estudio_com_sinal_pago_com_flora");
    expect(selection.fallbackApplied).toBe(false);
  });

  it("faz fallback automático para sem_oi_flora quando com_flora está em análise", () => {
    const selection = resolveCreatedAppointmentTemplateSelection({
      isHomeVisit: true,
      totalAmount: 220,
      paidAmount: 80,
      paymentStatus: "partial",
      preferredIntroVariant: "com_flora",
    });

    expect(selection.templateName).toBe("aviso_agendamento_domicilio_sinal_pago_sem_oi_flora");
    expect(selection.fallbackApplied).toBe(true);
    expect(selection.requestedIntroVariant).toBe("com_flora");
    expect(selection.selectedIntroVariant).toBe("sem_oi_flora");
  });

  it("bloqueia envio quando nenhum template ativo existe para o cenário", () => {
    expect(() =>
      resolveCreatedAppointmentTemplateSelection({
        isHomeVisit: true,
        totalAmount: 220,
        paidAmount: 0,
        paymentStatus: "pending",
        preferredIntroVariant: "sem_oi_flora",
      })
    ).toThrowError(/Nenhum template ativo disponível/);
  });

  it("resolve preferência de variante via payload e fallback para sem_oi_flora por padrão", () => {
    expect(resolveNoticeIntroVariantFromPayload({ automation: { template_intro_variant: "com_flora" } })).toBe(
      "com_flora"
    );
    expect(resolveNoticeIntroVariantFromPayload({ automation: { template_variant: "sem_oi_flora" } })).toBe(
      "sem_oi_flora"
    );
    expect(resolveNoticeIntroVariantFromPayload({})).toBeNull();

    expect(
      resolvePreferredNoticeIntroVariant({
        jobPayload: { automation: { template_intro_variant: "com_flora" } },
        tenantCreatedTemplateName: "aviso_agendamento_no_estudio_com_sinal_pago_sem_oi_flora",
      })
    ).toBe("com_flora");

    expect(
      resolvePreferredNoticeIntroVariant({
        jobPayload: {},
        tenantCreatedTemplateName: "aviso_agendamento_no_estudio_pago_integral_com_flora",
      })
    ).toBe("com_flora");

    expect(
      resolvePreferredNoticeIntroVariant({
        jobPayload: {},
        tenantCreatedTemplateName: null,
      })
    ).toBe("sem_oi_flora");
  });

  it("aplica regra de apresentação da Flora por histórico com janela de 180 dias", () => {
    expect(
      resolveFloraIntroVariantByHistory({
        hasPresentedFloraBefore: false,
        lastSuccessfulAutomationSentAt: null,
      })
    ).toBe("com_flora");

    expect(
      resolveFloraIntroVariantByHistory({
        hasPresentedFloraBefore: true,
        lastSuccessfulAutomationSentAt: "2026-03-01T00:00:00.000Z",
        now: new Date("2026-03-20T00:00:00.000Z"),
      })
    ).toBe("sem_oi_flora");

    expect(
      resolveFloraIntroVariantByHistory({
        hasPresentedFloraBefore: true,
        lastSuccessfulAutomationSentAt: "2025-08-01T00:00:00.000Z",
        now: new Date("2026-03-01T00:00:00.000Z"),
      })
    ).toBe("com_flora");

    expect(DEFAULT_FLORA_REINTRO_AFTER_DAYS).toBe(180);
  });

  it("classifica corretamente o cenário de pagamento", () => {
    expect(
      resolveNoticePaymentScenario({
        totalAmount: 220,
        paidAmount: 220,
        paymentStatus: "paid",
      })
    ).toBe("paid_integral");

    expect(
      resolveNoticePaymentScenario({
        totalAmount: 220,
        paidAmount: 80,
        paymentStatus: "partial",
      })
    ).toBe("signal_paid");

    expect(
      resolveNoticePaymentScenario({
        totalAmount: 220,
        paidAmount: 0,
        paymentStatus: "pending",
      })
    ).toBe("pay_at_attendance");
  });
});
