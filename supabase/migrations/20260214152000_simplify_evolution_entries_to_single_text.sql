-- Simplifica evolução para campo único de texto.
ALTER TABLE public.appointment_evolution_entries
  ADD COLUMN IF NOT EXISTS evolution_text text;

UPDATE public.appointment_evolution_entries
SET evolution_text = COALESCE(
  NULLIF(trim(evolution_text), ''),
  NULLIF(trim(summary), ''),
  NULLIF(trim(complaint), ''),
  NULLIF(trim(techniques), ''),
  NULLIF(trim(recommendations), '')
);

ALTER TABLE public.appointment_evolution_entries
  DROP COLUMN IF EXISTS summary,
  DROP COLUMN IF EXISTS complaint,
  DROP COLUMN IF EXISTS techniques,
  DROP COLUMN IF EXISTS recommendations,
  DROP COLUMN IF EXISTS sections_json;
