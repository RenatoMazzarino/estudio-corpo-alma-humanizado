import {
  WHATSAPP_AUTOMATION_BATCH_LIMIT,
  WHATSAPP_AUTOMATION_MAX_RETRIES,
  WHATSAPP_AUTOMATION_MODE,
  WHATSAPP_AUTOMATION_PROVIDER,
  WHATSAPP_AUTOMATION_RETRY_BASE_DELAY_SECONDS,
  WHATSAPP_AUTOMATION_QUEUE_ENABLED,
  isWhatsAppAutomationTenantAllowed,
} from "./automation-config";
import {
  asJsonObject,
  buildAutomationMessagePreview,
  buildMessageTypeFromJobType,
  computeRetryDelaySeconds,
  getAutomationPayload,
  isRetryableDeliveryError,
  isSupportedWhatsAppJobType,
  mergeJobPayload,
  toIsoAfterSeconds,
} from "./whatsapp-automation.helpers";
import {
  sendMetaCloudCanceledAppointmentSessionMessage,
  sendMetaCloudCreatedAppointmentTemplate,
  sendMetaCloudReminderAppointmentTemplate,
  type DeliveryResult,
} from "./whatsapp-automation-appointments";
import {
  listPendingNotificationJobsDue,
  updateNotificationJobStatus,
  type NotificationJobRow,
} from "./repository";
import { logAppointmentAutomationMessage } from "./whatsapp-automation-logging";
import type { ProcessJobsParams, ProcessSummary } from "./whatsapp-automation.types";

async function deliverWhatsAppNotification(job: NotificationJobRow): Promise<DeliveryResult> {
  if (WHATSAPP_AUTOMATION_MODE === "dry_run") {
    return {
      providerMessageId: null,
      deliveredAt: new Date().toISOString(),
      deliveryMode: "dry_run",
      messagePreview: buildAutomationMessagePreview(job),
      providerResponse: null,
    };
  }

  if (WHATSAPP_AUTOMATION_PROVIDER !== "meta_cloud") {
    throw new Error(
      "WHATSAPP_AUTOMATION_MODE=enabled, mas WHATSAPP_AUTOMATION_PROVIDER não está configurado para um provedor suportado."
    );
  }

  if (job.type === "appointment_created") {
    return sendMetaCloudCreatedAppointmentTemplate(job);
  }
  if (job.type === "appointment_reminder") {
    return sendMetaCloudReminderAppointmentTemplate(job);
  }
  if (job.type === "appointment_canceled") {
    return sendMetaCloudCanceledAppointmentSessionMessage(job);
  }

  throw new Error(`Template automático para '${job.type}' ainda não implementado.`);
}

