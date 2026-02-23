-- Remove campo legado "presets" das evoluções de atendimento.
UPDATE public.appointment_evolution_entries
SET sections_json = sections_json - 'presets'
WHERE sections_json IS NOT NULL
  AND jsonb_typeof(sections_json) = 'object'
  AND sections_json ? 'presets';

-- Se o objeto ficar vazio após remoção, normaliza para NULL.
UPDATE public.appointment_evolution_entries
SET sections_json = NULL
WHERE sections_json IS NOT NULL
  AND jsonb_typeof(sections_json) = 'object'
  AND sections_json = '{}'::jsonb;
