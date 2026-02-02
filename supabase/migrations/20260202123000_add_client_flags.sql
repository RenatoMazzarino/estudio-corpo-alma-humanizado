-- G30: add client flags and preferences for production UI

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_vip boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_attention boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferences_notes text,
  ADD COLUMN IF NOT EXISTS contraindications text,
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_minor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guardian_name text,
  ADD COLUMN IF NOT EXISTS guardian_phone text,
  ADD COLUMN IF NOT EXISTS guardian_cpf text;
