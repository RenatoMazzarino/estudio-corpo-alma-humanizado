-- G63: normalização + deduplicação de clientes por telefone

CREATE OR REPLACE FUNCTION public.normalize_phone_digits(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(COALESCE(value, ''), '\D', '', 'g');
$$;

CREATE INDEX IF NOT EXISTS clients_tenant_phone_digits_idx
  ON public.clients (tenant_id, public.normalize_phone_digits(phone));

CREATE INDEX IF NOT EXISTS client_phones_tenant_number_raw_digits_idx
  ON public.client_phones (tenant_id, public.normalize_phone_digits(number_raw));

CREATE INDEX IF NOT EXISTS client_phones_tenant_number_e164_digits_idx
  ON public.client_phones (tenant_id, public.normalize_phone_digits(number_e164));

CREATE TEMP TABLE tmp_duplicate_clients_phone
ON COMMIT DROP
AS
WITH ranked AS (
  SELECT
    c.id,
    c.tenant_id,
    c.name,
    c.phone,
    c.address_cep,
    c.address_logradouro,
    c.address_numero,
    c.address_complemento,
    c.address_bairro,
    c.address_cidade,
    c.address_estado,
    FIRST_VALUE(c.id) OVER (
      PARTITION BY c.tenant_id, public.normalize_phone_digits(c.phone)
      ORDER BY c.created_at ASC, c.id ASC
    ) AS keeper_id,
    ROW_NUMBER() OVER (
      PARTITION BY c.tenant_id, public.normalize_phone_digits(c.phone)
      ORDER BY c.created_at ASC, c.id ASC
    ) AS row_num
  FROM public.clients c
  WHERE public.normalize_phone_digits(c.phone) <> ''
)
SELECT
  id AS duplicate_id,
  keeper_id,
  name,
  phone,
  address_cep,
  address_logradouro,
  address_numero,
  address_complemento,
  address_bairro,
  address_cidade,
  address_estado
FROM ranked
WHERE row_num > 1;

UPDATE public.clients keep
SET
  phone = COALESCE(keep.phone, dup.phone),
  address_cep = COALESCE(keep.address_cep, dup.address_cep),
  address_logradouro = COALESCE(keep.address_logradouro, dup.address_logradouro),
  address_numero = COALESCE(keep.address_numero, dup.address_numero),
  address_complemento = COALESCE(keep.address_complemento, dup.address_complemento),
  address_bairro = COALESCE(keep.address_bairro, dup.address_bairro),
  address_cidade = COALESCE(keep.address_cidade, dup.address_cidade),
  address_estado = COALESCE(keep.address_estado, dup.address_estado)
FROM tmp_duplicate_clients_phone dup
WHERE keep.id = dup.keeper_id;

UPDATE public.appointments a
SET client_id = dup.keeper_id
FROM tmp_duplicate_clients_phone dup
WHERE a.client_id = dup.duplicate_id;

UPDATE public.client_addresses ca
SET client_id = dup.keeper_id
FROM tmp_duplicate_clients_phone dup
WHERE ca.client_id = dup.duplicate_id;

UPDATE public.client_phones cp
SET client_id = dup.keeper_id
FROM tmp_duplicate_clients_phone dup
WHERE cp.client_id = dup.duplicate_id;

UPDATE public.client_emails ce
SET client_id = dup.keeper_id
FROM tmp_duplicate_clients_phone dup
WHERE ce.client_id = dup.duplicate_id;

UPDATE public.client_health_items chi
SET client_id = dup.keeper_id
FROM tmp_duplicate_clients_phone dup
WHERE chi.client_id = dup.duplicate_id;

DELETE FROM public.clients c
USING tmp_duplicate_clients_phone dup
WHERE c.id = dup.duplicate_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'clients_tenant_phone_digits_unique'
  ) THEN
    CREATE UNIQUE INDEX clients_tenant_phone_digits_unique
      ON public.clients (tenant_id, public.normalize_phone_digits(phone))
      WHERE public.normalize_phone_digits(phone) <> '';
  END IF;
END $$;
