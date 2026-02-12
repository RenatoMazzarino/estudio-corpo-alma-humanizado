-- G67: tornar conflito de upsert estável em appointment_payments
-- Troca índice parcial por índice único completo para permitir ON CONFLICT(provider_ref, tenant_id)

WITH ranked_duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id, provider_ref
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.appointment_payments
  WHERE provider_ref IS NOT NULL
)
DELETE FROM public.appointment_payments ap
USING ranked_duplicates rd
WHERE ap.id = rd.id
  AND rd.rn > 1;

DROP INDEX IF EXISTS public.appointment_payments_provider_ref_unique;

CREATE UNIQUE INDEX IF NOT EXISTS appointment_payments_provider_ref_unique
  ON public.appointment_payments (provider_ref, tenant_id);
