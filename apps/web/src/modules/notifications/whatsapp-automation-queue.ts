import type { Json } from "../../../lib/supabase/types";
import {
  WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE,
  WHATSAPP_AUTOMATION_MODE,
  WHATSAPP_AUTOMATION_QUEUE_ENABLED,
  isWhatsAppAutomationTenantAllowed,
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
import { logAppointmentAutomationMessage } from "./whatsapp-automation-logging";
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
  if (!WHATSAPP_AUTOMATION_QUEUE_ENABLED) {
    return { skipped: true as const };
  }
  if (!isWhatsAppAutomationTenantAllowed(payload.tenant_id)) {
    return { skipped: true as const, reason: "tenant_not_allowed" as const };
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
      mode_at_queue_time: WHATSAPP_AUTOMATION_MODE,
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

  if (
    WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE &&
    WHATSAPP_AUTOMATION_MODE !== "disabled" &&
    insertedJob?.id &&
    options?.processJobs
  ) {
    try {
      await options.processJobs({
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
}

export async function scheduleAppointmentCanceledNotification(
  params: ScheduleCanceledParams,
  options?: { processJobs?: (params: { jobId: string; type?: NotificationJobRow["type"]; limit: number }) => Promise<ProcessSummary> }
) {
  if (!params.notifyClient) {
    return;
  }
  if (!WHATSAPP_AUTOMATION_QUEUE_ENABLED) {
    return;
  }
  if (!isWhatsAppAutomationTenantAllowed(params.tenantId)) {
    await logAppointmentAutomationMessage({
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      type: "auto_appointment_canceled",
      status: "skipped_auto",
      payload: {
        automation: {
          skipped_reason: "tenant_not_allowed",
          skipped_reason_label: "Este cliente ainda não está liberado para automação.",
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
}
