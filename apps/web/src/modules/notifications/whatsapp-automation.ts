import { createServiceClient } from "../../../lib/supabase/service";
import type { Json } from "../../../lib/supabase/types";
import {
  WHATSAPP_AUTOMATION_ALLOWED_TENANT_IDS,
  WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE,
  WHATSAPP_AUTOMATION_BATCH_LIMIT,
  WHATSAPP_AUTOMATION_MAX_RETRIES,
  WHATSAPP_AUTOMATION_MODE,
  WHATSAPP_AUTOMATION_PROVIDER,
  WHATSAPP_AUTOMATION_QUEUE_ENABLED,
  WHATSAPP_AUTOMATION_RETRY_BASE_DELAY_SECONDS,
  isWhatsAppAutomationTenantAllowed,
  WHATSAPP_AUTOMATION_META_ACCESS_TOKEN,
  WHATSAPP_AUTOMATION_META_API_VERSION,
  WHATSAPP_AUTOMATION_META_HELLO_WORLD_TEMPLATE_LANGUAGE,
  WHATSAPP_AUTOMATION_META_HELLO_WORLD_TEMPLATE_NAME,
  WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID,
  WHATSAPP_AUTOMATION_META_TEST_RECIPIENT,
  WHATSAPP_AUTOMATION_META_USE_HELLO_WORLD_TEMPLATE,
} from "./automation-config";
import {
  findNotificationJobByProviderMessageId,
  findPendingNotificationJobDuplicate,
  insertNotificationJob,
  listPendingNotificationJobsDue,
  updateNotificationJobStatus,
  type NotificationJobInsert,
  type NotificationJobRow,
} from "./repository";

type WhatsAppNotificationJobType =
  | "appointment_created"
  | "appointment_canceled"
  | "appointment_reminder";

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

interface DeliveryResult {
  providerMessageId: string | null;
  deliveredAt: string;
  deliveryMode: string;
  messagePreview: string;
  providerResponse?: Record<string, unknown> | null;
}

type MetaWebhookStatusItem = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  conversation?: unknown;
  pricing?: unknown;
  errors?: unknown;
};

const isSupportedWhatsAppJobType = (value: string): value is WhatsAppNotificationJobType =>
  value === "appointment_created" || value === "appointment_canceled" || value === "appointment_reminder";

const asJsonObject = (value: Json | null | undefined): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

const getAutomationPayload = (payload: Json | null | undefined) => {
  const root = asJsonObject(payload);
  const automation = asJsonObject(root.automation as Json | undefined);
  return { root, automation };
};

const mergeJobPayload = (job: NotificationJobRow, patch: Record<string, unknown>): Json => {
  return {
    ...asJsonObject(job.payload),
    ...patch,
  } as Json;
};

const buildMessageTypeFromJobType = (type: WhatsAppNotificationJobType) => {
  switch (type) {
    case "appointment_created":
      return "auto_appointment_created";
    case "appointment_reminder":
      return "auto_appointment_reminder";
    case "appointment_canceled":
      return "auto_appointment_canceled";
    default:
      return "auto_notification";
  }
};

