-- RLS + RPC for public booking

-- Enable RLS where missing
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Tenants: public read
DROP POLICY IF EXISTS "Public tenants read" ON tenants;
CREATE POLICY "Public tenants read" ON tenants
  FOR SELECT
  USING (true);

-- Services: admin via service_role, public read
DROP POLICY IF EXISTS "Acesso total services admin" ON services;
DROP POLICY IF EXISTS "Admin services access" ON services;
CREATE POLICY "Admin services access" ON services
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

DROP POLICY IF EXISTS "Public services read" ON services;
CREATE POLICY "Public services read" ON services
  FOR SELECT
  USING (true);

-- Business hours: admin via service_role, public read
DROP POLICY IF EXISTS "Acesso total business_hours admin" ON business_hours;
DROP POLICY IF EXISTS "Admin business_hours access" ON business_hours;
CREATE POLICY "Admin business_hours access" ON business_hours
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

DROP POLICY IF EXISTS "Public business_hours read" ON business_hours;
CREATE POLICY "Public business_hours read" ON business_hours
  FOR SELECT
  USING (true);

-- Settings: admin only
DROP POLICY IF EXISTS "Acesso total settings admin" ON settings;
DROP POLICY IF EXISTS "Admin settings access" ON settings;
CREATE POLICY "Admin settings access" ON settings
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

-- Availability blocks: admin only
DROP POLICY IF EXISTS "Acesso total blocks admin" ON availability_blocks;
DROP POLICY IF EXISTS "Admin availability_blocks access" ON availability_blocks;
CREATE POLICY "Admin availability_blocks access" ON availability_blocks
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

-- Transactions: admin only
DROP POLICY IF EXISTS "Acesso total transactions admin" ON transactions;
DROP POLICY IF EXISTS "Admin transactions access" ON transactions;
CREATE POLICY "Admin transactions access" ON transactions
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

-- Clients: admin only
DROP POLICY IF EXISTS "Admin clients access" ON clients;
CREATE POLICY "Admin clients access" ON clients
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

-- Appointments: admin only
DROP POLICY IF EXISTS "Admin appointments access" ON appointments;
CREATE POLICY "Admin appointments access" ON appointments
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

-- RPC for public booking (runs as definer)
CREATE OR REPLACE FUNCTION public.create_public_appointment(
  tenant_slug text,
  service_id uuid,
  start_time timestamptz,
  client_name text,
  client_phone text,
  is_home_visit boolean DEFAULT false
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
  v_total_duration int;
  v_price numeric;
  v_finished_at timestamptz;
  v_appointment_id uuid;
BEGIN
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE slug = tenant_slug;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  SELECT * INTO v_service
  FROM services
  WHERE id = service_id
    AND tenant_id = v_tenant_id;

  IF v_service.id IS NULL THEN
    RAISE EXCEPTION 'Service not found';
  END IF;

  SELECT * INTO v_settings
  FROM settings
  WHERE tenant_id = v_tenant_id
  LIMIT 1;

  v_total_duration := v_service.duration_minutes;
  v_price := v_service.price;

  IF is_home_visit THEN
    v_price := v_price + COALESCE(v_service.home_visit_fee, 0);
    v_total_duration := v_total_duration + COALESCE(v_settings.default_home_buffer, 60);
  ELSE
    v_total_duration := v_total_duration + COALESCE(v_service.custom_buffer_minutes, v_settings.default_studio_buffer, 30);
  END IF;

  v_finished_at := start_time + (v_service.duration_minutes || ' minutes')::interval;

  SELECT id INTO v_client_id
  FROM clients
  WHERE tenant_id = v_tenant_id
    AND name = client_name
    AND phone = client_phone
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO clients (tenant_id, name, phone, initials)
    VALUES (v_tenant_id, client_name, client_phone, upper(left(client_name, 2)))
    RETURNING id INTO v_client_id;
  END IF;

  -- Collision check (appointments)
  IF EXISTS (
    SELECT 1
    FROM appointments a
    WHERE a.tenant_id = v_tenant_id
      AND a.status NOT IN ('canceled_by_client', 'canceled_by_studio', 'no_show')
      AND a.start_time < (start_time + (v_total_duration || ' minutes')::interval)
      AND (
        CASE
          WHEN a.total_duration_minutes IS NOT NULL THEN a.start_time + (a.total_duration_minutes || ' minutes')::interval
          WHEN a.finished_at IS NOT NULL THEN a.finished_at
          ELSE a.start_time + interval '30 minutes'
        END
      ) > start_time
  ) THEN
    RAISE EXCEPTION 'Slot unavailable';
  END IF;

  -- Collision check (blocks)
  IF EXISTS (
    SELECT 1
    FROM availability_blocks b
    WHERE b.tenant_id = v_tenant_id
      AND b.start_time < (start_time + (v_total_duration || ' minutes')::interval)
      AND b.end_time > start_time
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
    payment_status
  ) VALUES (
    v_tenant_id,
    v_client_id,
    v_service.id,
    v_service.name,
    start_time,
    v_finished_at,
    v_price,
    'pending',
    is_home_visit,
    v_total_duration,
    'pending'
  ) RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_appointment(text, uuid, timestamptz, text, text, boolean) TO anon, authenticated;
