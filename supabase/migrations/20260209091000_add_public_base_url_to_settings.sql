-- Add public base url configuration to settings
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS public_base_url TEXT;
