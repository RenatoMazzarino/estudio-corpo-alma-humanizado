-- Refactor do modelo de status de atendimento:
-- 1) remove status por etapa (legado),
-- 2) simplifica evolução para 1 registro por sessão,
-- 3) remove status paralelo no checkout,
-- 4) adiciona controle explícito de sinal na tabela appointments.

-- 1) Controle de sinal no agendamento.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS signal_status text,
  ADD COLUMN IF NOT EXISTS signal_required_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS signal_paid_amount numeric(12,2);

UPDATE public.appointments
SET
  signal_required_amount = GREATEST(COALESCE(signal_required_amount, 0), 0),
  signal_paid_amount = GREATEST(COALESCE(signal_paid_amount, 0), 0);

UPDATE public.appointments
SET signal_status = CASE
  WHEN payment_status = 'refunded' AND COALESCE(signal_paid_amount, 0) > 0 THEN 'refunded'
  WHEN COALESCE(signal_required_amount, 0) <= 0 THEN 'waived'
  WHEN COALESCE(signal_paid_amount, 0) >= COALESCE(signal_required_amount, 0) THEN 'paid'
  ELSE 'pending'
END
WHERE signal_status IS NULL
   OR signal_status NOT IN ('pending', 'paid', 'waived', 'refunded');

ALTER TABLE public.appointments
  ALTER COLUMN signal_status SET DEFAULT 'waived',
  ALTER COLUMN signal_required_amount SET DEFAULT 0,
  ALTER COLUMN signal_paid_amount SET DEFAULT 0;

ALTER TABLE public.appointments
  ALTER COLUMN signal_status SET NOT NULL,
  ALTER COLUMN signal_required_amount SET NOT NULL,
  ALTER COLUMN signal_paid_amount SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_signal_status_check'
      AND conrelid = 'public.appointments'::regclass
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_signal_status_check
      CHECK (signal_status IN ('pending', 'paid', 'waived', 'refunded'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_signal_required_amount_non_negative_check'
      AND conrelid = 'public.appointments'::regclass
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_signal_required_amount_non_negative_check
      CHECK (signal_required_amount >= 0);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_signal_paid_amount_non_negative_check'
      AND conrelid = 'public.appointments'::regclass
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_signal_paid_amount_non_negative_check
      CHECK (signal_paid_amount >= 0);
  END IF;
END
$$;

-- 2) Evolução simplificada para 1 linha por atendimento.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY appointment_id
      ORDER BY created_at DESC, id DESC
    ) AS row_num
  FROM public.appointment_evolution_entries
)
DELETE FROM public.appointment_evolution_entries target
USING ranked
WHERE target.id = ranked.id
  AND ranked.row_num > 1;

DROP INDEX IF EXISTS public.appointment_evolution_entries_unique;
DROP INDEX IF EXISTS public.appointment_evolution_entries_status_idx;

ALTER TABLE public.appointment_evolution_entries
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS status;

CREATE UNIQUE INDEX IF NOT EXISTS appointment_evolution_entries_appointment_unique
  ON public.appointment_evolution_entries (appointment_id);

-- 3) Remove legado por etapa do attendance.
DROP INDEX IF EXISTS public.appointment_attendances_stage_idx;

ALTER TABLE public.appointment_attendances
  DROP COLUMN IF EXISTS current_stage,
  DROP COLUMN IF EXISTS pre_status,
  DROP COLUMN IF EXISTS session_status,
  DROP COLUMN IF EXISTS checkout_status,
  DROP COLUMN IF EXISTS post_status,
  DROP COLUMN IF EXISTS stage_lock_reason,
  DROP COLUMN IF EXISTS confirmed_channel;

-- 4) Remove status paralelo no checkout.
ALTER TABLE public.appointment_checkout
  DROP COLUMN IF EXISTS payment_status;
