-- Adds service_id to appointments and backfills from (tenant_id, service_name)
-- Blocks migration if duplicate service names exist per tenant.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM services s
    GROUP BY s.tenant_id, s.name
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate service names found per tenant. Resolve before running backfill.';
  END IF;
END $$;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS service_id uuid;

UPDATE appointments a
SET service_id = s.id
FROM services s
WHERE a.service_id IS NULL
  AND a.tenant_id = s.tenant_id
  AND a.service_name = s.name;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services(id)
  ON DELETE SET NULL;
