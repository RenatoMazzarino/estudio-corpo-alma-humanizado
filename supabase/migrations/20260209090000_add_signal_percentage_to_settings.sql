-- Add signal percentage configuration to settings
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS signal_percentage INTEGER DEFAULT 30;

UPDATE settings
  SET signal_percentage = COALESCE(signal_percentage, 30);
