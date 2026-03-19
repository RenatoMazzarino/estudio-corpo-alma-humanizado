-- WL-2: tenant como raiz canônica de configuração.
-- Impacto em RLS: novas tabelas com RLS habilitado e policy explícita para service_role.
-- Impacto em índices: índices únicos por tenant/domínio/feature para lookup e integridade.
-- Rollback: reversão por DROP TABLE das tabelas novas e DROP COLUMN apenas se ambiente ainda
-- não depender dos campos adicionados em tenants.

BEGIN;

CREATE OR REPLACE FUNCTION public.touch_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS locale text,
  ADD COLUMN IF NOT EXISTS base_city text,
  ADD COLUMN IF NOT EXISTS base_state text,
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS support_phone text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;

UPDATE public.tenants
SET
  legal_name = COALESCE(NULLIF(legal_name, ''), name),
  status = COALESCE(NULLIF(status, ''), 'active'),
  timezone = COALESCE(NULLIF(timezone, ''), 'America/Sao_Paulo'),
  locale = COALESCE(NULLIF(locale, ''), 'pt-BR'),
  updated_at = COALESCE(updated_at, timezone('utc', now()))
WHERE TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenants_status_check'
      AND conrelid = 'public.tenants'::regclass
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_status_check
      CHECK (status IN ('draft', 'active', 'suspended', 'archived'));
  END IF;
END;
$$;

ALTER TABLE public.tenants
  ALTER COLUMN legal_name SET DEFAULT '',
  ALTER COLUMN legal_name SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN timezone SET DEFAULT 'America/Sao_Paulo',
  ALTER COLUMN timezone SET NOT NULL,
  ALTER COLUMN locale SET DEFAULT 'pt-BR',
  ALTER COLUMN locale SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT timezone('utc', now()),
  ALTER COLUMN updated_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.tenant_branding (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  public_app_name text NOT NULL,
  logo_url text,
  logo_horizontal_url text,
  icon_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  background_color text,
  surface_style text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain text NOT NULL,
  type text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT tenant_domains_type_check
    CHECK (type IN ('dashboard', 'primary_public', 'secondary_public', 'preview_public'))
);

CREATE TABLE IF NOT EXISTS public.tenant_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  scope text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_domains_domain_unique_idx
  ON public.tenant_domains (LOWER(domain));

CREATE UNIQUE INDEX IF NOT EXISTS tenant_domains_tenant_type_primary_idx
  ON public.tenant_domains (tenant_id, type)
  WHERE is_primary = true AND is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_feature_flags_tenant_scope_key_idx
  ON public.tenant_feature_flags (tenant_id, feature_key, COALESCE(scope, 'global'));

CREATE INDEX IF NOT EXISTS tenant_domains_tenant_id_idx
  ON public.tenant_domains (tenant_id, is_active);

CREATE INDEX IF NOT EXISTS tenant_feature_flags_tenant_id_idx
  ON public.tenant_feature_flags (tenant_id, enabled);

ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_tenant_branding" ON public.tenant_branding;
CREATE POLICY "service_role_all_tenant_branding"
  ON public.tenant_branding
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_tenant_domains" ON public.tenant_domains;
CREATE POLICY "service_role_all_tenant_domains"
  ON public.tenant_domains
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_tenant_feature_flags" ON public.tenant_feature_flags;
CREATE POLICY "service_role_all_tenant_feature_flags"
  ON public.tenant_feature_flags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_tenants_touch_updated_at ON public.tenants;
CREATE TRIGGER trg_tenants_touch_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at_column();

DROP TRIGGER IF EXISTS trg_tenant_branding_touch_updated_at ON public.tenant_branding;
CREATE TRIGGER trg_tenant_branding_touch_updated_at
  BEFORE UPDATE ON public.tenant_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at_column();

DROP TRIGGER IF EXISTS trg_tenant_domains_touch_updated_at ON public.tenant_domains;
CREATE TRIGGER trg_tenant_domains_touch_updated_at
  BEFORE UPDATE ON public.tenant_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at_column();

DROP TRIGGER IF EXISTS trg_tenant_feature_flags_touch_updated_at ON public.tenant_feature_flags;
CREATE TRIGGER trg_tenant_feature_flags_touch_updated_at
  BEFORE UPDATE ON public.tenant_feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at_column();

UPDATE public.tenants
SET
  name = 'Estúdio Corpo & Alma',
  legal_name = 'Estúdio Corpo & Alma Humanizado',
  status = 'active',
  timezone = 'America/Sao_Paulo',
  locale = 'pt-BR',
  base_city = COALESCE(base_city, 'Amparo'),
  base_state = COALESCE(base_state, 'SP'),
  updated_at = timezone('utc', now())
WHERE id = 'dccf4492-9576-479c-8594-2795bd6b81d7';

INSERT INTO public.tenant_branding (
  tenant_id,
  display_name,
  public_app_name,
  logo_url,
  logo_horizontal_url,
  icon_url,
  primary_color,
  secondary_color,
  accent_color,
  background_color,
  surface_style
)
VALUES (
  'dccf4492-9576-479c-8594-2795bd6b81d7',
  'Estúdio Corpo & Alma Humanizado',
  'Estúdio Corpo & Alma Humanizado',
  '/brand/logo.png',
  '/brand/logo-horizontal.png',
  '/brand/icon.png',
  '#5D6E56',
  '#C0A4B0',
  '#D4A373',
  '#FAF9F6',
  'soft'
)
ON CONFLICT (tenant_id) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  public_app_name = EXCLUDED.public_app_name,
  logo_url = EXCLUDED.logo_url,
  logo_horizontal_url = EXCLUDED.logo_horizontal_url,
  icon_url = EXCLUDED.icon_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  accent_color = EXCLUDED.accent_color,
  background_color = EXCLUDED.background_color,
  surface_style = EXCLUDED.surface_style,
  updated_at = timezone('utc', now());

INSERT INTO public.tenant_domains (tenant_id, domain, type, is_primary, is_active, verified_at)
VALUES
  (
    'dccf4492-9576-479c-8594-2795bd6b81d7',
    'app.corpoealmahumanizado.com.br',
    'dashboard',
    true,
    true,
    timezone('utc', now())
  ),
  (
    'dccf4492-9576-479c-8594-2795bd6b81d7',
    'public.corpoealmahumanizado.com.br',
    'primary_public',
    true,
    true,
    timezone('utc', now())
  ),
  (
    'dccf4492-9576-479c-8594-2795bd6b81d7',
    'dev.public.corpoealmahumanizado.com.br',
    'preview_public',
    false,
    true,
    timezone('utc', now())
  )
ON CONFLICT (LOWER(domain)) DO UPDATE
SET
  tenant_id = EXCLUDED.tenant_id,
  type = EXCLUDED.type,
  is_primary = EXCLUDED.is_primary,
  is_active = EXCLUDED.is_active,
  verified_at = COALESCE(public.tenant_domains.verified_at, EXCLUDED.verified_at),
  updated_at = timezone('utc', now());

UPDATE public.settings
SET public_base_url = COALESCE(public_base_url, 'https://public.corpoealmahumanizado.com.br')
WHERE tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7';

COMMIT;
