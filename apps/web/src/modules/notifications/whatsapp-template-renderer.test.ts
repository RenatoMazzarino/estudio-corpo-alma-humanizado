import { describe, expect, it } from "vitest";
import { renderWhatsAppTemplateAsText } from "./whatsapp-template-renderer";
import { DEFAULT_PUBLIC_BASE_URL } from "../../shared/config";

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
    expect(text).toContain(`PAGAR AGORA: ${DEFAULT_PUBLIC_BASE_URL}/pagamento/manual-checkout-001`);
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

  it("renderiza opções de resposta rápida para lembrete 24h", () => {
    const text = renderWhatsAppTemplateAsText({
      templateName: "lembrete_confirmacao_24h_estudio_saldo_pendente",
      variableMap: {
        client_name: "Renata",
        service_name: "Drenagem Linfática",
        time_label: "18:30",
        total_due: "220,00",
      },
    });

    expect(text).toContain("Amanhã às 18:30");
    expect(text).toContain("Total a pagar no dia");
    expect(text).toContain("Opções de resposta: CONFIRMAR | REAGENDAR | FALAR COM A JANA");
  });

  it("renderiza cabeçalho textual para template de resposta de confirmação", () => {
    const text = renderWhatsAppTemplateAsText({
      templateName: "resposta_confirmacao_estudio",
      variableMap: {
        client_name: "Renata",
        voucher_public_id: "voucher-123",
      },
    });

    expect(text).toContain("Presença Confirmada!");
    expect(text).toContain("Combinado *Renata*");
    expect(text).toContain(`VER VOUCHER: ${DEFAULT_PUBLIC_BASE_URL}/voucher/voucher-123`);
  });
});
