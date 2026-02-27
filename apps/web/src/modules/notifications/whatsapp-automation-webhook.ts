import { processMetaCloudWebhookInboundMessages } from "./whatsapp-webhook-inbound";
import {
  processMetaCloudWebhookStatusEvents,
  summarizeMetaWebhookNonMessageFields,
} from "./whatsapp-webhook-status";
import {
  findNotificationJobByProviderMessageId,
  updateNotificationJobStatus,
} from "./repository";
import {
  buildAppointmentVoucherLink,
  buildButtonReplyAutoMessage,
} from "./whatsapp-automation-appointments";
import { sendMetaCloudTextMessage } from "./whatsapp-meta-client";
import { logAppointmentAutomationMessage } from "./whatsapp-automation-logging";

export async function processMetaCloudWebhookEvents(
  payload: Record<string, unknown>,
  options?: { webhookOrigin?: string }
) {
  const statusResult = await processMetaCloudWebhookStatusEvents(payload, {
    findNotificationJobByProviderMessageId,
    updateNotificationJobStatus,
    logAppointmentAutomationMessage,
  });
  const inboundResult = await processMetaCloudWebhookInboundMessages(
    {
      payload,
      webhookOrigin: options?.webhookOrigin,
    },
    {
      findNotificationJobByProviderMessageId,
      updateNotificationJobStatus,
      sendMetaCloudTextMessage,
      logAppointmentAutomationMessage,
      buildAppointmentVoucherLink,
      buildButtonReplyAutoMessage,
    }
  );
  const nonMessageFields = summarizeMetaWebhookNonMessageFields(payload);
  if (nonMessageFields.totalTracked > 0) {
    console.log("[whatsapp-automation] Webhook Meta recebeu eventos extras (rastreados):", nonMessageFields);
  }
  return {
    ok: true,
    statuses: statusResult,
    inboundMessages: inboundResult,
    nonMessageFields,
  };
}
