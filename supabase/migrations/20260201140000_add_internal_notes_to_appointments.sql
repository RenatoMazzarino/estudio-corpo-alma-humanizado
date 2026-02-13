-- G27: add internal notes to appointments and extend internal appointment creation
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS internal_notes text;

DROP FUNCTION IF EXISTS public.create_internal_appointment(uuid, uuid, timestamptz, text, text, text, text, text, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.create_internal_appointment(uuid, uuid, timestamptz, text, text, boolean);

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
  is_home_visit boolean DEFAULT false,
  p_internal_notes text DEFAULT NULL
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

  v_total_duration := v_service.duration_minutes;
  v_price := v_service.price;

  IF is_home_visit THEN
    v_price := v_price + COALESCE(v_service.home_visit_fee, 0);
    v_total_duration := v_total_duration + COALESCE(v_settings.default_home_buffer, 60);
  ELSE
    v_total_duration := v_total_duration + COALESCE(v_service.custom_buffer_minutes, v_settings.default_studio_buffer, 30);
  END IF;

  v_finished_at := p_start_time + (v_service.duration_minutes || ' minutes')::interval;

  IF client_phone IS NOT NULL AND length(trim(client_phone)) > 0 THEN
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
  ELSE
    UPDATE clients
    SET
      address_cep = COALESCE(p_address_cep, address_cep),
      address_logradouro = COALESCE(p_address_logradouro, address_logradouro),
      address_numero = COALESCE(p_address_numero, address_numero),
      address_complemento = COALESCE(p_address_complemento, address_complemento),
      address_bairro = COALESCE(p_address_bairro, address_bairro),
      address_cidade = COALESCE(p_address_cidade, address_cidade),
      address_estado = COALESCE(p_address_estado, address_estado)
    WHERE id = v_client_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM appointments a
    WHERE a.tenant_id = p_tenant_id
      AND a.status NOT IN ('canceled_by_client', 'canceled_by_studio', 'no_show')
      AND a.start_time < (p_start_time + (v_total_duration || ' minutes')::interval)
      AND (
        CASE
          WHEN a.total_duration_minutes IS NOT NULL THEN a.start_time + (a.total_duration_minutes || ' minutes')::interval
          WHEN a.finished_at IS NOT NULL THEN a.finished_at
          ELSE a.start_time + interval '30 minutes'
        END
      ) > p_start_time
  ) THEN
    RAISE EXCEPTION 'Slot unavailable';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM availability_blocks b
    WHERE b.tenant_id = p_tenant_id
      AND b.start_time < (p_start_time + (v_total_duration || ' minutes')::interval)
      AND b.end_time > p_start_time
  ) THEN
    RAISE EXCEPTION 'Slot blocked';
  END IF;

  INSERT INTO appointments (
    tenant_id,
    client_id,
    service_id,
    service_name,
    start_time,
    finished_at,
    price,
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
    v_service.id,
    v_service.name,
    p_start_time,
    v_finished_at,
    v_price,
    'pending',
    is_home_visit,
    v_total_duration,
    p_address_cep,
    p_address_logradouro,
    p_address_numero,
    p_address_complemento,
    p_address_bairro,
    p_address_cidade,
    p_address_estado,
    'pending',
    p_internal_notes
  ) RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_internal_appointment(uuid, uuid, timestamptz, text, text, text, text, text, text, text, text, text, boolean, text) TO service_role;
