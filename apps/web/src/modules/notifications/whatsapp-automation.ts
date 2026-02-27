import { createServiceClient } from "../../../lib/supabase/service";
import type { Json } from "../../../lib/supabase/types";
import {
  WHATSAPP_AUTOMATION_ALLOWED_TENANT_IDS,
  WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE,
  WHATSAPP_AUTOMATION_BATCH_LIMIT,
  WHATSAPP_AUTOMATION_LOCAL_POLLER_ENABLED,
  WHATSAPP_AUTOMATION_LOCAL_POLLER_INTERVAL_SECONDS,
  WHATSAPP_AUTOMATION_MAX_RETRIES,
  WHATSAPP_AUTOMATION_MODE,
  WHATSAPP_AUTOMATION_PROVIDER,
  WHATSAPP_AUTOMATION_QUEUE_ENABLED,
  WHATSAPP_AUTOMATION_RETRY_BASE_DELAY_SECONDS,
  isWhatsAppAutomationTenantAllowed,
  WHATSAPP_AUTOMATION_META_ACCESS_TOKEN,
  WHATSAPP_AUTOMATION_META_API_VERSION,
  WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_LANGUAGE,
  WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME,
  WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_LANGUAGE,
  WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME,
  WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID,
  WHATSAPP_AUTOMATION_META_TEST_RECIPIENT,
  WHATSAPP_AUTOMATION_STUDIO_LOCATION_LINE,
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
  onlyDigits,
  toIsoAfterSeconds,
  type WhatsAppNotificationJobType,
} from "./whatsapp-automation.helpers";
import {
  processMetaCloudWebhookStatusEvents,
  summarizeMetaWebhookNonMessageFields,
} from "./whatsapp-webhook-status";
import { processMetaCloudWebhookInboundMessages } from "./whatsapp-webhook-inbound";
import {
  sendMetaCloudTextMessage,
} from "./whatsapp-meta-client";
import {
  findNotificationJobByProviderMessageId,
  findPendingNotificationJobDuplicate,
  insertNotificationJob,
  listPendingNotificationJobsDue,
  updateNotificationJobStatus,
  type NotificationJobInsert,
  type NotificationJobRow,
} from "./repository";
import {
  buildAppointmentVoucherLink,
  buildButtonReplyAutoMessage,
  hasOpenCustomerServiceWindowForAppointment,
  sendMetaCloudCanceledAppointmentSessionMessage,
  sendMetaCloudCreatedAppointmentTemplate,
  sendMetaCloudReminderAppointmentTemplate,
  type DeliveryResult,
} from "./whatsapp-automation-appointments";

type QueueSource = "admin_create" | "public_booking" | "admin_cancel";

interface ScheduleLifecycleParams {
  tenantId: string;
  appointmentId: string;
  startTimeIso: string;
  source: QueueSource;
}

interface ScheduleCanceledParams {
  tenantId: string;
  appointmentId: string;
  source: QueueSource;
  notifyClient?: boolean;
}

interface ProcessJobsParams {
  limit?: number;
  appointmentId?: string;
  jobId?: string;
  type?: WhatsAppNotificationJobType;
}

interface ProcessSummary {
  enabled: boolean;
  mode: "disabled" | "dry_run" | "enabled";
  queuedEnabled: boolean;
  totalScanned: number;
  sent: number;
  failed: number;
  skipped: number;
  results: Array<{
    jobId: string;
    appointmentId: string | null;
    type: string;
    status: "sent" | "failed" | "skipped";
    reason?: string;
  }>;
}

type LocalPollerState = {
  started: boolean;
  running: boolean;
  timer: NodeJS.Timeout | null;
};

async function logAppointmentAutomationMessage(params: {
  tenantId: string;
  appointmentId: string | null;
  type: string;
  status: string;
  payload: Json;
  sentAt?: string | null;
}) {
  if (!params.appointmentId) return;
  const supabase = createServiceClient();
  const { error } = await supabase.from("appointment_messages").insert({
    appointment_id: params.appointmentId,
    tenant_id: params.tenantId,
    type: params.type,
    status: params.status,
    payload: params.payload,
    sent_at: params.sentAt ?? null,
  });
  if (error) {
    console.error("[whatsapp-automation] Falha ao registrar log de mensagem:", error);
  }
}

