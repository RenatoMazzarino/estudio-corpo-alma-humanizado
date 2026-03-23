-- Auto-generate immutable client codes and backfill existing clients.
-- Impacto em RLS: nenhum (trigger server-side e tabela auxiliar interna por tenant).
-- Impacto em indices/performance: baixo; usa contador por tenant para evitar scan recorrente.
-- Rollback seguro: remover trigger/funcoes/tabela auxiliar, mantendo codigos ja preenchidos.

BEGIN;

CREATE TABLE IF NOT EXISTS public.client_code_counters (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  last_value integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO public.client_code_counters (tenant_id, last_value)
SELECT
  c.tenant_id,
  COALESCE(MAX(CASE WHEN c.client_code ~ '\\d+$' THEN (substring(c.client_code FROM '(\\d+)$'))::integer END), 0) AS last_value
FROM public.clients c
GROUP BY c.tenant_id
ON CONFLICT (tenant_id) DO UPDATE
SET
  last_value = GREATEST(public.client_code_counters.last_value, EXCLUDED.last_value),
  updated_at = timezone('utc', now());

WITH missing_codes AS (
  SELECT
    c.id,
    c.tenant_id,
    ROW_NUMBER() OVER (PARTITION BY c.tenant_id ORDER BY c.created_at NULLS LAST, c.id) AS row_position
  FROM public.clients c
  WHERE c.client_code IS NULL OR btrim(c.client_code) = ''
), base_counter AS (
  SELECT tenant_id, last_value
  FROM public.client_code_counters
)
UPDATE public.clients c
SET
  client_code = 'CL-' || LPAD((bc.last_value + mc.row_position)::text, 6, '0'),
  updated_at = timezone('utc', now())
FROM missing_codes mc
JOIN base_counter bc ON bc.tenant_id = mc.tenant_id
WHERE c.id = mc.id;

UPDATE public.client_code_counters counter
SET
  last_value = source.max_value,
  updated_at = timezone('utc', now())
FROM (
  SELECT
    tenant_id,
    COALESCE(MAX(CASE WHEN client_code ~ '\\d+$' THEN (substring(client_code FROM '(\\d+)$'))::integer END), 0) AS max_value
  FROM public.clients
  GROUP BY tenant_id
) source
WHERE source.tenant_id = counter.tenant_id
  AND source.max_value <> counter.last_value;

CREATE OR REPLACE FUNCTION public.generate_next_client_code(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_value integer;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id obrigatorio para gerar client_code';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::text, 917));

  INSERT INTO public.client_code_counters (tenant_id, last_value)
  VALUES (p_tenant_id, 0)
  ON CONFLICT (tenant_id) DO NOTHING;

  UPDATE public.client_code_counters
  SET
    last_value = last_value + 1,
    updated_at = timezone('utc', now())
  WHERE tenant_id = p_tenant_id
  RETURNING last_value INTO next_value;

  RETURN 'CL-' || LPAD(next_value::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_client_code_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_code IS NULL OR btrim(NEW.client_code) = '' THEN
    NEW.client_code := public.generate_next_client_code(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_assign_client_code ON public.clients;
CREATE TRIGGER trg_clients_assign_client_code
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_client_code_on_insert();

COMMIT;
