ALTER TABLE appointment_payments
  ADD COLUMN IF NOT EXISTS payment_method_id text,
  ADD COLUMN IF NOT EXISTS installments integer,
  ADD COLUMN IF NOT EXISTS card_last4 text,
  ADD COLUMN IF NOT EXISTS card_brand text,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS appointment_payments_provider_ref_unique
  ON appointment_payments (provider_ref, tenant_id)
  WHERE provider_ref IS NOT NULL;
