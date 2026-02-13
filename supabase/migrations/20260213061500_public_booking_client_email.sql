-- Add overload for public booking RPC with explicit client email persistence.
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
  p_displacement_distance_km numeric DEFAULT NULL,
  p_client_email text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment_id uuid;
  v_tenant_id uuid;
  v_client_id uuid;
  v_client_email text := NULLIF(trim(p_client_email), '');
BEGIN
  v_appointment_id := public.create_public_appointment(
    tenant_slug,
    service_id,
    p_start_time,
    client_name,
    client_phone,
    p_address_cep,
    p_address_logradouro,
    p_address_numero,
    p_address_complemento,
    p_address_bairro,
    p_address_cidade,
    p_address_estado,
    is_home_visit,
    p_displacement_fee,
    p_displacement_distance_km
  );

  IF v_appointment_id IS NULL OR v_client_email IS NULL THEN
    RETURN v_appointment_id;
  END IF;

  SELECT a.tenant_id, a.client_id
  INTO v_tenant_id, v_client_id
  FROM public.appointments a
  WHERE a.id = v_appointment_id;

  IF v_tenant_id IS NULL OR v_client_id IS NULL THEN
    RETURN v_appointment_id;
  END IF;

  UPDATE public.clients
  SET email = v_client_email
  WHERE id = v_client_id
    AND tenant_id = v_tenant_id
    AND (email IS DISTINCT FROM v_client_email);

  IF to_regclass('public.client_emails') IS NOT NULL THEN
    UPDATE public.client_emails
    SET
      is_primary = false,
      updated_at = now()
    WHERE tenant_id = v_tenant_id
      AND client_id = v_client_id
      AND is_primary = true
      AND lower(email) <> lower(v_client_email);

    UPDATE public.client_emails
    SET
      is_primary = true,
      label = COALESCE(label, 'Principal'),
      updated_at = now()
    WHERE tenant_id = v_tenant_id
      AND client_id = v_client_id
      AND lower(email) = lower(v_client_email);

    IF NOT FOUND THEN
      INSERT INTO public.client_emails (
        client_id,
        tenant_id,
        label,
        email,
        is_primary
      ) VALUES (
        v_client_id,
        v_tenant_id,
        'Principal',
        v_client_email,
        true
      );
    END IF;
  END IF;

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
  numeric,
  text
) TO anon, authenticated;
