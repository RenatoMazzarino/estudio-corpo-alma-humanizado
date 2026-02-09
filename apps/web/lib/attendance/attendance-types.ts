export type StageKey = "hub" | "pre" | "session" | "checkout" | "post";
export type StageStatus = "locked" | "available" | "in_progress" | "done" | "skipped";
export type TimerStatus = "idle" | "running" | "paused" | "finished";

export interface AttendanceRow {
  appointment_id: string;
  tenant_id?: string;
  current_stage: StageKey;
  pre_status: StageStatus;
  session_status: StageStatus;
  checkout_status: StageStatus;
  post_status: StageStatus;
  confirmed_at: string | null;
  confirmed_channel: string | null;
  timer_status: TimerStatus;
  timer_started_at: string | null;
  timer_paused_at: string | null;
  paused_total_seconds: number;
  planned_seconds: number | null;
  actual_seconds: number;
  stage_lock_reason: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ChecklistItem {
  id: string;
  appointment_id: string;
  tenant_id?: string;
  label: string;
  sort_order: number;
  completed_at: string | null;
  source: string | null;
  created_at: string | null;
}

export interface EvolutionEntry {
  id: string;
  appointment_id: string;
  tenant_id?: string;
  version: number;
  status: "draft" | "published";
  summary: string | null;
  complaint: string | null;
  techniques: string | null;
  recommendations: string | null;
  sections_json: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export interface CheckoutRow {
  appointment_id: string;
  tenant_id?: string;
  discount_type: "value" | "pct" | null;
  discount_value: number | null;
  discount_reason: string | null;
  subtotal: number;
  total: number;
  payment_status: "pending" | "partial" | "paid" | "failed" | "void";
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckoutItem {
  id: string;
  appointment_id: string;
  tenant_id?: string;
  type: "service" | "fee" | "addon" | "adjustment";
  label: string;
  qty: number;
  amount: number;
  metadata: Record<string, unknown> | null;
  sort_order: number;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  appointment_id: string;
  tenant_id?: string;
  method: "pix" | "card" | "cash" | "other";
  amount: number;
  status: "pending" | "paid" | "failed" | "refunded";
  paid_at: string | null;
  provider_ref: string | null;
  transaction_id: string | null;
  created_at: string;
}

export interface PostRow {
  appointment_id: string;
  tenant_id?: string;
  kpi_total_seconds: number;
  survey_status: "not_sent" | "sent" | "answered";
  survey_score: number | null;
  follow_up_due_at: string | null;
  follow_up_note: string | null;
  post_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MessageType = "created_confirmation" | "reminder_24h" | "post_survey";
export type MessageStatus = "drafted" | "sent_manual" | "sent_auto" | "delivered" | "failed";

export interface AppointmentMessage {
  id: string;
  appointment_id: string;
  tenant_id?: string;
  type: MessageType;
  status: MessageStatus;
  payload: Record<string, unknown> | null;
  sent_at: string | null;
  created_at: string;
}

export interface AppointmentEvent {
  id: string;
  appointment_id: string;
  tenant_id?: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export interface AppointmentDetails {
  id: string;
  service_name: string;
  start_time: string;
  finished_at: string | null;
  status: string | null;
  payment_status?: string | null;
  price: number | null;
  is_home_visit?: boolean | null;
  service_duration_minutes?: number | null;
  total_duration_minutes?: number | null;
  actual_duration_minutes?: number | null;
  internal_notes?: string | null;
  address_cep?: string | null;
  address_logradouro?: string | null;
  address_numero?: string | null;
  address_complemento?: string | null;
  address_bairro?: string | null;
  address_cidade?: string | null;
  address_estado?: string | null;
  clients: {
    id: string;
    name: string;
    initials: string | null;
    avatar_url?: string | null;
    is_vip?: boolean | null;
    phone?: string | null;
    health_tags?: string[] | null;
    endereco_completo?: string | null;
    address_cep?: string | null;
    address_logradouro?: string | null;
    address_numero?: string | null;
    address_complemento?: string | null;
    address_bairro?: string | null;
    address_cidade?: string | null;
    address_estado?: string | null;
  } | null;
}

export interface AttendanceOverview {
  appointment: AppointmentDetails;
  attendance: AttendanceRow;
  checklist: ChecklistItem[];
  evolution: EvolutionEntry[];
  checkout: CheckoutRow | null;
  checkoutItems: CheckoutItem[];
  payments: PaymentRow[];
  post: PostRow | null;
  messages: AppointmentMessage[];
  events: AppointmentEvent[];
}

export interface AttendanceTotals {
  subtotal: number;
  total: number;
}
