-- Normalize appointment statuses and enforce constraint

UPDATE appointments
SET status = 'completed'
WHERE status = 'done';

UPDATE appointments
SET status = 'pending'
WHERE status = 'scheduled';

UPDATE appointments
SET status = 'canceled_by_studio'
WHERE status = 'canceled';

DO $$
DECLARE
  invalid_statuses text;
BEGIN
  SELECT string_agg(DISTINCT status, ', ')
  INTO invalid_statuses
  FROM appointments
  WHERE status NOT IN (
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'canceled_by_client',
    'canceled_by_studio',
    'no_show'
  );

  IF invalid_statuses IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid appointment status values found: %', invalid_statuses;
  END IF;
END $$;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'canceled_by_client',
    'canceled_by_studio',
    'no_show'
  ));