const buildAutomationMessagePreview = (job: NotificationJobRow) => {
  const payload = asJsonObject(job.payload);
  const startTime = typeof payload.start_time === "string" ? payload.start_time : null;
  switch (job.type) {
    case "appointment_created":
      return `Automação WhatsApp (agendamento criado)${startTime ? ` • ${startTime}` : ""}`;
    case "appointment_reminder":
      return `Automação WhatsApp (lembrete)${startTime ? ` • ${startTime}` : ""}`;
    case "appointment_canceled":
      return "Automação WhatsApp (agendamento cancelado)";
    default:
      return "Automação WhatsApp";
  }
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const parseJsonResponse = async (response: Response) => {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const isRetryableDeliveryError = (message: string) => {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("não configurado") ||
    normalized.includes("unauthorized") ||
    normalized.includes("token") ||
    normalized.includes("template") ||
    normalized.includes("verify token")
  ) {
    return false;
  }
  return true;
};

const computeRetryDelaySeconds = (attemptNumber: number) => {
  const base = Math.max(1, WHATSAPP_AUTOMATION_RETRY_BASE_DELAY_SECONDS);
  const multiplier = Math.max(1, Math.min(8, attemptNumber));
  return base * multiplier;
};

const toIsoAfterSeconds = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();

function getMetaCloudHelloWorldTestRecipient() {
  const recipient = onlyDigits(WHATSAPP_AUTOMATION_META_TEST_RECIPIENT);
  if (!recipient) {
    throw new Error(
      "WHATSAPP_AUTOMATION_META_TEST_RECIPIENT não configurado (use apenas dígitos com DDI, ex.: 5519...)."
    );
  }
  return recipient;
}

async function sendMetaCloudHelloWorldTemplate(job: NotificationJobRow): Promise<DeliveryResult> {
  if (!WHATSAPP_AUTOMATION_META_ACCESS_TOKEN) {
    throw new Error("WHATSAPP_AUTOMATION_META_ACCESS_TOKEN não configurado.");
  }
  if (!WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID) {
    throw new Error("WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID não configurado.");
  }

  const to = getMetaCloudHelloWorldTestRecipient();
  const url = `https://graph.facebook.com/${WHATSAPP_AUTOMATION_META_API_VERSION}/${WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID}/messages`;
  const requestBody = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: WHATSAPP_AUTOMATION_META_HELLO_WORLD_TEMPLATE_NAME,
      language: {
        code: WHATSAPP_AUTOMATION_META_HELLO_WORLD_TEMPLATE_LANGUAGE,
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_AUTOMATION_META_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    const message =
      typeof payload?.error === "object" &&
      payload.error &&
      "message" in payload.error &&
      typeof payload.error.message === "string"
        ? payload.error.message
        : `Meta WhatsApp API respondeu ${response.status}.`;
    throw new Error(message);
  }

  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const firstMessage = messages[0];
  const providerMessageId =
    firstMessage && typeof firstMessage === "object" && "id" in firstMessage && typeof firstMessage.id === "string"
      ? firstMessage.id
      : null;

  return {
    providerMessageId,
    deliveredAt: new Date().toISOString(),
    deliveryMode: "meta_cloud_test_hello_world",
    messagePreview: `Meta hello_world (${job.type}) -> ${to}`,
    providerResponse: payload,
  };
}

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

  const enrichedPayload = {
    ...asJsonObject(payload.payload ?? {}),
    automation: {
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
  await enqueueNotificationJobWithAutomationGuard({
    tenant_id: params.tenantId,
    appointment_id: params.appointmentId,
    type: "appointment_canceled",
    channel: "whatsapp",
    payload: {
      appointment_id: params.appointmentId,
    },
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

  if (WHATSAPP_AUTOMATION_META_USE_HELLO_WORLD_TEMPLATE) {
    return sendMetaCloudHelloWorldTemplate(job);
  }

  // Próxima etapa: template real baseado no tipo do job (created/reminder/canceled).
  throw new Error(
    "Provedor Meta configurado, mas o envio real por tipo de evento ainda não foi implementado. Ative WHATSAPP_AUTOMATION_META_USE_HELLO_WORLD_TEMPLATE=true para teste end-to-end."
  );
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
          delivery_mode: delivery.deliveryMode,
          provider_message_id: delivery.providerMessageId,
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
        const retryInSeconds = computeRetryDelaySeconds(nextRetryCount);
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
    allowedTenantIdsCount: WHATSAPP_AUTOMATION_ALLOWED_TENANT_IDS.length,
    meta: {
      helloWorldTestMode: WHATSAPP_AUTOMATION_META_USE_HELLO_WORLD_TEMPLATE,
      apiVersion: WHATSAPP_AUTOMATION_META_API_VERSION,
      phoneNumberIdConfigured: Boolean(WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID),
      accessTokenConfigured: Boolean(WHATSAPP_AUTOMATION_META_ACCESS_TOKEN),
      testRecipientConfigured: Boolean(onlyDigits(WHATSAPP_AUTOMATION_META_TEST_RECIPIENT)),
      helloWorldTemplateName: WHATSAPP_AUTOMATION_META_HELLO_WORLD_TEMPLATE_NAME,
      helloWorldTemplateLanguage: WHATSAPP_AUTOMATION_META_HELLO_WORLD_TEMPLATE_LANGUAGE,
    },
  };
}

function normalizeMetaStatus(status: string | undefined) {
  const value = (status ?? "").trim().toLowerCase();
  if (!value) return "unknown";
  return value;
}

function mapMetaStatusToAppointmentMessageStatus(status: string) {
  switch (status) {
    case "sent":
      return "provider_sent";
    case "delivered":
      return "provider_delivered";
    case "read":
      return "provider_read";
    case "failed":
      return "provider_failed";
    default:
      return `provider_${status}`;
  }
}

export async function processMetaCloudWebhookStatusEvents(payload: Record<string, unknown>) {
  const entryList = Array.isArray(payload.entry) ? payload.entry : [];
  let processed = 0;
  let matchedJobs = 0;
  let unmatched = 0;

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
        const { data: job, error: lookupError } = await findNotificationJobByProviderMessageId(providerMessageId);
        if (lookupError) {
          console.error("[whatsapp-automation] Falha ao localizar job por provider_message_id:", lookupError);
          continue;
        }
        if (!job) {
          unmatched += 1;
          continue;
        }
        matchedJobs += 1;

        const { automation } = getAutomationPayload(job.payload);
        const previousEvents = Array.isArray(automation.meta_status_events)
          ? (automation.meta_status_events as unknown[])
          : [];
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

        const nextPayload = mergeJobPayload(job, {
          automation: {
            ...automation,
            provider_delivery_status: normalizedStatus,
            provider_delivery_updated_at: new Date().toISOString(),
            meta_status_events: [...previousEvents, statusEvent].slice(-20),
          },
        });

        const { error: updateError } = await updateNotificationJobStatus({
          id: job.id,
          status: job.status as "pending" | "sent" | "failed",
          payload: nextPayload,
        });
        if (updateError) {
          console.error("[whatsapp-automation] Falha ao atualizar payload do job por status webhook:", updateError);
          continue;
        }

        await logAppointmentAutomationMessage({
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

  return { ok: true, processed, matchedJobs, unmatched };
}