export async function processPendingWhatsAppNotificationJobs(params?: ProcessJobsParams) {
  const summary: ProcessSummary = {
    enabled: WHATSAPP_AUTOMATION_MODE !== "disabled",
    mode: WHATSAPP_AUTOMATION_MODE,
    queuedEnabled: WHATSAPP_AUTOMATION_QUEUE_ENABLED,
    totalScanned: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    results: [],
  };

  if (WHATSAPP_AUTOMATION_MODE === "disabled") {
    return summary;
  }

  const { data: jobs, error } = await listPendingNotificationJobsDue({
    channel: "whatsapp",
    limit: params?.limit ?? WHATSAPP_AUTOMATION_BATCH_LIMIT,
    appointmentId: params?.appointmentId,
    jobId: params?.jobId,
    type: params?.type,
  });

  if (error) {
    throw error;
  }

  const jobList = jobs ?? [];
  summary.totalScanned = jobList.length;

  for (const job of jobList) {
    if (!isSupportedWhatsAppJobType(job.type)) {
      summary.skipped += 1;
      summary.results.push({
        jobId: job.id,
        appointmentId: job.appointment_id,
        type: job.type,
        status: "skipped",
        reason: "Tipo de job ainda não suportado pela automação WhatsApp.",
      });
      continue;
    }

    if (!isWhatsAppAutomationTenantAllowed(job.tenant_id)) {
      summary.skipped += 1;
      summary.results.push({
        jobId: job.id,
        appointmentId: job.appointment_id,
        type: job.type,
        status: "skipped",
        reason: "Tenant não autorizado para automação WhatsApp.",
      });
      continue;
    }

    try {
      const delivery = await deliverWhatsAppNotification(job);
      const nextPayload = mergeJobPayload(job, {
        automation: {
          ...(asJsonObject(job.payload).automation as Record<string, unknown> | undefined),
          processed_at: delivery.deliveredAt,
          provider_accepted_at: delivery.deliveredAt,
          provider_name: delivery.providerName ?? null,
          delivery_mode: delivery.deliveryMode,
          provider_message_id: delivery.providerMessageId,
          template_name: delivery.templateName ?? null,
          template_language: delivery.templateLanguage ?? null,
          recipient: delivery.recipient ?? null,
          message_preview: delivery.messagePreview,
          provider_response: delivery.providerResponse ?? null,
        },
      });

      const { data: updated, error: updateError } = await updateNotificationJobStatus({
        id: job.id,
        status: "sent",
        payload: nextPayload,
        expectedCurrentStatus: "pending",
      });

      if (updateError) throw updateError;
      if (!updated) {
        summary.skipped += 1;
        summary.results.push({
          jobId: job.id,
          appointmentId: job.appointment_id,
          type: job.type,
          status: "skipped",
          reason: "Job já processado por outra execução.",
        });
        continue;
      }

      await logAppointmentAutomationMessage({
        tenantId: job.tenant_id,
        appointmentId: job.appointment_id,
        type: buildMessageTypeFromJobType(job.type),
        status: delivery.deliveryMode === "dry_run" ? "sent_auto_dry_run" : "sent_auto",
        payload: nextPayload,
        sentAt: delivery.deliveredAt,
      });

      summary.sent += 1;
      summary.results.push({
        jobId: job.id,
        appointmentId: job.appointment_id,
        type: job.type,
        status: "sent",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha desconhecida ao processar automação WhatsApp.";
      const { automation } = getAutomationPayload(job.payload);
      const previousRetryCount =
        typeof automation.retry_count === "number" && Number.isFinite(automation.retry_count)
          ? Math.max(0, Math.trunc(automation.retry_count))
          : 0;
      const nextRetryCount = previousRetryCount + 1;
      const canRetry =
        WHATSAPP_AUTOMATION_MODE === "enabled" &&
        isRetryableDeliveryError(message) &&
        nextRetryCount <= WHATSAPP_AUTOMATION_MAX_RETRIES;

      if (canRetry) {
        const retryInSeconds = computeRetryDelaySeconds(
          nextRetryCount,
          WHATSAPP_AUTOMATION_RETRY_BASE_DELAY_SECONDS
        );
        const retryAt = toIsoAfterSeconds(retryInSeconds);
        const retryPayload = mergeJobPayload(job, {
          automation: {
            ...automation,
            retry_count: nextRetryCount,
            retry_scheduled_at: new Date().toISOString(),
            retry_next_at: retryAt,
            retry_last_error: message,
          },
        });

        const { data: retried, error: retryUpdateError } = await updateNotificationJobStatus({
          id: job.id,
          status: "pending",
          payload: retryPayload,
          scheduledFor: retryAt,
          expectedCurrentStatus: "pending",
        });
        if (retryUpdateError) {
          console.error("[whatsapp-automation] Falha ao reagendar retry:", retryUpdateError);
        } else if (retried) {
          await logAppointmentAutomationMessage({
            tenantId: job.tenant_id,
            appointmentId: job.appointment_id,
            type: buildMessageTypeFromJobType(job.type),
            status: "retry_scheduled_auto",
            payload: retryPayload,
          });
          summary.skipped += 1;
          summary.results.push({
            jobId: job.id,
            appointmentId: job.appointment_id,
            type: job.type,
            status: "skipped",
            reason: `Retry agendado em ${retryInSeconds}s (${nextRetryCount}/${WHATSAPP_AUTOMATION_MAX_RETRIES}).`,
          });
          continue;
        }
      }

      const nextPayload = mergeJobPayload(job, {
        automation: {
          ...automation,
          failed_at: new Date().toISOString(),
          error: message,
          retry_count: nextRetryCount,
        },
      });

      const { error: failError } = await updateNotificationJobStatus({
        id: job.id,
        status: "failed",
        payload: nextPayload,
        expectedCurrentStatus: "pending",
      });
      if (failError) {
        console.error("[whatsapp-automation] Falha ao marcar job como failed:", failError);
      }

      await logAppointmentAutomationMessage({
        tenantId: job.tenant_id,
        appointmentId: job.appointment_id,
        type: buildMessageTypeFromJobType(job.type),
        status: "failed_auto",
        payload: nextPayload,
      });

      summary.failed += 1;
      summary.results.push({
        jobId: job.id,
        appointmentId: job.appointment_id,
        type: job.type,
        status: "failed",
        reason: message,
      });
    }
  }

  return summary;
}
