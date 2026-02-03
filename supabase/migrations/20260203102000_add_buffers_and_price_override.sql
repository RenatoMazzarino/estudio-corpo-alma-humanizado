-- G33: buffers before/after + appointment price override

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS buffer_before_minutes integer,
  ADD COLUMN IF NOT EXISTS buffer_after_minutes integer;

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS buffer_before_minutes integer,
  ADD COLUMN IF NOT EXISTS buffer_after_minutes integer;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS price_override numeric(10,2);
