import { describe, expect, it } from "vitest";
import { extractTemplateWebhookUpdates } from "./whatsapp-template-catalog";

describe("whatsapp-template-catalog", () => {
  it("extrai update de status de template do webhook Meta", () => {
    const updates = extractTemplateWebhookUpdates({
      entry: [
        {
          changes: [
            {
              field: "message_template_status_update",
              value: {
                message_template_status_update: {
                  message_template_name: "aviso_agendamento_no_estudio_com_sinal_pago_sem_oi_flora",
                  message_template_language: "pt_BR",
                  message_template_id: "12345",
                  event: "APPROVED",
                },
              },
            },
          ],
        },
      ],
    });

    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      field: "message_template_status_update",
      name: "aviso_agendamento_no_estudio_com_sinal_pago_sem_oi_flora",
      languageCode: "pt_BR",
      providerTemplateId: "12345",
      status: "active",
    });
  });

  it("extrai qualidade e categoria quando eventos existem", () => {
    const updates = extractTemplateWebhookUpdates({
      entry: [
        {
          changes: [
            {
              field: "message_template_quality_update",
              value: {
                message_template_quality_update: [
                  {
                    message_template_name: "aviso_agendamento_domicilio_sinal_pago_sem_oi_flora",
                    message_template_language: "pt_BR",
                    new_quality: "HIGH",
                  },
                ],
              },
            },
            {
              field: "template_category_update",
              value: {
                template_category_update: {
                  template_name: "aviso_agendamento_domicilio_sinal_pago_sem_oi_flora",
                  language_code: "pt_BR",
                  new_category: "UTILITY",
                },
              },
            },
          ],
        },
      ],
    });

    expect(updates).toHaveLength(2);
    expect(updates[0]?.quality).toBe("high");
    expect(updates[1]?.category).toBe("utility");
  });
});
