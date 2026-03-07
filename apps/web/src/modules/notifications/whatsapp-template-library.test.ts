import { describe, expect, it } from "vitest";
import {
  getWhatsAppTemplateFromLibrary,
  WHATSAPP_TEMPLATE_LIBRARY,
} from "./whatsapp-template-library";

describe("whatsapp-template-library", () => {
  it("mantem os 6 templates de aviso/agendamento cadastrados", () => {
    expect(WHATSAPP_TEMPLATE_LIBRARY).toHaveLength(6);
    expect(WHATSAPP_TEMPLATE_LIBRARY.map((template) => template.name)).toEqual([
      "aviso_agendamento_no_estudio_com_sinal_pago",
      "aviso_agendemnto_no_estudio_pago_integral",
      "aviso_agendamento_domicilio_sinal_pago",
      "aviso_agendamento_domicilio_pago_integral",
      "aviso_agendamento_estudio_pagamento_no_atendimento",
      "aviso_agendamento_domicilio_pagamento_no_atendimento",
    ]);
  });

  it("mantem botao dinamico para comprovante e pagamento agora", () => {
    const withButton = WHATSAPP_TEMPLATE_LIBRARY.filter(
      (template) => template.button.type === "url_dynamic"
    );

    expect(withButton).toHaveLength(6);
    expect(
      getWhatsAppTemplateFromLibrary("aviso_agendamento_estudio_pagamento_no_atendimento")?.button
    ).toEqual(
      expect.objectContaining({
        type: "url_dynamic",
        buttonText: "Pagar agora",
        urlBase: "https://public.corpoealmahumanizado.com.br/pagamento/",
      })
    );
  });

  it("expõe lookup por nome", () => {
    const template = getWhatsAppTemplateFromLibrary(
      "aviso_agendamento_domicilio_sinal_pago"
    );

    expect(template?.variables).toHaveLength(9);
    expect(template?.button).toEqual(
      expect.objectContaining({
        type: "url_dynamic",
        variableName: "public_id",
      })
    );
  });
});
