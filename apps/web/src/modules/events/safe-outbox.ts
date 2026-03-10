import { isFeatureEnabled } from "../../shared/feature-flags";
import { emitDomainEventToOutbox } from "./outbox";
import type { CanonicalEventType } from "./event-contract";
import type { Json } from "../../../lib/supabase/types";

type SafeEmitParams = {
  tenantId: string;
  eventType: CanonicalEventType;
  sourceModule: string;
  payload: Json;
  correlationId: string;
  idempotencyKey: string;
  availableAt?: string;
};

export async function safeEmitDomainEventToOutbox(params: SafeEmitParams) {
  if (!isFeatureEnabled("FF_EDGE_DISPATCHER_V2", { key: params.tenantId })) {
    return { emitted: false as const, reason: "feature_flag_off" as const };
  }

  try {
    const result = await emitDomainEventToOutbox({
      tenantId: params.tenantId,
      eventType: params.eventType,
      sourceModule: params.sourceModule,
      payload: params.payload,
      correlationId: params.correlationId,
      idempotencyKey: params.idempotencyKey,
      availableAt: params.availableAt,
    });

    return {
      emitted: true as const,
      duplicate: result.duplicate,
      outboxId: result.outboxId,
      eventId: result.eventId,
    };
  } catch (error) {
    console.error("[event-outbox] Falha ao emitir evento (seguindo fluxo sem bloquear):", error);
    return {
      emitted: false as const,
      reason: "emit_failed" as const,
    };
  }
}
