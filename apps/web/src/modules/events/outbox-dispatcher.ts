import { isFeatureEnabled } from "../../shared/feature-flags";
import { createServiceClient } from "../../../lib/supabase/service";
import type { Json } from "../../../lib/supabase/types";
import { listEnabledPushExternalIdsForEvent, insertPushDeliveryAttempt } from "../push/push-repository";
import { isPushNotificationsEnabled } from "../push/push-config";
import { sendPushViaOneSignal } from "../push/onesignal-server";
import { buildPushMessageForEvent } from "./push-message-mapper";

type OutboxRow = {
  id: string;
  tenant_id: string;
  event_id: string;
  event_type: string;
  event_version: number;
  source_module: string;
  correlation_id: string;
  idempotency_key: string;
  payload: Record<string, unknown> | null;
  processing_status: "pending" | "processing" | "processed" | "failed" | "dead";
  available_at: string;
  attempts: number;
  processed_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

type DispatchSummary = {
  scanned: number;
  processed: number;
  skipped: number;
  failed: number;
  dead: number;
  results: Array<{
    outboxId: string;
    eventType: string;
    status: "processed" | "skipped" | "failed" | "dead";
    detail: string;
  }>;
};

const MAX_ATTEMPTS = 8;
const BASE_RETRY_SECONDS = 30;

type BasicError = { message?: string } | null;

type QueryRowsResult<T> = Promise<{ data: T[] | null; error: BasicError }>;
type QuerySingleResult<T> = Promise<{ data: T | null; error: BasicError }>;
type MutationResult = Promise<{ error: BasicError }>;

type EventDispatcherQuery<T = Record<string, unknown>> = {
  in: (column: string, values: unknown[]) => EventDispatcherQuery<T>;
  lte: (column: string, value: string) => EventDispatcherQuery<T>;
  order: (column: string, options?: { ascending?: boolean }) => EventDispatcherQuery<T>;
  limit: (value: number) => QueryRowsResult<T>;
  eq: (column: string, value: unknown) => EventDispatcherQuery<T>;
  maybeSingle: () => QuerySingleResult<T>;
};

type EventDispatcherTable = {
  select: (columns: string) => EventDispatcherQuery;
  insert: (payload: unknown) => MutationResult;
  update: (payload: unknown) => { eq: (column: string, value: unknown) => MutationResult };
};

type EventDispatcherClient = {
  from: (table: string) => EventDispatcherTable;
};

const asEventClient = () => createServiceClient() as unknown as EventDispatcherClient;

const toJson = (value: unknown): Json => JSON.parse(JSON.stringify(value ?? null)) as Json;

const delaySeconds = (attempt: number) => {
  const safeAttempt = Math.max(1, Math.min(10, attempt));
  return BASE_RETRY_SECONDS * 2 ** (safeAttempt - 1);
};

const toIsoAfterSeconds = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();

async function insertDispatchLog(params: {
  tenantId: string;
  outboxId: string;
  eventId: string;
  eventType: string;
  correlationId: string;
  channel: "push" | "system";
  status: "success" | "failed" | "skipped";
  target?: string | null;
  durationMs?: number | null;
  attempt: number;
  responsePayload?: Record<string, unknown> | null;
  errorMessage?: string | null;
}) {
  const supabase = asEventClient();
  await supabase.from("notification_dispatch_logs").insert({
    tenant_id: params.tenantId,
    outbox_id: params.outboxId,
    event_id: params.eventId,
    event_type: params.eventType,
    channel: params.channel,
    status: params.status,
    target: params.target ?? null,
    duration_ms: params.durationMs ?? null,
    attempt: params.attempt,
    correlation_id: params.correlationId,
    response_payload: params.responsePayload ?? null,
    error_message: params.errorMessage ?? null,
  });
}

async function markOutboxProcessed(outboxId: string) {
  const supabase = asEventClient();
  await supabase
    .from("notification_event_outbox")
    .update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_error: null,
      last_error_at: null,
    })
    .eq("id", outboxId);
}

