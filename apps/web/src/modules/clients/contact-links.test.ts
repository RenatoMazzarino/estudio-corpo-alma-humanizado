import { describe, expect, it } from "vitest";

import {
  buildClientPhoneHref,
  buildClientWhatsAppHref,
  buildNewAppointmentHref,
} from "./contact-links";

describe("client contact links", () => {
  it("monta href de telefone com codigo do pais quando recebe numero nacional", () => {
    expect(buildClientPhoneHref("(11) 98828-3270")).toBe("tel:+5511988283270");
  });

  it("preserva numero ja normalizado com 55 no WhatsApp", () => {
    expect(buildClientWhatsAppHref("5511999993349")).toBe("https://wa.me/5511999993349");
  });

  it("inclui mensagem codificada no link do WhatsApp", () => {
    expect(buildClientWhatsAppHref("(11) 98828-3270", "Olá, Renato")).toBe(
      "https://wa.me/5511988283270?text=Ol%C3%A1%2C%20Renato"
    );
  });

  it("gera link de agendamento com retorno ao modulo de clientes", () => {
    expect(buildNewAppointmentHref("client-123", "/clientes")).toBe(
      "/novo?clientId=client-123&returnTo=%2Fclientes"
    );
  });
});