async function enqueueNotificationJobWithAutomationGuard(payload: NotificationJobInsert & { source: QueueSource }) {
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
    type: buildMessageTypeFromJobType(payload.type as WhatsAppNotificationJobType),
    status: "queued_auto",
    payload: enrichedPayload,
  });

  // Modo de teste/local: processa automaticamente apenas o job recém-criado,
  // evitando varrer backlog inteiro e reduzindo risco de spam.
  if (
    WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE &&
    WHATSAPP_AUTOMATION_MODE !== "disabled" &&
    insertedJob?.id
  ) {
    try {
      await processPendingWhatsAppNotificationJobs({
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

export async function scheduleAppointmentLifecycleNotifications(params: ScheduleLifecycleParams) {
  const nowIso = new Date().toISOString();
  const reminderDate = new Date(params.startTimeIso);
  reminderDate.setHours(reminderDate.getHours() - 24);

  await enqueueNotificationJobWithAutomationGuard({
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
  });

  await enqueueNotificationJobWithAutomationGuard({
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
  });
}

export async function scheduleAppointmentCanceledNotification(params: ScheduleCanceledParams) {
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

  await enqueueNotificationJobWithAutomationGuard({
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
  });
}

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

export function getWhatsAppAutomationRuntimeConfig() {
  return {
    mode: WHATSAPP_AUTOMATION_MODE,
    provider: WHATSAPP_AUTOMATION_PROVIDER,
    queueEnabled: WHATSAPP_AUTOMATION_QUEUE_ENABLED,
    autoDispatchOnQueue: WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE,
    batchLimit: WHATSAPP_AUTOMATION_BATCH_LIMIT,
    maxRetries: WHATSAPP_AUTOMATION_MAX_RETRIES,
    retryBaseDelaySeconds: WHATSAPP_AUTOMATION_RETRY_BASE_DELAY_SECONDS,
    localPollerEnabled: WHATSAPP_AUTOMATION_LOCAL_POLLER_ENABLED,
    localPollerIntervalSeconds: WHATSAPP_AUTOMATION_LOCAL_POLLER_INTERVAL_SECONDS,
    allowedTenantIdsCount: WHATSAPP_AUTOMATION_ALLOWED_TENANT_IDS.length,
    meta: {
      apiVersion: WHATSAPP_AUTOMATION_META_API_VERSION,
      phoneNumberIdConfigured: Boolean(WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID),
      accessTokenConfigured: Boolean(WHATSAPP_AUTOMATION_META_ACCESS_TOKEN),
      testRecipientConfigured: Boolean(onlyDigits(WHATSAPP_AUTOMATION_META_TEST_RECIPIENT)),
      createdTemplateName: WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME,
      createdTemplateLanguage: WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_LANGUAGE,
      reminderTemplateName: WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME,
      reminderTemplateLanguage: WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_LANGUAGE,
      studioLocationLineConfigured: Boolean(WHATSAPP_AUTOMATION_STUDIO_LOCATION_LINE),
    },
  };
}

function getLocalPollerState(): LocalPollerState {
  const globalRef = globalThis as typeof globalThis & {
    __whatsappAutomationLocalPollerState?: LocalPollerState;
  };
  if (!globalRef.__whatsappAutomationLocalPollerState) {
    globalRef.__whatsappAutomationLocalPollerState = {
      started: false,
      running: false,
      timer: null,
    };
  }
  return globalRef.__whatsappAutomationLocalPollerState;
}

function startLocalWhatsAppAutomationPollerIfNeeded() {
  if (typeof window !== "undefined") return;
  if (!WHATSAPP_AUTOMATION_LOCAL_POLLER_ENABLED) return;
  if (process.env.NODE_ENV === "production") return;

  const state = getLocalPollerState();
  if (state.started) return;
  state.started = true;

  const intervalMs = Math.max(5, WHATSAPP_AUTOMATION_LOCAL_POLLER_INTERVAL_SECONDS) * 1000;
  state.timer = setInterval(async () => {
    if (state.running) return;
    if (WHATSAPP_AUTOMATION_MODE === "disabled") return;
    state.running = true;
    try {
      const summary = await processPendingWhatsAppNotificationJobs({ limit: 5 });
      if (summary.sent > 0 || summary.failed > 0) {
        console.log(
          `[whatsapp-automation] Local poller processou jobs: sent=${summary.sent} failed=${summary.failed} skipped=${summary.skipped}`
        );
      }
    } catch (error) {
      console.error("[whatsapp-automation] Falha no local poller:", error);
    } finally {
      state.running = false;
    }
  }, intervalMs);
  state.timer.unref?.();

  console.log(
    `[whatsapp-automation] Local poller ativo (${WHATSAPP_AUTOMATION_LOCAL_POLLER_INTERVAL_SECONDS}s) para jobs agendados.`
  );
}

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

startLocalWhatsAppAutomationPollerIfNeeded();
