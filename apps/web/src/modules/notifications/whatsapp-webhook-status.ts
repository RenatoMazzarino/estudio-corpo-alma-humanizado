import type { Json } from "../../../lib/supabase/types";
import {
  asJsonObject,
  buildMessageTypeFromJobType,
  extractMetaStatusFailureMessage,
  isSupportedWhatsAppJobType,
  mapMetaStatusToAppointmentMessageStatus,
  mergeJobPayload,
  normalizeMetaStatus,
} from "./whatsapp-automation.helpers";
import type {
  NotificationJobRow,
} from "./repository";

type MetaWebhookStatusItem = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  conversation?: unknown;
  pricing?: unknown;
  errors?: unknown;
};

type StatusDeps = {
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
  logAppointmentAutomationMessage: (params: {
    tenantId: string;
    appointmentId: string | null;
    type: string;
    status: string;
    payload: Json;
    sentAt?: string | null;
  }) => Promise<void>;
};

export async function processMetaCloudWebhookStatusEvents(
  payload: Record<string, unknown>,
  deps: StatusDeps
) {
  const entryList = Array.isArray(payload.entry) ? payload.entry : [];
  let processed = 0;
  let matchedJobs = 0;
  let unmatched = 0;
  let duplicates = 0;

  for (const entry of entryList) {
    if (!entry || typeof entry !== "object") continue;
    const changes = Array.isArray((entry as Record<string, unknown>).changes)
      ? ((entry as Record<string, unknown>).changes as unknown[])
      : [];

    for (const change of changes) {
      if (!change || typeof change !== "object") continue;
      const changeValue = asJsonObject((change as Record<string, unknown>).value as Json | undefined);
      const statuses = Array.isArray(changeValue.statuses) ? (changeValue.statuses as unknown[]) : [];

      for (const rawStatus of statuses) {
        if (!rawStatus || typeof rawStatus !== "object") continue;
        const statusItem = rawStatus as MetaWebhookStatusItem;
        const providerMessageId = typeof statusItem.id === "string" ? statusItem.id.trim() : "";
        const normalizedStatus = normalizeMetaStatus(statusItem.status);
        if (!providerMessageId) continue;

        processed += 1;
        const { data: job, error: lookupError } = await deps.findNotificationJobByProviderMessageId(providerMessageId);
        if (lookupError) {
          console.error("[whatsapp-automation] Falha ao localizar job por provider_message_id:", lookupError);
          continue;
        }
        if (!job) {
          unmatched += 1;
          continue;
        }
        matchedJobs += 1;

        const payloadObj = asJsonObject(job.payload);
        const automation = asJsonObject(payloadObj.automation as Json | undefined);
        const previousEvents = Array.isArray(automation.meta_status_events)
          ? (automation.meta_status_events as unknown[])
          : [];
        const duplicateStatus = previousEvents.some((event) => {
          if (!event || typeof event !== "object") return false;
          const previous = event as Record<string, unknown>;
          const previousProviderMessageId =
            typeof previous.provider_message_id === "string" ? previous.provider_message_id : null;
          const previousProviderStatus =
            typeof previous.provider_status === "string" ? previous.provider_status : null;
          const previousProviderTimestamp =
            typeof previous.provider_timestamp === "string"
              ? previous.provider_timestamp
              : typeof previous.provider_timestamp === "number"
                ? String(previous.provider_timestamp)
                : null;
          const currentProviderTimestamp =
            typeof statusItem.timestamp === "string"
              ? statusItem.timestamp
              : typeof statusItem.timestamp === "number"
                ? String(statusItem.timestamp)
                : null;

          return (
            previousProviderMessageId === providerMessageId &&
            previousProviderStatus === normalizedStatus &&
            previousProviderTimestamp === currentProviderTimestamp
          );
        });
        if (duplicateStatus) {
          duplicates += 1;
          continue;
        }

        const statusEvent = {
          at: new Date().toISOString(),
          provider_message_id: providerMessageId,
          provider_status: normalizedStatus,
          provider_timestamp: statusItem.timestamp ?? null,
          recipient_id: statusItem.recipient_id ?? null,
          conversation: statusItem.conversation ?? null,
          pricing: statusItem.pricing ?? null,
          errors: statusItem.errors ?? null,
        };
        const statusFailureMessage = extractMetaStatusFailureMessage(statusItem.errors);

        const nextPayload = mergeJobPayload(job, {
          automation: {
            ...automation,
            provider_delivery_status: normalizedStatus,
            provider_delivery_updated_at: new Date().toISOString(),
            provider_delivery_error: normalizedStatus === "failed" ? statusFailureMessage : null,
            meta_status_events: [...previousEvents, statusEvent].slice(-20),
          },
        });

        const { error: updateError } = await deps.updateNotificationJobStatus({
          id: job.id,
          status: job.status as "pending" | "sent" | "failed",
          payload: nextPayload,
        });
        if (updateError) {
          console.error("[whatsapp-automation] Falha ao atualizar payload do job por status webhook:", updateError);
          continue;
        }

        await deps.logAppointmentAutomationMessage({
          tenantId: job.tenant_id,
          appointmentId: job.appointment_id,
          type: buildMessageTypeFromJobType(
            isSupportedWhatsAppJobType(job.type) ? job.type : "appointment_created"
          ),
          status: mapMetaStatusToAppointmentMessageStatus(normalizedStatus),
          payload: nextPayload,
          sentAt: normalizedStatus === "delivered" || normalizedStatus === "read" ? new Date().toISOString() : null,
        });
      }
    }
  }

  return { processed, matchedJobs, unmatched, duplicates };
}

export function summarizeMetaWebhookNonMessageFields(payload: Record<string, unknown>) {
  const entryList = Array.isArray(payload.entry) ? payload.entry : [];
  const trackedFields = new Set([
    "message_template_status_update",
    "message_template_quality_update",
    "history",
    "smb_message_echoes",
    "smb_app_state_sync",
  ]);
  const counts: Record<string, number> = {};
  let totalTracked = 0;

  for (const entry of entryList) {
    if (!entry || typeof entry !== "object") continue;
    const changes = Array.isArray((entry as Record<string, unknown>).changes)
      ? ((entry as Record<string, unknown>).changes as unknown[])
      : [];

    for (const change of changes) {
      if (!change || typeof change !== "object") continue;
      const field =
        typeof (change as Record<string, unknown>).field === "string"
          ? ((change as Record<string, unknown>).field as string).trim()
          : "";
      if (!field || !trackedFields.has(field)) continue;
      counts[field] = (counts[field] ?? 0) + 1;
      totalTracked += 1;
    }
  }

  return {
    totalTracked,
    fields: counts,
  };
}