async function markOutboxForRetry(params: {
  outboxId: string;
  attempts: number;
  errorMessage: string;
}) {
  const supabase = asEventClient();
  const nextRetryAt = toIsoAfterSeconds(delaySeconds(params.attempts));
  await supabase
    .from("notification_event_outbox")
    .update({
      processing_status: "failed",
      attempts: params.attempts,
      available_at: nextRetryAt,
      last_error: params.errorMessage,
      last_error_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.outboxId);
}

async function moveOutboxToDeadLetter(params: {
  event: OutboxRow;
  errorMessage: string;
  attempts: number;
}) {
  const supabase = asEventClient();
  await supabase.from("notification_dead_letter_queue").insert({
    tenant_id: params.event.tenant_id,
    outbox_id: params.event.id,
    event_id: params.event.event_id,
    event_type: params.event.event_type,
    payload: params.event.payload ?? {},
    correlation_id: params.event.correlation_id,
    failed_attempts: params.attempts,
    error_message: params.errorMessage,
    metadata: {
      source_module: params.event.source_module,
      idempotency_key: params.event.idempotency_key,
    },
  });

  await supabase
    .from("notification_event_outbox")
    .update({
      processing_status: "dead",
      attempts: params.attempts,
      last_error: params.errorMessage,
      last_error_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.event.id);
}

async function loadPendingOutbox(limit: number) {
  const supabase = asEventClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("notification_event_outbox")
    .select(
      "id, tenant_id, event_id, event_type, event_version, source_module, correlation_id, idempotency_key, payload, processing_status, available_at, attempts, processed_at, last_error, created_at, updated_at"
    )
    .in("processing_status", ["pending", "failed"])
    .lte("available_at", nowIso)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Falha ao carregar outbox pendente: ${error.message}`);
  }
  return (data ?? []) as OutboxRow[];
}

export async function processNotificationOutbox(params?: { limit?: number }) {
  const summary: DispatchSummary = {
    scanned: 0,
    processed: 0,
    skipped: 0,
    failed: 0,
    dead: 0,
    results: [],
  };

  const limit = Math.max(1, Math.min(params?.limit ?? 20, 100));
  const events = await loadPendingOutbox(limit);
  summary.scanned = events.length;

  for (const event of events) {
    if (!isFeatureEnabled("FF_EDGE_DISPATCHER_V2", { key: event.tenant_id })) {
      summary.skipped += 1;
      summary.results.push({
        outboxId: event.id,
        eventType: event.event_type,
        status: "skipped",
        detail: "Dispatcher V2 desabilitado por feature flag.",
      });
      continue;
    }

    const nextAttempt = Math.max(1, event.attempts + 1);
    const start = Date.now();

    try {
      const pushMessage = buildPushMessageForEvent({
        eventType: event.event_type,
        payload: event.payload,
      });
      if (!pushMessage) {
        await markOutboxProcessed(event.id);
        await insertDispatchLog({
          tenantId: event.tenant_id,
          outboxId: event.id,
          eventId: event.event_id,
          eventType: event.event_type,
          correlationId: event.correlation_id,
          channel: "system",
          status: "skipped",
          attempt: nextAttempt,
          errorMessage: "Evento sem rota de dispatch ativa.",
        });
        summary.skipped += 1;
        summary.results.push({
          outboxId: event.id,
          eventType: event.event_type,
          status: "skipped",
          detail: "Evento sem rota de dispatch ativa.",
        });
        continue;
      }

      if (!isPushNotificationsEnabled(event.tenant_id)) {
        await markOutboxProcessed(event.id);
        await insertDispatchLog({
          tenantId: event.tenant_id,
          outboxId: event.id,
          eventId: event.event_id,
          eventType: event.event_type,
          correlationId: event.correlation_id,
          channel: "push",
          status: "skipped",
          attempt: nextAttempt,
          errorMessage: "Push desabilitado por feature flag.",
        });
        summary.skipped += 1;
        summary.results.push({
          outboxId: event.id,
          eventType: event.event_type,
          status: "skipped",
          detail: "Push desabilitado por feature flag.",
        });
        continue;
      }

      const externalIds = await listEnabledPushExternalIdsForEvent({
        tenantId: event.tenant_id,
        eventType: event.event_type,
      });

      const dispatch = await sendPushViaOneSignal({
        externalIds,
        heading: pushMessage.heading,
        message: pushMessage.message,
        url: pushMessage.url,
        data: {
          event_type: event.event_type,
          event_id: event.event_id,
          correlation_id: event.correlation_id,
        },
      });

      await insertPushDeliveryAttempt({
        tenantId: event.tenant_id,
        outboxId: event.id,
        eventId: event.event_id,
        eventType: event.event_type,
        correlationId: event.correlation_id,
        status: dispatch.skipped ? "queued" : "success",
        providerMessageId: dispatch.providerMessageId,
        requestPayload: {
          external_ids_count: externalIds.length,
          heading: pushMessage.heading,
          message: pushMessage.message,
          url: pushMessage.url,
        },
        responsePayload:
          dispatch.response && typeof dispatch.response === "object"
            ? toJson(dispatch.response)
            : null,
        attempt: nextAttempt,
      });

      await markOutboxProcessed(event.id);
      await insertDispatchLog({
        tenantId: event.tenant_id,
        outboxId: event.id,
        eventId: event.event_id,
        eventType: event.event_type,
        correlationId: event.correlation_id,
        channel: "push",
        status: "success",
        attempt: nextAttempt,
        durationMs: Date.now() - start,
        target: externalIds.length > 0 ? `external_ids:${externalIds.length}` : "none",
        responsePayload:
          dispatch.response && typeof dispatch.response === "object"
            ? (dispatch.response as Record<string, unknown>)
            : null,
      });

      summary.processed += 1;
      summary.results.push({
        outboxId: event.id,
        eventType: event.event_type,
        status: "processed",
        detail: dispatch.skipped
          ? "Sem inscritos ativos para push (evento processado)."
          : "Push enviado com sucesso.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Falha desconhecida no dispatcher.";
      await insertPushDeliveryAttempt({
        tenantId: event.tenant_id,
        outboxId: event.id,
        eventId: event.event_id,
        eventType: event.event_type,
        correlationId: event.correlation_id,
        status: nextAttempt >= MAX_ATTEMPTS ? "dead" : "failed",
        errorMessage,
        attempt: nextAttempt,
      });
      await insertDispatchLog({
        tenantId: event.tenant_id,
        outboxId: event.id,
        eventId: event.event_id,
        eventType: event.event_type,
        correlationId: event.correlation_id,
        channel: "push",
        status: "failed",
        attempt: nextAttempt,
        durationMs: Date.now() - start,
        errorMessage,
      });

      if (nextAttempt >= MAX_ATTEMPTS) {
        await moveOutboxToDeadLetter({
          event,
          errorMessage,
          attempts: nextAttempt,
        });
        summary.dead += 1;
        summary.results.push({
          outboxId: event.id,
          eventType: event.event_type,
          status: "dead",
          detail: `Evento movido para DLQ após ${nextAttempt} tentativas.`,
        });
      } else {
        await markOutboxForRetry({
          outboxId: event.id,
          attempts: nextAttempt,
          errorMessage,
        });
        summary.failed += 1;
        summary.results.push({
          outboxId: event.id,
          eventType: event.event_type,
          status: "failed",
          detail: `Falha na tentativa ${nextAttempt}/${MAX_ATTEMPTS}: ${errorMessage}`,
        });
      }
    }
  }

  return summary;
}
