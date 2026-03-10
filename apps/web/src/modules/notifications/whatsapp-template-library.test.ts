import { describe, expect, it } from "vitest";
import {
  getWhatsAppTemplateFromLibrary,
  WHATSAPP_TEMPLATE_LIBRARY,
} from "./whatsapp-template-library";
import { META_TEMPLATE_PUBLIC_SAMPLE_CODE } from "../../shared/meta-template-demo";

describe("whatsapp-template-library", () => {
  it("mantém os 16 templates oficiais de aviso/agendamento + lembrete 24h", () => {
    expect(WHATSAPP_TEMPLATE_LIBRARY).toHaveLength(16);
    expect(WHATSAPP_TEMPLATE_LIBRARY.map((template) => template.name)).toEqual([
      "aviso_agendamento_no_estudio_com_sinal_pago_com_flora",
      "aviso_agendamento_no_estudio_com_sinal_pago_sem_oi_flora",
      "aviso_agendamento_no_estudio_pago_integral_com_flora",
      "aviso_agendamento_no_estudio_pago_integral_sem_oi_flora",
      "aviso_agendamento_domicilio_sinal_pago_com_flora",
      "aviso_agendamento_domicilio_sinal_pago_sem_oi_flora",
      "aviso_agendamento_domicilio_pago_integral_com_flora",
      "aviso_agendamento_domicilio_pago_integral_sem_oi_flora",
      "aviso_agendamento_estudio_pagamento_no_atendimento_com_flora",
      "aviso_agendamento_estudio_pagamento_no_atendimento_sem_oi_flora",
      "aviso_agendamento_domicilio_pagamento_no_atendimento_com_flora",
      "aviso_agendamento_domicilio_pagamento_no_atendimento_sem_oi_flora",
      "lembrete_confirmacao_24h_estudio_pago_integral",
      "lembrete_confirmacao_24h_estudio_saldo_pendente",
      "lembrete_confirmacao_24h_domicilio_pago_integral",
      "lembrete_confirmacao_24h_domicilio_saldo_pendente",
    ]);
  });

  it("mantém status por template (ativos e em análise)", () => {
    const active = WHATSAPP_TEMPLATE_LIBRARY.filter((template) => template.status === "active");
    const inReview = WHATSAPP_TEMPLATE_LIBRARY.filter((template) => template.status === "in_review");

    expect(active).toHaveLength(13);
    expect(inReview).toHaveLength(3);
    expect(inReview.map((template) => template.name).sort()).toEqual(
      [
        "aviso_agendamento_domicilio_pagamento_no_atendimento_com_flora",
        "aviso_agendamento_domicilio_pagamento_no_atendimento_sem_oi_flora",
        "aviso_agendamento_domicilio_sinal_pago_com_flora",
      ].sort()
    );
    expect(
      getWhatsAppTemplateFromLibrary("aviso_agendamento_domicilio_pagamento_no_atendimento_sem_oi_flora")
        ?.statusLabel
    ).toBe("CRIADO E EM ANÁLISE");
  });

  it("mantém botões dinâmicos e de resposta rápida", () => {
    const receiptTemplate = getWhatsAppTemplateFromLibrary(
      "aviso_agendamento_no_estudio_com_sinal_pago_com_flora"
    );
    const paymentTemplate = getWhatsAppTemplateFromLibrary(
      "aviso_agendamento_estudio_pagamento_no_atendimento_com_flora"
    );
    const reminderTemplate = getWhatsAppTemplateFromLibrary(
      "lembrete_confirmacao_24h_estudio_saldo_pendente"
    );

    expect(receiptTemplate?.button).toEqual(
      expect.objectContaining({
        type: "url_dynamic",
        buttonText: "VER COMPROVANTE",
        urlBase: "https://public.corpoealmahumanizado.com.br/comprovante/pagamento/",
        sampleValue: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
      })
    );
    expect(paymentTemplate?.button).toEqual(
      expect.objectContaining({
        type: "url_dynamic",
        buttonText: "PAGAR AGORA",
        urlBase: "https://public.corpoealmahumanizado.com.br/pagamento/",
        sampleValue: META_TEMPLATE_PUBLIC_SAMPLE_CODE,
      })
    );
    expect(reminderTemplate?.button).toEqual(
      expect.objectContaining({
        type: "quick_reply",
      })
    );
    expect(
      reminderTemplate?.button.type === "quick_reply"
        ? reminderTemplate.button.buttons.map((item) => item.text)
        : []
    ).toEqual(["CONFIRMAR", "REAGENDAR", "FALAR COM A JANA"]);
  });
});
