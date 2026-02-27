import type { Json } from "../../../lib/supabase/types";
import {
  asJsonObject,
  extractMetaInboundButtonSelection,
  getAutomationPayload,
  mapButtonSelectionToAction,
  mergeJobPayload,
  onlyDigits,
  type MetaWebhookInboundMessage,
} from "./whatsapp-automation.helpers";
import type { NotificationJobRow } from "./repository";

type InboundDeps = {
  findNotificationJobByProviderMessageId: (
    providerMessageId: string
  ) => Promise<{
    data: NotificationJobRow | null;
    error: unknown;
  }>;
  updateNotificationJobStatus: (params: {
    id: string;
    status: "pending" | "sent" | "failed";
    payload: Json;
  }) => Promise<{ error: unknown }>;
  sendMetaCloudTextMessage: (params: {
    to: string;
    text: string;
  }) => Promise<{
    providerMessageId: string | null;
    deliveredAt: string;
    payload: Record<string, unknown> | null;
  }>;
  logAppointmentAutomationMessage: (params: {
    tenantId: string;
    appointmentId: string | null;
    type: string;
    status: string;
    payload: Json;
    sentAt?: string | null;
  }) => Promise<void>;
  buildAppointmentVoucherLink: (params: {
    tenantId: string;
    appointmentId: string;
    webhookOrigin?: string;
  }) => Promise<string>;
  buildButtonReplyAutoMessage: (params: {
    action: "confirm" | "reschedule" | "talk_to_jana";
    voucherLink: string;
  }) => string;
};

export async function processMetaCloudWebhookInboundMessages(
  params: {
    payload: Record<string, unknown>;
    webhookOrigin?: string;
  },
  deps: InboundDeps
) {
  const entryList = Array.isArray(params.payload.entry) ? params.payload.entry : [];
  let processed = 0;
  let replied = 0;
  let ignored = 0;
  let unmatched = 0;

  for (const entry of entryList) {
    if (!entry || typeof entry !== "object") continue;
    const changes = Array.isArray((entry as Record<string, unknown>).changes)
      ? ((entry as Record<string, unknown>).changes as unknown[])
      : [];

    for (const change of changes) {
      if (!change || typeof change !== "object") continue;
      const changeValue = asJsonObject((change as Record<string, unknown>).value as Json | undefined);
      const messages = Array.isArray(changeValue.messages) ? (changeValue.messages as unknown[]) : [];

      for (const rawMessage of messages) {
        if (!rawMessage || typeof rawMessage !== "object") continue;
        const message = rawMessage as MetaWebhookInboundMessage;
        const selection = extractMetaInboundButtonSelection(message);
        if (!selection) continue;

        processed += 1;
        const action = mapButtonSelectionToAction(selection);
        if (!action) {
          ignored += 1;
          continue;
        }

        const parentProviderMessageId =
          typeof message.context?.id === "string" ? message.context.id.trim() : "";
        const customerWaId = typeof message.from === "string" ? onlyDigits(message.from) : "";
        const inboundMessageId = typeof message.id === "string" ? message.id.trim() : "";

        if (!parentProviderMessageId || !customerWaId) {
          ignored += 1;
          continue;
        }

        const { data: job, error: lookupError } =
          await deps.findNotificationJobByProviderMessageId(parentProviderMessageId);
        if (lookupError) {
          console.error("[whatsapp-automation] Falha ao localizar job para resposta do cliente:", lookupError);
          continue;
        }
        if (!job) {
          unmatched += 1;
          continue;
        }
        if (!job.appointment_id) {
          ignored += 1;
          continue;
        }

        const { automation } = getAutomationPayload(job.payload);
        const inboundEvents = Array.isArray(automation.meta_inbound_events)
          ? (automation.meta_inbound_events as unknown[])
          : [];
        const duplicateInbound = inboundMessageId
          ? inboundEvents.some((event) => {
              if (!event || typeof event !== "object") return false;
              const obj = event as Record<string, unknown>;
              return obj.inbound_message_id === inboundMessageId;
            })
          : false;

        if (duplicateInbound) {
          ignored += 1;
          continue;
        }

        const voucherLink = await deps.buildAppointmentVoucherLink({
          tenantId: job.tenant_id,
          appointmentId: job.appointment_id,
          webhookOrigin: params.webhookOrigin,
        });
        const replyText = deps.buildButtonReplyAutoMessage({ action, voucherLink });
        const outbound = await deps.sendMetaCloudTextMessage({ to: customerWaId, text: replyText });
        const nowIso = new Date().toISOString();

        const nextInboundEvents = [
          ...inboundEvents,
          {
            at: nowIso,
            inbound_message_id: inboundMessageId || null,
            parent_provider_message_id: parentProviderMessageId,
            from: customerWaId,
            selection,
            action,
            reply_provider_message_id: outbound.providerMessageId,
          },
        ].slice(-20);

        const nextPayload = mergeJobPayload(job, {
          automation: {
            ...automation,
            meta_inbound_events: nextInboundEvents,
            last_customer_reply_at: nowIso,
            last_customer_reply_action: action,
            last_customer_reply_selection: selection,
          },
        });

        const { error: updateError } = await deps.updateNotificationJobStatus({
          id: job.id,
          status: job.status as "pending" | "sent" | "failed",
          payload: nextPayload,
        });
        if (updateError) {
          console.error("[whatsapp-automation] Falha ao atualizar job com resposta do cliente:", updateError);
        }

        await deps.logAppointmentAutomationMessage({
          tenantId: job.tenant_id,
          appointmentId: job.appointment_id,
          type: "auto_appointment_reply_inbound",
          status: "received_auto_reply",
          payload: {
            source_job_id: job.id,
            parent_provider_message_id: parentProviderMessageId,
            inbound_message_id: inboundMessageId || null,
            from: customerWaId,
            selection,
            action,
          } as Json,
        });

        await deps.logAppointmentAutomationMessage({
          tenantId: job.tenant_id,
          appointmentId: job.appointment_id,
          type:
            action === "confirm"
              ? "auto_appointment_reply_confirmed"
              : action === "reschedule"
                ? "auto_appointment_reply_reschedule"
                : "auto_appointment_reply_talk_to_jana",
          status: "sent_auto_reply",
          payload: {
            source_job_id: job.id,
            action,
            to: customerWaId,
            message: replyText,
            voucher_link: action === "confirm" ? voucherLink : null,
            provider_message_id: outbound.providerMessageId,
            provider_response: outbound.payload ?? null,
          } as Json,
          sentAt: outbound.deliveredAt,
        });

        replied += 1;
      }
    }
  }

  return { processed, replied, ignored, unmatched };
}
