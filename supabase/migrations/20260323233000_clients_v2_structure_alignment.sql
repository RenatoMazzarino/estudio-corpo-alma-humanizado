-- Align clients domain schema with V2 structured profile model.
-- Impacto em RLS: nenhum (apenas colunas novas em tabelas ja protegidas por policies existentes).
-- Impacto em indices/performance: novos indices para codigo de cliente e normalizacao de contatos.
-- Rollback seguro: remover colunas novas e constraints adicionadas nesta migration se ainda nao houver dependencia funcional.

BEGIN;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_code text,
  ADD COLUMN IF NOT EXISTS public_name text,
  ADD COLUMN IF NOT EXISTS system_name text,
  ADD COLUMN IF NOT EXISTS short_name text,
  ADD COLUMN IF NOT EXISTS guardian_relationship text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.clients
SET
  public_name = COALESCE(
    NULLIF(TRIM(public_name), ''),
    NULLIF(TRIM(CONCAT_WS(' ', public_first_name, public_last_name)), ''),
    NULLIF(TRIM(REGEXP_REPLACE(COALESCE(name, ''), '\s*\([^)]*\)\s*$', '')), '')
  ),
  short_name = COALESCE(
    NULLIF(TRIM(short_name), ''),
    NULLIF(TRIM(public_first_name), ''),
    NULLIF(TRIM(SPLIT_PART(REGEXP_REPLACE(COALESCE(name, ''), '\s*\([^)]*\)\s*$', ''), ' ', 1)), '')
  ),
  system_name = COALESCE(
    NULLIF(TRIM(system_name), ''),
    NULLIF(TRIM(name), ''),
    NULLIF(TRIM(public_name), ''),
    NULLIF(TRIM(CONCAT_WS(' ', public_first_name, public_last_name)), '')
  ),
  updated_at = COALESCE(updated_at, created_at, timezone('utc', now()))
WHERE TRUE;

ALTER TABLE public.clients
  ALTER COLUMN updated_at SET DEFAULT timezone('utc', now()),
  ALTER COLUMN updated_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_client_code_uidx
  ON public.clients (tenant_id, client_code)
  WHERE client_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS clients_tenant_public_name_idx
  ON public.clients (tenant_id, public_name);

CREATE INDEX IF NOT EXISTS clients_tenant_system_name_idx
  ON public.clients (tenant_id, system_name);

ALTER TABLE public.client_addresses
  ADD COLUMN IF NOT EXISTS place_id text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.client_phones
  ADD COLUMN IF NOT EXISTS normalized_number text;

UPDATE public.client_phones
SET normalized_number = NULLIF(REGEXP_REPLACE(COALESCE(number_e164, number_raw, ''), '\D', '', 'g'), '')
WHERE normalized_number IS NULL;

CREATE INDEX IF NOT EXISTS client_phones_client_normalized_number_idx
  ON public.client_phones (client_id, normalized_number);

ALTER TABLE public.client_emails
  ADD COLUMN IF NOT EXISTS normalized_email text;

UPDATE public.client_emails
SET normalized_email = NULLIF(LOWER(TRIM(email)), '')
WHERE normalized_email IS NULL;

CREATE INDEX IF NOT EXISTS client_emails_client_normalized_email_idx
  ON public.client_emails (client_id, normalized_email);

ALTER TABLE public.client_health_items
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS is_active boolean;

UPDATE public.client_health_items
SET is_active = COALESCE(is_active, true)
WHERE is_active IS NULL;

ALTER TABLE public.client_health_items
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN is_active SET NOT NULL;

ALTER TABLE public.client_health_items
  DROP CONSTRAINT IF EXISTS client_health_items_type_check;

ALTER TABLE public.client_health_items
  ADD CONSTRAINT client_health_items_type_check
  CHECK (type IN ('allergy', 'condition', 'contraindication', 'tag'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_health_items_severity_check'
      AND conrelid = 'public.client_health_items'::regclass
  ) THEN
    ALTER TABLE public.client_health_items
      ADD CONSTRAINT client_health_items_severity_check
      CHECK (severity IS NULL OR severity IN ('leve', 'moderada', 'alta'));
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_touch_updated_at ON public.clients;
CREATE TRIGGER trg_clients_touch_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at_column();

COMMIT;
