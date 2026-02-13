-- G65: reconciliação de produção (schema drift + funções de agendamento)
-- Objetivo:
-- 1) Garantir integridade de business_hours no remoto
-- 2) Reaplicar deduplicação robusta de clientes por telefone normalizado
-- 3) Reaplicar versão mais recente das RPCs create_public_appointment/create_internal_appointment

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'business_hours_day_of_week_check'
      AND conrelid = 'public.business_hours'::regclass
  ) THEN
    ALTER TABLE public.business_hours
      ADD CONSTRAINT business_hours_day_of_week_check
      CHECK (day_of_week >= 0 AND day_of_week <= 6);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'business_hours_tenant_id_fkey'
      AND conrelid = 'public.business_hours'::regclass
  ) THEN
    ALTER TABLE public.business_hours
      ADD CONSTRAINT business_hours_tenant_id_fkey
      FOREIGN KEY (tenant_id)
      REFERENCES public.tenants(id)
      ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.business_hours
SET created_at = timezone('utc'::text, now())
WHERE created_at IS NULL;

ALTER TABLE public.business_hours
  ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now()),
  ALTER COLUMN created_at SET NOT NULL;

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
  phone = COALESCE(NULLIF(BTRIM(keep.phone), ''), dup.phone),
  address_cep = COALESCE(NULLIF(BTRIM(keep.address_cep), ''), dup.address_cep),
  address_logradouro = COALESCE(NULLIF(BTRIM(keep.address_logradouro), ''), dup.address_logradouro),
  address_numero = COALESCE(NULLIF(BTRIM(keep.address_numero), ''), dup.address_numero),
  address_complemento = COALESCE(NULLIF(BTRIM(keep.address_complemento), ''), dup.address_complemento),
  address_bairro = COALESCE(NULLIF(BTRIM(keep.address_bairro), ''), dup.address_bairro),
  address_cidade = COALESCE(NULLIF(BTRIM(keep.address_cidade), ''), dup.address_cidade),
  address_estado = COALESCE(NULLIF(BTRIM(keep.address_estado), ''), dup.address_estado)
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

CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_phone_digits_unique
  ON public.clients (tenant_id, public.normalize_phone_digits(phone))
  WHERE public.normalize_phone_digits(phone) <> '';
