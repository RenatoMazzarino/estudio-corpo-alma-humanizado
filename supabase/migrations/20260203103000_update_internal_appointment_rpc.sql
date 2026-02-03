-- G34: update create_internal_appointment for buffers, addresses and price override

DROP FUNCTION IF EXISTS public.create_internal_appointment(uuid, uuid, timestamptz, text, text, text, text, text, text, text, text, text, boolean, text);

CREATE FUNCTION public.create_internal_appointment(
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
  p_price_override numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service services%ROWTYPE;
  v_settings settings%ROWTYPE;
  v_client_id uuid;
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
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text), hashtext(date_trunc('minute', p_start_time)::text));

  SELECT * INTO v_service
  FROM services
  WHERE id = service_id
    AND tenant_id = p_tenant_id;

  IF v_service.id IS NULL THEN
    RAISE EXCEPTION 'Service not found';
  END IF;

  SELECT * INTO v_settings
  FROM settings
  WHERE tenant_id = p_tenant_id
  LIMIT 1;

  v_price := v_service.price;
  IF is_home_visit THEN
    v_price := v_price + COALESCE(v_service.home_visit_fee, 0);
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

  v_total_duration := v_service.duration_minutes + v_buffer_before + v_buffer_after;
  v_finished_at := p_start_time + (v_service.duration_minutes || ' minutes')::interval;
  v_block_start := p_start_time - (v_buffer_before || ' minutes')::interval;
  v_block_end := p_start_time + ((v_service.duration_minutes + v_buffer_after) || ' minutes')::interval;

  IF p_client_id IS NOT NULL THEN
    v_client_id := p_client_id;
  ELSIF client_phone IS NOT NULL AND length(trim(client_phone)) > 0 THEN
    SELECT id INTO v_client_id
    FROM clients
    WHERE tenant_id = p_tenant_id
      AND name = client_name
      AND phone = client_phone
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL THEN
    INSERT INTO clients (tenant_id, name, phone, initials)
    VALUES (p_tenant_id, client_name, client_phone, upper(left(client_name, 2)))
    RETURNING id INTO v_client_id;
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
    FROM client_addresses
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
    INSERT INTO client_addresses (
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

  UPDATE clients
  SET
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
    FROM appointments a
    JOIN services s ON s.id = a.service_id
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
    FROM availability_blocks b
    WHERE b.tenant_id = p_tenant_id
      AND b.start_time < v_block_end
      AND b.end_time > v_block_start
  ) THEN
    RAISE EXCEPTION 'Slot blocked';
  END IF;

  INSERT INTO appointments (
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
  numeric
) TO service_role;
