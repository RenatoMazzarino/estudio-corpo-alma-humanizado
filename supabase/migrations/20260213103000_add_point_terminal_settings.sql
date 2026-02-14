ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS mp_point_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mp_point_terminal_id text,
  ADD COLUMN IF NOT EXISTS mp_point_terminal_name text,
  ADD COLUMN IF NOT EXISTS mp_point_terminal_model text,
  ADD COLUMN IF NOT EXISTS mp_point_terminal_external_id text;

UPDATE public.settings
SET mp_point_enabled = COALESCE(mp_point_enabled, false)
WHERE mp_point_enabled IS NULL;