CREATE OR REPLACE FUNCTION public.create_public_appointment(
  tenant_slug text,
  service_id uuid,
  p_start_time timestamptz,
  client_name text,
  client_phone text,
  p_address_cep text DEFAULT NULL,
  p_address_logradouro text DEFAULT NULL,
  p_address_numero text DEFAULT NULL,
  p_address_complemento text DEFAULT NULL,
  p_address_bairro text DEFAULT NULL,
  p_address_cidade text DEFAULT NULL,
  p_address_estado text DEFAULT NULL,
  is_home_visit boolean DEFAULT false,
  p_displacement_fee numeric DEFAULT 0,
  p_displacement_distance_km numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_service services%ROWTYPE;
  v_settings settings%ROWTYPE;
  v_client_id uuid;
  v_client_phone_digits text := regexp_replace(COALESCE(client_phone, ''), '\D', '', 'g');
  v_total_duration int;
  v_price numeric;
  v_finished_at timestamptz;
  v_appointment_id uuid;
  v_buffer_before int;
  v_buffer_after int;
  v_block_start timestamptz;
  v_block_end timestamptz;
  v_displacement_fee numeric := GREATEST(COALESCE(p_displacement_fee, 0), 0);
  v_displacement_distance_km numeric := CASE
    WHEN is_home_visit THEN p_displacement_distance_km
    ELSE NULL
  END;
BEGIN
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE slug = tenant_slug;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_tenant_id::text), hashtext(date_trunc('minute', p_start_time)::text));

  SELECT * INTO v_service
  FROM public.services
  WHERE id = service_id
    AND tenant_id = v_tenant_id;

  IF v_service.id IS NULL THEN
    RAISE EXCEPTION 'Service not found';
  END IF;

  SELECT * INTO v_settings
  FROM public.settings
  WHERE tenant_id = v_tenant_id
  LIMIT 1;

  IF is_home_visit THEN
    v_buffer_before := COALESCE(
      v_service.buffer_before_minutes,
      v_settings.buffer_before_minutes,
      v_settings.default_home_buffer,
      v_service.custom_buffer_minutes,
      v_settings.default_studio_buffer,
      30
    );
    v_buffer_after := COALESCE(
      v_service.buffer_after_minutes,
      v_settings.buffer_after_minutes,
      v_settings.default_home_buffer,
      v_service.custom_buffer_minutes,
      v_settings.default_studio_buffer,
      30
    );
  ELSE
    v_buffer_before := COALESCE(
      v_service.buffer_before_minutes,
      v_settings.buffer_before_minutes,
      v_service.custom_buffer_minutes,
      v_settings.default_studio_buffer,
      30
    );
    v_buffer_after := COALESCE(
      v_service.buffer_after_minutes,
      v_settings.buffer_after_minutes,
      v_service.custom_buffer_minutes,
      v_settings.default_studio_buffer,
      30
    );
  END IF;

  v_total_duration := v_service.duration_minutes + COALESCE(v_buffer_before, 0) + COALESCE(v_buffer_after, 0);
  v_finished_at := p_start_time + (v_service.duration_minutes || ' minutes')::interval;
  v_block_start := p_start_time - (COALESCE(v_buffer_before, 0) || ' minutes')::interval;
  v_block_end := p_start_time + ((v_service.duration_minutes + COALESCE(v_buffer_after, 0)) || ' minutes')::interval;

  v_price := COALESCE(v_service.price, 0);
  IF is_home_visit THEN
    v_price := v_price + v_displacement_fee;
  END IF;

  IF v_client_phone_digits <> '' THEN
    SELECT id INTO v_client_id
    FROM public.clients
    WHERE tenant_id = v_tenant_id
      AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_client_phone_digits
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL THEN
    BEGIN
      INSERT INTO public.clients (tenant_id, name, phone, initials)
      VALUES (v_tenant_id, client_name, client_phone, upper(left(client_name, 2)))
      RETURNING id INTO v_client_id;
    EXCEPTION
      WHEN unique_violation THEN
        IF v_client_phone_digits = '' THEN
          RAISE;
        END IF;

        SELECT id INTO v_client_id
        FROM public.clients
        WHERE tenant_id = v_tenant_id
          AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_client_phone_digits
        ORDER BY created_at ASC
        LIMIT 1;
    END;
  END IF;

  UPDATE public.clients
  SET
    name = COALESCE(NULLIF(trim(client_name), ''), name),
    phone = COALESCE(client_phone, phone),
    address_cep = COALESCE(p_address_cep, address_cep),
    address_logradouro = COALESCE(p_address_logradouro, address_logradouro),
    address_numero = COALESCE(p_address_numero, address_numero),
    address_complemento = COALESCE(p_address_complemento, address_complemento),
    address_bairro = COALESCE(p_address_bairro, address_bairro),
    address_cidade = COALESCE(p_address_cidade, address_cidade),
    address_estado = COALESCE(p_address_estado, address_estado)
  WHERE id = v_client_id;

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.services s ON s.id = a.service_id
    WHERE a.tenant_id = v_tenant_id
      AND a.status NOT IN ('canceled_by_client', 'canceled_by_studio', 'no_show')
      AND (
        a.start_time - (
          (
            CASE
              WHEN a.is_home_visit THEN COALESCE(
                s.buffer_before_minutes,
                v_settings.buffer_before_minutes,
                v_settings.default_home_buffer,
                s.custom_buffer_minutes,
                v_settings.default_studio_buffer,
                30
              )
              ELSE COALESCE(
                s.buffer_before_minutes,
                v_settings.buffer_before_minutes,
                s.custom_buffer_minutes,
                v_settings.default_studio_buffer,
                30
              )
            END
          ) || ' minutes'
        )::interval
      ) < v_block_end
      AND (
        a.start_time + (
          (
            s.duration_minutes +
            CASE
              WHEN a.is_home_visit THEN COALESCE(
                s.buffer_after_minutes,
                v_settings.buffer_after_minutes,
                v_settings.default_home_buffer,
                s.custom_buffer_minutes,
                v_settings.default_studio_buffer,
                30
              )
              ELSE COALESCE(
                s.buffer_after_minutes,
                v_settings.buffer_after_minutes,
                s.custom_buffer_minutes,
                v_settings.default_studio_buffer,
                30
              )
            END
          ) || ' minutes'
        )::interval
      ) > v_block_start
  ) THEN
    RAISE EXCEPTION 'Slot unavailable';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.availability_blocks b
    WHERE b.tenant_id = v_tenant_id
      AND b.start_time < v_block_end
      AND b.end_time > v_block_start
  ) THEN
    RAISE EXCEPTION 'Slot blocked';
  END IF;

  INSERT INTO public.appointments (
    tenant_id,
    client_id,
    service_id,
    service_name,
    start_time,
    finished_at,
    price,
    status,
    is_home_visit,
    displacement_fee,
    displacement_distance_km,
    total_duration_minutes,
    address_cep,
    address_logradouro,
    address_numero,
    address_complemento,
    address_bairro,
    address_cidade,
    address_estado,
    payment_status
  ) VALUES (
    v_tenant_id,
    v_client_id,
    v_service.id,
    v_service.name,
    p_start_time,
    v_finished_at,
    v_price,
    'pending',
    is_home_visit,
    CASE WHEN is_home_visit THEN v_displacement_fee ELSE 0 END,
    v_displacement_distance_km,
    v_total_duration,
    p_address_cep,
    p_address_logradouro,
    p_address_numero,
    p_address_complemento,
    p_address_bairro,
    p_address_cidade,
    p_address_estado,
    'pending'
  ) RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_internal_appointment(
  p_tenant_id uuid,
  service_id uuid,
  p_start_time timestamptz,
  client_name text,
  client_phone text DEFAULT NULL,
  p_address_cep text DEFAULT NULL,
  p_address_logradouro text DEFAULT NULL,
  p_address_numero text DEFAULT NULL,
  p_address_complemento text DEFAULT NULL,
  p_address_bairro text DEFAULT NULL,
  p_address_cidade text DEFAULT NULL,
  p_address_estado text DEFAULT NULL,
  p_address_label text DEFAULT NULL,
  is_home_visit boolean DEFAULT false,
  p_internal_notes text DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_client_address_id uuid DEFAULT NULL,
  p_price_override numeric DEFAULT NULL,
  p_displacement_fee numeric DEFAULT 0,
  p_displacement_distance_km numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service services%ROWTYPE;
  v_settings settings%ROWTYPE;
  v_client_id uuid;
  v_client_phone_digits text := regexp_replace(COALESCE(client_phone, ''), '\D', '', 'g');
  v_total_duration int;
  v_price numeric;
  v_finished_at timestamptz;
  v_appointment_id uuid;
  v_buffer_before int;
  v_buffer_after int;
  v_block_start timestamptz;
  v_block_end timestamptz;
  v_address client_addresses%ROWTYPE;
  v_address_cep text;
  v_address_logradouro text;
  v_address_numero text;
  v_address_complemento text;
  v_address_bairro text;
  v_address_cidade text;
  v_address_estado text;
  v_displacement_fee numeric := GREATEST(COALESCE(p_displacement_fee, 0), 0);
  v_displacement_distance_km numeric := CASE
    WHEN is_home_visit THEN p_displacement_distance_km
    ELSE NULL
  END;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text), hashtext(date_trunc('minute', p_start_time)::text));

  SELECT * INTO v_service
  FROM public.services
  WHERE id = service_id
    AND tenant_id = p_tenant_id;

  IF v_service.id IS NULL THEN
    RAISE EXCEPTION 'Service not found';
  END IF;

  SELECT * INTO v_settings
  FROM public.settings
  WHERE tenant_id = p_tenant_id
  LIMIT 1;

  v_price := COALESCE(v_service.price, 0);
  IF is_home_visit THEN
    v_price := v_price + v_displacement_fee;
  END IF;

  IF is_home_visit THEN
    v_buffer_before := COALESCE(
      v_service.buffer_before_minutes,
      v_settings.buffer_before_minutes,
      v_settings.default_home_buffer,
      v_service.custom_buffer_minutes,
      v_settings.default_studio_buffer,
      30
    );
    v_buffer_after := COALESCE(
      v_service.buffer_after_minutes,
      v_settings.buffer_after_minutes,
      v_settings.default_home_buffer,
      v_service.custom_buffer_minutes,
      v_settings.default_studio_buffer,
      30
    );
  ELSE
    v_buffer_before := COALESCE(
      v_service.buffer_before_minutes,
      v_settings.buffer_before_minutes,
      v_service.custom_buffer_minutes,
      v_settings.default_studio_buffer,
      30
    );
    v_buffer_after := COALESCE(
      v_service.buffer_after_minutes,
      v_settings.buffer_after_minutes,
      v_service.custom_buffer_minutes,
      v_settings.default_studio_buffer,
      30
    );
  END IF;

  v_total_duration := v_service.duration_minutes + COALESCE(v_buffer_before, 0) + COALESCE(v_buffer_after, 0);
  v_finished_at := p_start_time + (v_service.duration_minutes || ' minutes')::interval;
  v_block_start := p_start_time - (COALESCE(v_buffer_before, 0) || ' minutes')::interval;
  v_block_end := p_start_time + ((v_service.duration_minutes + COALESCE(v_buffer_after, 0)) || ' minutes')::interval;

  IF p_client_id IS NOT NULL THEN
    v_client_id := p_client_id;
  ELSIF v_client_phone_digits <> '' THEN
    SELECT id INTO v_client_id
    FROM public.clients
    WHERE tenant_id = p_tenant_id
      AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_client_phone_digits
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL THEN
    BEGIN
      INSERT INTO public.clients (tenant_id, name, phone, initials)
      VALUES (p_tenant_id, client_name, client_phone, upper(left(client_name, 2)))
      RETURNING id INTO v_client_id;
    EXCEPTION
      WHEN unique_violation THEN
        IF v_client_phone_digits = '' THEN
          RAISE;
        END IF;

        SELECT id INTO v_client_id
        FROM public.clients
        WHERE tenant_id = p_tenant_id
          AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_client_phone_digits
        ORDER BY created_at ASC
        LIMIT 1;
    END;
  END IF;

  v_address_cep := p_address_cep;
  v_address_logradouro := p_address_logradouro;
  v_address_numero := p_address_numero;
  v_address_complemento := p_address_complemento;
  v_address_bairro := p_address_bairro;
  v_address_cidade := p_address_cidade;
  v_address_estado := p_address_estado;

  IF p_client_address_id IS NOT NULL THEN
    SELECT * INTO v_address
    FROM public.client_addresses
    WHERE id = p_client_address_id
      AND client_id = v_client_id;

    IF v_address.id IS NULL THEN
      RAISE EXCEPTION 'Address not found for client';
    END IF;

    v_address_cep := v_address.address_cep;
    v_address_logradouro := v_address.address_logradouro;
    v_address_numero := v_address.address_numero;
    v_address_complemento := v_address.address_complemento;
    v_address_bairro := v_address.address_bairro;
    v_address_cidade := v_address.address_cidade;
    v_address_estado := v_address.address_estado;
  ELSIF is_home_visit AND (
    v_address_cep IS NOT NULL OR
    v_address_logradouro IS NOT NULL OR
    v_address_numero IS NOT NULL OR
    v_address_bairro IS NOT NULL OR
    v_address_cidade IS NOT NULL OR
    v_address_estado IS NOT NULL
  ) THEN
    INSERT INTO public.client_addresses (
      client_id,
      tenant_id,
      label,
      is_primary,
      address_cep,
      address_logradouro,
      address_numero,
      address_complemento,
      address_bairro,
      address_cidade,
      address_estado
    ) VALUES (
      v_client_id,
      p_tenant_id,
      COALESCE(p_address_label, 'Novo endereço'),
      false,
      v_address_cep,
      v_address_logradouro,
      v_address_numero,
      v_address_complemento,
      v_address_bairro,
      v_address_cidade,
      v_address_estado
    ) RETURNING id INTO p_client_address_id;
  END IF;

  UPDATE public.clients
  SET
    name = COALESCE(NULLIF(trim(client_name), ''), name),
    phone = COALESCE(client_phone, phone),
    address_cep = COALESCE(v_address_cep, address_cep),
    address_logradouro = COALESCE(v_address_logradouro, address_logradouro),
    address_numero = COALESCE(v_address_numero, address_numero),
    address_complemento = COALESCE(v_address_complemento, address_complemento),
    address_bairro = COALESCE(v_address_bairro, address_bairro),
    address_cidade = COALESCE(v_address_cidade, address_cidade),
    address_estado = COALESCE(v_address_estado, address_estado)
  WHERE id = v_client_id;

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.services s ON s.id = a.service_id
    WHERE a.tenant_id = p_tenant_id
      AND a.status NOT IN ('canceled_by_client', 'canceled_by_studio', 'no_show')
      AND (
        a.start_time - (
          (
            CASE
              WHEN a.is_home_visit THEN COALESCE(
                s.buffer_before_minutes,
                v_settings.buffer_before_minutes,
                v_settings.default_home_buffer,
                s.custom_buffer_minutes,
                v_settings.default_studio_buffer,
                30
              )
              ELSE COALESCE(
                s.buffer_before_minutes,
                v_settings.buffer_before_minutes,
                s.custom_buffer_minutes,
                v_settings.default_studio_buffer,
                30
              )
            END
          ) || ' minutes'
        )::interval
      ) < v_block_end
      AND (
        a.start_time + (
          (
            s.duration_minutes +
            CASE
              WHEN a.is_home_visit THEN COALESCE(
                s.buffer_after_minutes,
                v_settings.buffer_after_minutes,
                v_settings.default_home_buffer,
                s.custom_buffer_minutes,
                v_settings.default_studio_buffer,
                30
              )
              ELSE COALESCE(
                s.buffer_after_minutes,
                v_settings.buffer_after_minutes,
                s.custom_buffer_minutes,
                v_settings.default_studio_buffer,
                30
              )
            END
          ) || ' minutes'
        )::interval
      ) > v_block_start
  ) THEN
    RAISE EXCEPTION 'Slot unavailable';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.availability_blocks b
    WHERE b.tenant_id = p_tenant_id
      AND b.start_time < v_block_end
      AND b.end_time > v_block_start
  ) THEN
    RAISE EXCEPTION 'Slot blocked';
  END IF;

  INSERT INTO public.appointments (
    tenant_id,
    client_id,
    client_address_id,
    service_id,
    service_name,
    start_time,
    finished_at,
    price,
    price_override,
    status,
    is_home_visit,
    displacement_fee,
    displacement_distance_km,
    total_duration_minutes,
    address_cep,
    address_logradouro,
    address_numero,
    address_complemento,
    address_bairro,
    address_cidade,
    address_estado,
    payment_status,
    internal_notes
  ) VALUES (
    p_tenant_id,
    v_client_id,
    p_client_address_id,
    v_service.id,
    v_service.name,
    p_start_time,
    v_finished_at,
    COALESCE(p_price_override, v_price),
    p_price_override,
    'pending',
    is_home_visit,
    CASE WHEN is_home_visit THEN v_displacement_fee ELSE 0 END,
    v_displacement_distance_km,
    v_total_duration,
    v_address_cep,
    v_address_logradouro,
    v_address_numero,
    v_address_complemento,
    v_address_bairro,
    v_address_cidade,
    v_address_estado,
    'pending',
    p_internal_notes
  ) RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_appointment(
  text,
  uuid,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  numeric,
  numeric
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_internal_appointment(
  uuid,
  uuid,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  text,
  uuid,
  uuid,
  numeric,
  numeric,
  numeric
) TO service_role;
