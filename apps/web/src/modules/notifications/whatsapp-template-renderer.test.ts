import { describe, expect, it } from "vitest";
import { renderWhatsAppTemplateAsText } from "./whatsapp-template-renderer";

describe("whatsapp-template-renderer", () => {
  it("renderiza body + rodapé + botão para template dinâmico", () => {
    const text = renderWhatsAppTemplateAsText({
      templateName: "aviso_agendamento_estudio_pagamento_no_atendimento_sem_oi_flora",
      variableMap: {
        client_name: "Renata",
        service_name: "Drenagem Linfática",
        date_label: "Segunda-feira, dia 16 de março",
        time_label: "18:30",
        total_due: "220,00",
        payment_link_public_id: "manual-checkout-001",
      },
    });

    expect(text).toContain("Olá, *Renata*!");
    expect(text).toContain("Drenagem Linfática");
    expect(text).toContain("PAGAR AGORA: https://public.corpoealmahumanizado.com.br/pagamento/manual-checkout-001");
    expect(text).toContain("Mensagem automática. Não é necessário confirmar.");
  });

  it("lança erro quando variável obrigatória está ausente", () => {
    expect(() =>
      renderWhatsAppTemplateAsText({
        templateName: "aviso_agendamento_no_estudio_com_sinal_pago_sem_oi_flora",
        variableMap: {
          client_name: "Renata",
        },
      })
    ).toThrow("sem valor para variável");
  });
});
