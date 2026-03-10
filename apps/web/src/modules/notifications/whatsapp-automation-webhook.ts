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
  applyAppointmentStatusFromInboundReply,
  buildAppointmentVoucherLink,
  sendMetaCloudInboundActionReply,
} from "./whatsapp-automation-appointments";
import { logAppointmentAutomationMessage } from "./whatsapp-automation-logging";
import { syncNotificationTemplateCatalogFromMetaWebhook } from "./whatsapp-template-catalog";

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
      sendInboundActionReply: sendMetaCloudInboundActionReply,
      logAppointmentAutomationMessage,
      buildAppointmentVoucherLink,
      applyAppointmentStatusFromInboundReply,
    }
  );
  const nonMessageFields = summarizeMetaWebhookNonMessageFields(payload);
  let templateCatalogSync: { updatesApplied: number; updatesFound: number } | null = null;
  try {
    templateCatalogSync = await syncNotificationTemplateCatalogFromMetaWebhook(payload);
  } catch (error) {
    console.error("[whatsapp-automation] Falha ao sincronizar catálogo de templates via webhook:", error);
  }
  if (nonMessageFields.totalTracked > 0) {
    console.log("[whatsapp-automation] Webhook Meta recebeu eventos extras (rastreados):", nonMessageFields);
  }
  return {
    ok: true,
    statuses: statusResult,
    inboundMessages: inboundResult,
    nonMessageFields,
    templateCatalogSync,
  };
}
