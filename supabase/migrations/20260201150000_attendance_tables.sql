-- G28: attendance v4 tables

CREATE TABLE IF NOT EXISTS appointment_attendances (
  appointment_id uuid PRIMARY KEY REFERENCES appointments(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid,
  current_stage text NOT NULL DEFAULT 'hub',
  pre_status text NOT NULL DEFAULT 'available',
  session_status text NOT NULL DEFAULT 'locked',
  checkout_status text NOT NULL DEFAULT 'locked',
  post_status text NOT NULL DEFAULT 'locked',
  confirmed_at timestamptz,
  confirmed_channel text,
  timer_status text NOT NULL DEFAULT 'idle',
  timer_started_at timestamptz,
  timer_paused_at timestamptz,
  paused_total_seconds integer NOT NULL DEFAULT 0,
  planned_seconds integer,
  actual_seconds integer NOT NULL DEFAULT 0,
  stage_lock_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_evolution_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid,
  version integer NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  summary text,
  complaint text,
  techniques text,
  recommendations text,
  sections_json jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_checkout (
  appointment_id uuid PRIMARY KEY REFERENCES appointments(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid,
  discount_type text,
  discount_value numeric(12,2),
  discount_reason text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_checkout_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid,
  type text NOT NULL,
  label text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  amount numeric(12,2) NOT NULL,
  metadata jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid,
  method text NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  provider_ref text,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_post (
  appointment_id uuid PRIMARY KEY REFERENCES appointments(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid,
  kpi_total_seconds integer NOT NULL DEFAULT 0,
  survey_status text NOT NULL DEFAULT 'not_sent',
  survey_score integer,
  follow_up_due_at timestamptz,
  follow_up_note text,
  post_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS appointment_evolution_entries_unique
  ON appointment_evolution_entries (appointment_id, version);

CREATE INDEX IF NOT EXISTS appointment_attendances_stage_idx
  ON appointment_attendances (current_stage);

CREATE INDEX IF NOT EXISTS appointment_attendances_timer_idx
  ON appointment_attendances (timer_status);

CREATE INDEX IF NOT EXISTS appointment_attendances_confirmed_idx
  ON appointment_attendances (confirmed_at);

CREATE INDEX IF NOT EXISTS appointment_checklist_items_order_idx
  ON appointment_checklist_items (appointment_id, sort_order);

CREATE INDEX IF NOT EXISTS appointment_checklist_items_completed_idx
  ON appointment_checklist_items (appointment_id, completed_at);

CREATE INDEX IF NOT EXISTS appointment_evolution_entries_status_idx
  ON appointment_evolution_entries (appointment_id, status);

CREATE INDEX IF NOT EXISTS appointment_checkout_items_order_idx
  ON appointment_checkout_items (appointment_id, sort_order);

CREATE INDEX IF NOT EXISTS appointment_payments_status_idx
  ON appointment_payments (appointment_id, status);

CREATE INDEX IF NOT EXISTS appointment_events_idx
  ON appointment_events (appointment_id, created_at DESC);

ALTER TABLE appointment_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_evolution_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_checkout ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_checkout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_post ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin appointment_attendances access" ON appointment_attendances;
CREATE POLICY "Admin appointment_attendances access" ON appointment_attendances
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

DROP POLICY IF EXISTS "Admin appointment_checklist_items access" ON appointment_checklist_items;
CREATE POLICY "Admin appointment_checklist_items access" ON appointment_checklist_items
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

DROP POLICY IF EXISTS "Admin appointment_evolution_entries access" ON appointment_evolution_entries;
CREATE POLICY "Admin appointment_evolution_entries access" ON appointment_evolution_entries
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

DROP POLICY IF EXISTS "Admin appointment_checkout access" ON appointment_checkout;
CREATE POLICY "Admin appointment_checkout access" ON appointment_checkout
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

DROP POLICY IF EXISTS "Admin appointment_checkout_items access" ON appointment_checkout_items;
CREATE POLICY "Admin appointment_checkout_items access" ON appointment_checkout_items
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

DROP POLICY IF EXISTS "Admin appointment_payments access" ON appointment_payments;
CREATE POLICY "Admin appointment_payments access" ON appointment_payments
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

DROP POLICY IF EXISTS "Admin appointment_post access" ON appointment_post;
CREATE POLICY "Admin appointment_post access" ON appointment_post
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

DROP POLICY IF EXISTS "Admin appointment_events access" ON appointment_events;
CREATE POLICY "Admin appointment_events access" ON appointment_events
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);
