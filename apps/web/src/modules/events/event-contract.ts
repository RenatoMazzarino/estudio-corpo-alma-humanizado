import type { Json } from "../../../lib/supabase/types";

export type CanonicalEventType =
  | "appointment.created"
  | "appointment.updated"
  | "appointment.canceled"
  | "payment.created"
  | "payment.status_changed"
  | "whatsapp.job.queued"
  | "whatsapp.job.status_changed"
  | "whatsapp.template.status_changed"
  | "whatsapp.template.quality_changed"
  | "reminder.customer_response";

export type CanonicalEventEnvelope = {
  event_id: string;
  event_type: CanonicalEventType;
  event_version: number;
  occurred_at: string;
  source_module: string;
  correlation_id: string;
  tenant_id: string;
  payload: Json;
  idempotency_key: string;
  processing_status: "pending" | "processing" | "processed" | "failed" | "dead";
};

export const EVENT_SCHEMA_VERSION = 1;
