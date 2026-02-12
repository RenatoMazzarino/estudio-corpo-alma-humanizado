-- G66: hardening de políticas legadas + alinhamento de drift remoto

-- 1) Alinhamento não destrutivo de colunas legadas presentes no remoto
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS notes text;

-- 2) Normalizar FK de business_hours para ON DELETE CASCADE
DO $$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_constraintdef(c.oid)
  INTO v_definition
  FROM pg_constraint c
  WHERE c.conname = 'business_hours_tenant_id_fkey'
    AND c.conrelid = 'public.business_hours'::regclass;

  IF v_definition IS NULL THEN
    ALTER TABLE public.business_hours
      ADD CONSTRAINT business_hours_tenant_id_fkey
      FOREIGN KEY (tenant_id)
      REFERENCES public.tenants(id)
      ON DELETE CASCADE;
  ELSIF v_definition NOT ILIKE '%ON DELETE CASCADE%' THEN
    ALTER TABLE public.business_hours
      DROP CONSTRAINT business_hours_tenant_id_fkey;

    ALTER TABLE public.business_hours
      ADD CONSTRAINT business_hours_tenant_id_fkey
      FOREIGN KEY (tenant_id)
      REFERENCES public.tenants(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 3) Remover políticas legadas excessivamente permissivas
DO $$
BEGIN
  DROP POLICY IF EXISTS "Permitir agendamento publico" ON public.appointments;
  DROP POLICY IF EXISTS "Escrita total horarios" ON public.business_hours;
  DROP POLICY IF EXISTS "Leitura autenticada horarios" ON public.business_hours;
  DROP POLICY IF EXISTS "Leitura publica horarios" ON public.business_hours;
  DROP POLICY IF EXISTS "Enable insert access for all users" ON public.clients;
  DROP POLICY IF EXISTS "Enable read access for all users" ON public.clients;
  DROP POLICY IF EXISTS "Enable update access for all users" ON public.clients;
  DROP POLICY IF EXISTS "Permitir leitura publica services" ON public.services;
  DROP POLICY IF EXISTS "Permitir leitura publica tenants" ON public.tenants;
END $$;

