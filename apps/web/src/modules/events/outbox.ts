import { createServiceClient } from "../../../lib/supabase/service";
import type { Json } from "../../../lib/supabase/types";
import { EVENT_SCHEMA_VERSION, type CanonicalEventType } from "./event-contract";

type OutboxInsert = {
  tenant_id: string;
  event_id: string;
  event_type: CanonicalEventType;
  event_version: number;
  source_module: string;
  correlation_id: string;
  idempotency_key: string;
  payload: Json;
  processing_status: "pending" | "processing" | "processed" | "failed" | "dead";
  available_at: string;
};

const asOutboxClient = () =>
  createServiceClient() as unknown as {
    from: (table: "notification_event_outbox") => {
      insert: (value: OutboxInsert) => {
        select: (columns: string) => {
          maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
        };
      };
    };
  };

const nowIso = () => new Date().toISOString();

const normalizeText = (value: string | null | undefined) => value?.trim() ?? "";

export function createEventCorrelationId(prefix: string) {
  const cleanPrefix = normalizeText(prefix) || "evt";
  return `${cleanPrefix}_${crypto.randomUUID()}`;
}

type EmitDomainEventParams = {
  tenantId: string;
  eventType: CanonicalEventType;
  sourceModule: string;
  payload: Json;
  correlationId: string;
  idempotencyKey: string;
  availableAt?: string;
  eventId?: string;
  eventVersion?: number;
};

export async function emitDomainEventToOutbox(params: EmitDomainEventParams) {
  const tenantId = normalizeText(params.tenantId);
  const sourceModule = normalizeText(params.sourceModule);
  const correlationId = normalizeText(params.correlationId);
  const idempotencyKey = normalizeText(params.idempotencyKey);

  if (!tenantId) {
    throw new Error("tenantId é obrigatório para emitir evento no outbox.");
  }
  if (!sourceModule) {
    throw new Error("sourceModule é obrigatório para emitir evento no outbox.");
  }
  if (!correlationId) {
    throw new Error("correlationId é obrigatório para emitir evento no outbox.");
  }
  if (!idempotencyKey) {
    throw new Error("idempotencyKey é obrigatório para emitir evento no outbox.");
  }

  const supabase = asOutboxClient();
  const eventId = normalizeText(params.eventId) || crypto.randomUUID();
  const availableAt = normalizeText(params.availableAt) || nowIso();
  const eventVersion =
    typeof params.eventVersion === "number" && Number.isFinite(params.eventVersion) && params.eventVersion > 0
      ? Math.trunc(params.eventVersion)
      : EVENT_SCHEMA_VERSION;

  const { data, error } = await supabase
    .from("notification_event_outbox")
    .insert({
      tenant_id: tenantId,
      event_id: eventId,
      event_type: params.eventType,
      event_version: eventVersion,
      source_module: sourceModule,
      correlation_id: correlationId,
      idempotency_key: idempotencyKey,
      payload: params.payload,
      processing_status: "pending",
      available_at: availableAt,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    const message = error.message || "Falha ao inserir evento no outbox.";
    // Duplicidade por idempotency/event_id: trata como sucesso idempotente.
    const normalized = message.toLowerCase();
    if (normalized.includes("duplicate") || normalized.includes("unique")) {
      return {
        ok: true as const,
        duplicate: true as const,
        outboxId: null,
        eventId,
      };
    }
    throw new Error(message);
  }

  return {
    ok: true as const,
    duplicate: false as const,
    outboxId: data?.id ?? null,
    eventId,
  };
}
