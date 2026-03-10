import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_CONFIRMATION_REPLY_TEMPLATE_MATRIX,
  resolveConfirmationReplyTemplateSelection,
} from "./whatsapp-confirmation-reply-template-rules";
import { getWhatsAppTemplateFromLibrary } from "./whatsapp-template-library";

describe("whatsapp-confirmation-reply-template-rules", () => {
  it("garante que os templates da matriz existem na biblioteca local", () => {
    const allTemplateNames = Object.values(
      APPOINTMENT_CONFIRMATION_REPLY_TEMPLATE_MATRIX
    );
    const missing = allTemplateNames.filter(
      (name) => !getWhatsAppTemplateFromLibrary(name)
    );

    expect(missing).toEqual([]);
    expect(new Set(allTemplateNames).size).toBe(2);
  });

  it("resolve template de confirmação para estúdio quando ativo", () => {
    const selection = resolveConfirmationReplyTemplateSelection({
      isHomeVisit: false,
    });

    expect(selection.templateName).toBe("resposta_confirmacao_estudio");
    expect(selection.location).toBe("studio");
  });

  it("bloqueia envio quando template do cenário está em análise", () => {
    expect(() =>
      resolveConfirmationReplyTemplateSelection({
        isHomeVisit: true,
      })
    ).toThrowError(/Nenhum template ativo disponível para resposta de confirmação/);
  });
});

