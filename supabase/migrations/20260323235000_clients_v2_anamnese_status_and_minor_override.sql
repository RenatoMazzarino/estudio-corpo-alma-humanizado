-- Extend clients V2 schema with anamnese status object and minor-age override.
-- Impacto em RLS: nenhum (somente novas colunas em tabela ja protegida por policies existentes).
-- Impacto em indices/performance: nenhum indice novo necessario neste passo.
-- Rollback seguro: remover colunas/constraints adicionadas se ainda nao houver dependencia funcional.

BEGIN;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_minor_override boolean,
  ADD COLUMN IF NOT EXISTS anamnese_form_status text,
  ADD COLUMN IF NOT EXISTS anamnese_form_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS anamnese_form_answered_at timestamptz;

UPDATE public.clients
SET anamnese_form_status = CASE
  WHEN anamnese_form_status IN ('nao_enviado', 'enviado', 'respondido') THEN anamnese_form_status
  WHEN anamnese_form_answered_at IS NOT NULL THEN 'respondido'
  WHEN anamnese_form_sent_at IS NOT NULL THEN 'enviado'
  WHEN COALESCE(NULLIF(TRIM(anamnese_url), ''), NULL) IS NOT NULL THEN 'enviado'
  ELSE 'nao_enviado'
END
WHERE anamnese_form_status IS NULL
   OR anamnese_form_status NOT IN ('nao_enviado', 'enviado', 'respondido');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clients_anamnese_form_status_check'
      AND conrelid = 'public.clients'::regclass
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_anamnese_form_status_check
      CHECK (anamnese_form_status IN ('nao_enviado', 'enviado', 'respondido'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clients_anamnese_form_answered_after_sent_check'
      AND conrelid = 'public.clients'::regclass
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_anamnese_form_answered_after_sent_check
      CHECK (
        anamnese_form_sent_at IS NULL
        OR anamnese_form_answered_at IS NULL
        OR anamnese_form_answered_at >= anamnese_form_sent_at
      );
  END IF;
END;
$$;

ALTER TABLE public.clients
  ALTER COLUMN anamnese_form_status SET DEFAULT 'nao_enviado';

COMMIT;
