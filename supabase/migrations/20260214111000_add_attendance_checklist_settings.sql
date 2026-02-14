ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS attendance_checklist_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS attendance_checklist_items jsonb DEFAULT '["Separar materiais e itens de higiene","Confirmar endereço/portaria","Rever restrições (anamnese)"]'::jsonb;

UPDATE public.settings
SET attendance_checklist_enabled = true
WHERE attendance_checklist_enabled IS NULL;

UPDATE public.settings
SET attendance_checklist_items = '["Separar materiais e itens de higiene","Confirmar endereço/portaria","Rever restrições (anamnese)"]'::jsonb
WHERE attendance_checklist_items IS NULL
   OR jsonb_typeof(attendance_checklist_items) <> 'array';

ALTER TABLE public.settings
  ALTER COLUMN attendance_checklist_enabled SET DEFAULT true,
  ALTER COLUMN attendance_checklist_enabled SET NOT NULL,
  ALTER COLUMN attendance_checklist_items SET DEFAULT '["Separar materiais e itens de higiene","Confirmar endereço/portaria","Rever restrições (anamnese)"]'::jsonb,
  ALTER COLUMN attendance_checklist_items SET NOT NULL;
