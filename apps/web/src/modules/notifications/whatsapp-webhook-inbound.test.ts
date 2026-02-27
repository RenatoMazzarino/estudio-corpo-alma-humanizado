import { describe, expect, it, vi } from "vitest";
import { processMetaCloudWebhookInboundMessages } from "./whatsapp-webhook-inbound";

const createDeps = () => ({
  findNotificationJobByProviderMessageId: vi.fn(),
  updateNotificationJobStatus: vi.fn().mockResolvedValue({ error: null }),
  sendMetaCloudTextMessage: vi
    .fn()
    .mockResolvedValue({ providerMessageId: "wamid.out", deliveredAt: new Date().toISOString(), payload: null }),
  logAppointmentAutomationMessage: vi.fn().mockResolvedValue(undefined),
  buildAppointmentVoucherLink: vi.fn().mockResolvedValue("https://example.com/voucher/abc"),
  buildButtonReplyAutoMessage: vi.fn().mockReturnValue("Mensagem automática"),
});

describe("processMetaCloudWebhookInboundMessages", () => {
  it("ignora mensagem sem seleção de botão", async () => {
    const deps = createDeps();

    const result = await processMetaCloudWebhookInboundMessages(
      {
        payload: {
          entry: [
            {
              changes: [{ value: { messages: [{ type: "text", text: { body: "oi" } }] } }],
            },
          ],
        },
      },
      deps
    );

    expect(result).toEqual({
      processed: 0,
      replied: 0,
      ignored: 0,
      unmatched: 0,
    });
    expect(deps.findNotificationJobByProviderMessageId).not.toHaveBeenCalled();
  });

  it("marca como unmatched quando botão válido não encontra job", async () => {
    const deps = createDeps();
    deps.findNotificationJobByProviderMessageId.mockResolvedValue({ data: null, error: null });

    const result = await processMetaCloudWebhookInboundMessages(
      {
        payload: {
          entry: [
            {
              changes: [
                {
                  value: {
                    messages: [
                      {
                        id: "wamid.in",
                        from: "5511999999999",
                        type: "interactive",
                        context: { id: "wamid.parent" },
                        interactive: {
                          type: "button_reply",
                          button_reply: { id: "confirmar", title: "Confirmar" },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
      deps
    );

    expect(result).toEqual({
      processed: 1,
      replied: 0,
      ignored: 0,
      unmatched: 1,
    });
    expect(deps.sendMetaCloudTextMessage).not.toHaveBeenCalled();
    expect(deps.updateNotificationJobStatus).not.toHaveBeenCalled();
  });
});
