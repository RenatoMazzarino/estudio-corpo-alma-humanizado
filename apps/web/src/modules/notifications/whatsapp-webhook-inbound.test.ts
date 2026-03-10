import { describe, expect, it, vi } from "vitest";
import { processMetaCloudWebhookInboundMessages } from "./whatsapp-webhook-inbound";

const createDeps = () => ({
  findNotificationJobByProviderMessageId: vi.fn(),
  updateNotificationJobStatus: vi.fn().mockResolvedValue({ error: null }),
  sendInboundActionReply: vi.fn().mockResolvedValue({
    providerMessageId: "wamid.out",
    deliveredAt: new Date().toISOString(),
    payload: null,
    deliveryMode: "meta_cloud_session_auto_reply",
    replyText: "Mensagem automática",
    templateName: null,
    templateLanguage: null,
    recipient: "5511999999999",
  }),
  logAppointmentAutomationMessage: vi.fn().mockResolvedValue(undefined),
  buildAppointmentVoucherLink: vi.fn().mockResolvedValue("https://example.com/voucher/abc"),
  applyAppointmentStatusFromInboundReply: vi.fn().mockResolvedValue({
    previousStatus: "pending",
    nextStatus: "confirmed",
    statusChanged: true,
    attendanceUpdated: true,
  }),
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
    expect(deps.sendInboundActionReply).not.toHaveBeenCalled();
    expect(deps.updateNotificationJobStatus).not.toHaveBeenCalled();
  });

  it("processa confirmação inbound, envia resposta e atualiza status do agendamento", async () => {
    const deps = createDeps();
    deps.findNotificationJobByProviderMessageId.mockResolvedValue({
      data: {
        id: "job-1",
        tenant_id: "tenant-1",
        appointment_id: "appointment-1",
        channel: "whatsapp",
        type: "appointment_reminder",
        status: "sent",
        payload: { automation: {} },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        scheduled_for: new Date().toISOString(),
      },
      error: null,
    });

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
                        id: "wamid.in.confirm",
                        from: "5511999999999",
                        type: "interactive",
                        context: { id: "wamid.parent.confirm" },
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
      replied: 1,
      ignored: 0,
      unmatched: 0,
    });
    expect(deps.sendInboundActionReply).toHaveBeenCalledTimes(1);
    expect(deps.applyAppointmentStatusFromInboundReply).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      appointmentId: "appointment-1",
      action: "confirm",
    });
    expect(deps.updateNotificationJobStatus).toHaveBeenCalledTimes(1);
  });
});
