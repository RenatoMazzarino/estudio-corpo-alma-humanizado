ALTER TABLE public.appointment_payments
  ADD COLUMN IF NOT EXISTS provider_order_id text,
  ADD COLUMN IF NOT EXISTS point_terminal_id text,
  ADD COLUMN IF NOT EXISTS card_mode text;

CREATE INDEX IF NOT EXISTS idx_appointment_payments_tenant_provider_order_id
  ON public.appointment_payments (tenant_id, provider_order_id);

CREATE INDEX IF NOT EXISTS idx_appointment_payments_tenant_appointment_created_desc
  ON public.appointment_payments (tenant_id, appointment_id, created_at DESC);

