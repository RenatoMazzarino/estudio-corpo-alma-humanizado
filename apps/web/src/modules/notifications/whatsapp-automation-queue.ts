import type { Json } from "../../../lib/supabase/types";
import {
  WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE,
  isWhatsAppAutomationDispatchEnabled,
  isWhatsAppAutomationLiveSendEnabled,
} from "./automation-config";
import {
  asJsonObject,
  buildMessageTypeFromJobType,
  isSupportedWhatsAppJobType,
} from "./whatsapp-automation.helpers";
import { hasOpenCustomerServiceWindowForAppointment } from "./whatsapp-automation-appointments";
import type { NotificationJobInsert, NotificationJobRow } from "./repository";
import {
  findPendingNotificationJobDuplicate,
  insertNotificationJob,
} from "./repository";
import { processPendingWhatsAppNotificationJobs } from "./whatsapp-automation-processor";
import { logAppointmentAutomationMessage } from "./whatsapp-automation-logging";
import { getTenantWhatsAppSettings } from "./tenant-whatsapp-settings";
import { createEventCorrelationId } from "../events/outbox";
import { safeEmitDomainEventToOutbox } from "../events/safe-outbox";
import type {
  QueueSource,
  ScheduleCanceledParams,
  ScheduleLifecycleParams,
} from "./whatsapp-automation.types";
import type { ProcessSummary } from "./whatsapp-automation.types";

export async function enqueueNotificationJobWithAutomationGuard(
  payload: NotificationJobInsert & { source: QueueSource },
  options?: { processJobs?: (params: { jobId: string; type?: NotificationJobRow["type"]; limit: number }) => Promise<ProcessSummary> }
) {
  if (!isWhatsAppAutomationDispatchEnabled()) {
    return { skipped: true as const };
  }

  const tenantSettings = await getTenantWhatsAppSettings(payload.tenant_id);
  if (!tenantSettings.automationEnabledInSettings) {
    return { skipped: true as const, reason: "tenant_automation_disabled" as const };
  }

  const { source, ...jobInsert } = payload;

  const { data: existingPendingDuplicate, error: duplicateError } = await findPendingNotificationJobDuplicate({
    tenantId: payload.tenant_id,
    appointmentId: payload.appointment_id ?? null,
    channel: "whatsapp",
    type: payload.type,
  });
  if (duplicateError) {
    console.error("[whatsapp-automation] Erro ao verificar duplicidade de job:", duplicateError);
  }
  if (existingPendingDuplicate) {
    return { skipped: true as const, reason: "duplicate_pending" as const, jobId: existingPendingDuplicate.id };
  }

  const basePayload = asJsonObject(payload.payload ?? {});
  const existingAutomation = asJsonObject(basePayload.automation as Json | undefined);
  const enrichedPayload = {
    ...basePayload,
    automation: {
      ...existingAutomation,
      queued_at: new Date().toISOString(),
      source,
      mode_at_queue_time: isWhatsAppAutomationLiveSendEnabled() ? "enabled" : "dry_run",
      queue_enabled: true,
    },
  } as Json;

  const { data: insertedJob, error } = await insertNotificationJob({
    ...jobInsert,
    payload: enrichedPayload,
  });
  if (error) {
    console.error("[whatsapp-automation] Erro ao criar job de notificação:", error);
    return { skipped: false as const, error };
  }

  await logAppointmentAutomationMessage({
    tenantId: payload.tenant_id,
    appointmentId: payload.appointment_id ?? null,
    type: isSupportedWhatsAppJobType(payload.type)
      ? buildMessageTypeFromJobType(payload.type)
      : "auto_unknown",
    status: "queued_auto",
    payload: enrichedPayload,
  });

  if (insertedJob?.id) {
    const correlationId = createEventCorrelationId("waq");
    await safeEmitDomainEventToOutbox({
      tenantId: payload.tenant_id,
      eventType: "whatsapp.job.queued",
      sourceModule: "notifications.whatsapp-automation-queue",
      correlationId,
      idempotencyKey: `${payload.tenant_id}:${insertedJob.id}:queued`,
      payload: {
        job_id: insertedJob.id,
        appointment_id: insertedJob.appointment_id,
        job_type: insertedJob.type,
        channel: insertedJob.channel,
        status: insertedJob.status,
        scheduled_for: insertedJob.scheduled_for,
        source,
      } as Json,
    });
  }

  if (
    WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE &&
    isWhatsAppAutomationDispatchEnabled() &&
    insertedJob?.id
  ) {
    const processJobs = options?.processJobs ?? processPendingWhatsAppNotificationJobs;

    try {
      await processJobs({
        jobId: insertedJob.id,
        type: isSupportedWhatsAppJobType(insertedJob.type) ? insertedJob.type : undefined,
        limit: 1,
      });
    } catch (dispatchError) {
      console.error(
        "[whatsapp-automation] Falha ao processar job recém-enfileirado automaticamente:",
        dispatchError
      );
    }
  }

  return { skipped: false as const };
}

export async function scheduleAppointmentLifecycleNotifications(
  params: ScheduleLifecycleParams,
  options?: { processJobs?: (params: { jobId: string; type?: NotificationJobRow["type"]; limit: number }) => Promise<ProcessSummary> }
) {
  const nowIso = new Date().toISOString();
  const reminderDate = new Date(params.startTimeIso);
  reminderDate.setHours(reminderDate.getHours() - 24);

  await enqueueNotificationJobWithAutomationGuard(
    {
      tenant_id: params.tenantId,
      appointment_id: params.appointmentId,
      type: "appointment_created",
      channel: "whatsapp",
      payload: {
        appointment_id: params.appointmentId,
        start_time: params.startTimeIso,
      },
      status: "pending",
      scheduled_for: nowIso,
      source: params.source,
    },
    options
  );

  await enqueueNotificationJobWithAutomationGuard(
    {
      tenant_id: params.tenantId,
      appointment_id: params.appointmentId,
      type: "appointment_reminder",
      channel: "whatsapp",
      payload: {
        appointment_id: params.appointmentId,
        start_time: params.startTimeIso,
        reminder_window: "24h",
      },
      status: "pending",
      scheduled_for: reminderDate.toISOString(),
      source: params.source,
    },
    options
  );

  const correlationId = createEventCorrelationId("appt");
  await safeEmitDomainEventToOutbox({
    tenantId: params.tenantId,
    eventType: "appointment.created",
    sourceModule: "notifications.whatsapp-automation-queue",
    correlationId,
    idempotencyKey: `${params.tenantId}:${params.appointmentId}:appointment.created`,
    payload: {
      appointment_id: params.appointmentId,
      start_time: params.startTimeIso,
      source: params.source,
    } as Json,
  });
}

export async function scheduleAppointmentCanceledNotification(
  params: ScheduleCanceledParams,
  options?: { processJobs?: (params: { jobId: string; type?: NotificationJobRow["type"]; limit: number }) => Promise<ProcessSummary> }
) {
  if (!params.notifyClient) {
    return;
  }
  if (!isWhatsAppAutomationDispatchEnabled()) {
    return;
  }

  const tenantSettings = await getTenantWhatsAppSettings(params.tenantId);
  if (!tenantSettings.automationEnabledInSettings) {
    await logAppointmentAutomationMessage({
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      type: "auto_appointment_canceled",
      status: "skipped_auto",
      payload: {
        automation: {
          skipped_reason: "tenant_automation_disabled",
          skipped_reason_label: "Automação WhatsApp está desativada para este tenant.",
          customer_service_window_checked_at: new Date().toISOString(),
        },
      } as Json,
    });
    return;
  }

  const windowCheck = await hasOpenCustomerServiceWindowForAppointment(params.tenantId, params.appointmentId);
  if (!windowCheck.isOpen || !windowCheck.customerWaId) {
    await logAppointmentAutomationMessage({
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      type: "auto_appointment_canceled",
      status: "skipped_auto",
      payload: {
        automation: {
          skipped_reason:
            windowCheck.reason === "no_inbound"
              ? "customer_service_window_no_inbound"
              : "customer_service_window_expired",
          skipped_reason_label:
            windowCheck.reason === "no_inbound"
              ? "Cliente ainda não respondeu no WhatsApp para este agendamento."
              : "Janela de conversa de 24h expirou.",
          customer_service_window_checked_at: windowCheck.checkedAt,
          customer_service_window_last_inbound_at: windowCheck.lastInboundAt,
          customer_service_window_result: windowCheck.reason,
        },
      } as Json,
    });
    return;
  }

  await enqueueNotificationJobWithAutomationGuard(
    {
      tenant_id: params.tenantId,
      appointment_id: params.appointmentId,
      type: "appointment_canceled",
      channel: "whatsapp",
      payload: {
        appointment_id: params.appointmentId,
        automation: {
          customer_service_window_checked_at: windowCheck.checkedAt,
          customer_service_window_last_inbound_at: windowCheck.lastInboundAt,
          customer_service_window_result: "open",
          customer_wa_id: windowCheck.customerWaId,
        },
      } as Json,
      status: "pending",
      scheduled_for: new Date().toISOString(),
      source: params.source,
    },
    options
  );

  const correlationId = createEventCorrelationId("appt");
  await safeEmitDomainEventToOutbox({
    tenantId: params.tenantId,
    eventType: "appointment.canceled",
    sourceModule: "notifications.whatsapp-automation-queue",
    correlationId,
    idempotencyKey: `${params.tenantId}:${params.appointmentId}:appointment.canceled`,
    payload: {
      appointment_id: params.appointmentId,
      notify_client: params.notifyClient,
      source: params.source,
    } as Json,
  });
}
