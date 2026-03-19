-- WL-5..WL-10 foundation: provider governance, metering/billing, onboarding, audit and homol tenant proof.
-- Impacto em RLS: tabelas novas com policy explicita service_role.
-- Impacto em indices: indices por tenant/provider/periodo para lookup operacional e fechamento de custo.
-- Rollback: drop tables criadas nesta migration em ordem de dependencia.

BEGIN;

CREATE TABLE IF NOT EXISTS public.tenant_provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_key text NOT NULL,
  environment_mode text NOT NULL DEFAULT 'all',
  status text NOT NULL DEFAULT 'draft',
  credential_mode text NOT NULL DEFAULT 'environment_fallback',
  enabled boolean NOT NULL DEFAULT false,
  sender_identifier text,
  base_url text,
  public_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  fail_safe_enabled boolean NOT NULL DEFAULT true,
  config_version integer NOT NULL DEFAULT 1,
  last_validated_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_provider_configs_provider_key_check'
      AND conrelid = 'public.tenant_provider_configs'::regclass
  ) THEN
    ALTER TABLE public.tenant_provider_configs
      ADD CONSTRAINT tenant_provider_configs_provider_key_check
      CHECK (provider_key IN ('mercadopago', 'onesignal', 'google_maps', 'whatsapp_meta'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_provider_configs_environment_mode_check'
      AND conrelid = 'public.tenant_provider_configs'::regclass
  ) THEN
    ALTER TABLE public.tenant_provider_configs
      ADD CONSTRAINT tenant_provider_configs_environment_mode_check
      CHECK (environment_mode IN ('all', 'development', 'preview', 'production'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_provider_configs_status_check'
      AND conrelid = 'public.tenant_provider_configs'::regclass
  ) THEN
    ALTER TABLE public.tenant_provider_configs
      ADD CONSTRAINT tenant_provider_configs_status_check
      CHECK (status IN ('draft', 'active', 'disabled', 'invalid'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_provider_configs_credential_mode_check'
      AND conrelid = 'public.tenant_provider_configs'::regclass
  ) THEN
    ALTER TABLE public.tenant_provider_configs
      ADD CONSTRAINT tenant_provider_configs_credential_mode_check
      CHECK (credential_mode IN ('tenant_secret', 'platform_shared', 'environment_fallback', 'tenant_managed_external'));
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_provider_configs_unique_idx
  ON public.tenant_provider_configs (tenant_id, provider_key, environment_mode);

CREATE INDEX IF NOT EXISTS tenant_provider_configs_lookup_idx
  ON public.tenant_provider_configs (tenant_id, provider_key, enabled, status);

CREATE TABLE IF NOT EXISTS public.tenant_provider_usage_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_key text NOT NULL,
  billing_model text NOT NULL DEFAULT 'none',
  currency text NOT NULL DEFAULT 'BRL',
  package_quota numeric(18, 4) NOT NULL DEFAULT 0,
  package_price_cents integer NOT NULL DEFAULT 0,
  unit_price_cents integer NOT NULL DEFAULT 0,
  overage_price_cents integer NOT NULL DEFAULT 0,
  reset_cycle text NOT NULL DEFAULT 'monthly',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_provider_usage_profiles_provider_key_check'
      AND conrelid = 'public.tenant_provider_usage_profiles'::regclass
  ) THEN
    ALTER TABLE public.tenant_provider_usage_profiles
      ADD CONSTRAINT tenant_provider_usage_profiles_provider_key_check
      CHECK (provider_key IN ('mercadopago', 'onesignal', 'google_maps', 'whatsapp_meta'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_provider_usage_profiles_billing_model_check'
      AND conrelid = 'public.tenant_provider_usage_profiles'::regclass
  ) THEN
    ALTER TABLE public.tenant_provider_usage_profiles
      ADD CONSTRAINT tenant_provider_usage_profiles_billing_model_check
      CHECK (billing_model IN ('none', 'package', 'usage', 'package_plus_overage'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_provider_usage_profiles_reset_cycle_check'
      AND conrelid = 'public.tenant_provider_usage_profiles'::regclass
  ) THEN
    ALTER TABLE public.tenant_provider_usage_profiles
      ADD CONSTRAINT tenant_provider_usage_profiles_reset_cycle_check
      CHECK (reset_cycle IN ('daily', 'monthly'));
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_provider_usage_profiles_unique_idx
  ON public.tenant_provider_usage_profiles (tenant_id, provider_key);

CREATE TABLE IF NOT EXISTS public.tenant_provider_metering_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_key text NOT NULL,
  usage_key text NOT NULL,
  quantity numeric(18, 4) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'unit',
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  correlation_id text,
  idempotency_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_provider_metering_events_provider_key_check'
      AND conrelid = 'public.tenant_provider_metering_events'::regclass
  ) THEN
    ALTER TABLE public.tenant_provider_metering_events
      ADD CONSTRAINT tenant_provider_metering_events_provider_key_check
      CHECK (provider_key IN ('mercadopago', 'onesignal', 'google_maps', 'whatsapp_meta'));
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_provider_metering_events_idempotency_idx
  ON public.tenant_provider_metering_events (tenant_id, provider_key, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS tenant_provider_metering_events_lookup_idx
  ON public.tenant_provider_metering_events (tenant_id, provider_key, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.tenant_provider_daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_key text NOT NULL,
  usage_date date NOT NULL,
  total_quantity numeric(18, 4) NOT NULL DEFAULT 0,
  event_count integer NOT NULL DEFAULT 0,
  estimated_cost_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_provider_daily_usage_provider_key_check'
      AND conrelid = 'public.tenant_provider_daily_usage'::regclass
  ) THEN
    ALTER TABLE public.tenant_provider_daily_usage
      ADD CONSTRAINT tenant_provider_daily_usage_provider_key_check
      CHECK (provider_key IN ('mercadopago', 'onesignal', 'google_maps', 'whatsapp_meta'));
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_provider_daily_usage_unique_idx
  ON public.tenant_provider_daily_usage (tenant_id, provider_key, usage_date);

CREATE TABLE IF NOT EXISTS public.tenant_provider_monthly_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_key text NOT NULL,
  period_month date NOT NULL,
  total_quantity numeric(18, 4) NOT NULL DEFAULT 0,
  package_quota numeric(18, 4) NOT NULL DEFAULT 0,
  included_quantity numeric(18, 4) NOT NULL DEFAULT 0,
  overage_quantity numeric(18, 4) NOT NULL DEFAULT 0,
  estimated_cost_cents integer NOT NULL DEFAULT 0,
  final_cost_cents integer,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_provider_monthly_snapshots_provider_key_check'
      AND conrelid = 'public.tenant_provider_monthly_snapshots'::regclass
  ) THEN
    ALTER TABLE public.tenant_provider_monthly_snapshots
      ADD CONSTRAINT tenant_provider_monthly_snapshots_provider_key_check
      CHECK (provider_key IN ('mercadopago', 'onesignal', 'google_maps', 'whatsapp_meta'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_provider_monthly_snapshots_status_check'
      AND conrelid = 'public.tenant_provider_monthly_snapshots'::regclass
  ) THEN
    ALTER TABLE public.tenant_provider_monthly_snapshots
      ADD CONSTRAINT tenant_provider_monthly_snapshots_status_check
      CHECK (status IN ('open', 'closed', 'billed', 'waived'));
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_provider_monthly_snapshots_unique_idx
  ON public.tenant_provider_monthly_snapshots (tenant_id, provider_key, period_month);

CREATE TABLE IF NOT EXISTS public.tenant_membership_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dashboard_access_user_id uuid REFERENCES public.dashboard_access_users(id) ON DELETE SET NULL,
  actor_dashboard_access_user_id uuid REFERENCES public.dashboard_access_users(id) ON DELETE SET NULL,
  actor_email text,
  target_email text,
  action text NOT NULL,
  old_role text,
  new_role text,
  old_is_active boolean,
  new_is_active boolean,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_membership_audit_logs_action_check'
      AND conrelid = 'public.tenant_membership_audit_logs'::regclass
  ) THEN
    ALTER TABLE public.tenant_membership_audit_logs
      ADD CONSTRAINT tenant_membership_audit_logs_action_check
      CHECK (action IN ('invite', 'activate', 'suspend', 'revoke', 'role_change', 'owner_bootstrap'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS tenant_membership_audit_logs_lookup_idx
  ON public.tenant_membership_audit_logs (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.tenant_onboarding_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  current_step text,
  started_by_email text,
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_onboarding_runs_status_check'
      AND conrelid = 'public.tenant_onboarding_runs'::regclass
  ) THEN
    ALTER TABLE public.tenant_onboarding_runs
      ADD CONSTRAINT tenant_onboarding_runs_status_check
      CHECK (status IN ('draft', 'in_progress', 'blocked', 'completed', 'cancelled'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS tenant_onboarding_runs_lookup_idx
  ON public.tenant_onboarding_runs (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.tenant_onboarding_step_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_run_id uuid NOT NULL REFERENCES public.tenant_onboarding_runs(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  performed_by_email text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_onboarding_step_logs_status_check'
      AND conrelid = 'public.tenant_onboarding_step_logs'::regclass
  ) THEN
    ALTER TABLE public.tenant_onboarding_step_logs
      ADD CONSTRAINT tenant_onboarding_step_logs_status_check
      CHECK (status IN ('pending', 'completed', 'skipped', 'blocked'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS tenant_onboarding_step_logs_lookup_idx
  ON public.tenant_onboarding_step_logs (tenant_id, onboarding_run_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.tenant_configuration_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category text NOT NULL,
  actor_email text,
  actor_dashboard_access_user_id uuid REFERENCES public.dashboard_access_users(id) ON DELETE SET NULL,
  source_module text,
  change_summary text,
  before_json jsonb,
  after_json jsonb,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_configuration_audit_logs_category_check'
      AND conrelid = 'public.tenant_configuration_audit_logs'::regclass
  ) THEN
    ALTER TABLE public.tenant_configuration_audit_logs
      ADD CONSTRAINT tenant_configuration_audit_logs_category_check
      CHECK (category IN ('branding', 'domains', 'feature_flags', 'provider_config', 'billing_profile', 'membership', 'tenant_status', 'onboarding'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS tenant_configuration_audit_logs_lookup_idx
  ON public.tenant_configuration_audit_logs (tenant_id, category, created_at DESC);

ALTER TABLE public.tenant_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_provider_usage_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_provider_metering_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_provider_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_provider_monthly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_membership_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_onboarding_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_onboarding_step_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_configuration_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_all_tenant_provider_configs ON public.tenant_provider_configs;
CREATE POLICY service_role_all_tenant_provider_configs
  ON public.tenant_provider_configs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all_tenant_provider_usage_profiles ON public.tenant_provider_usage_profiles;
CREATE POLICY service_role_all_tenant_provider_usage_profiles
  ON public.tenant_provider_usage_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all_tenant_provider_metering_events ON public.tenant_provider_metering_events;
CREATE POLICY service_role_all_tenant_provider_metering_events
  ON public.tenant_provider_metering_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all_tenant_provider_daily_usage ON public.tenant_provider_daily_usage;
CREATE POLICY service_role_all_tenant_provider_daily_usage
  ON public.tenant_provider_daily_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all_tenant_provider_monthly_snapshots ON public.tenant_provider_monthly_snapshots;
CREATE POLICY service_role_all_tenant_provider_monthly_snapshots
  ON public.tenant_provider_monthly_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all_tenant_membership_audit_logs ON public.tenant_membership_audit_logs;
CREATE POLICY service_role_all_tenant_membership_audit_logs
  ON public.tenant_membership_audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all_tenant_onboarding_runs ON public.tenant_onboarding_runs;
CREATE POLICY service_role_all_tenant_onboarding_runs
  ON public.tenant_onboarding_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all_tenant_onboarding_step_logs ON public.tenant_onboarding_step_logs;
CREATE POLICY service_role_all_tenant_onboarding_step_logs
  ON public.tenant_onboarding_step_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all_tenant_configuration_audit_logs ON public.tenant_configuration_audit_logs;
CREATE POLICY service_role_all_tenant_configuration_audit_logs
  ON public.tenant_configuration_audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_tenant_provider_configs_touch_updated_at ON public.tenant_provider_configs;
CREATE TRIGGER trg_tenant_provider_configs_touch_updated_at
  BEFORE UPDATE ON public.tenant_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at_column();

DROP TRIGGER IF EXISTS trg_tenant_provider_usage_profiles_touch_updated_at ON public.tenant_provider_usage_profiles;
CREATE TRIGGER trg_tenant_provider_usage_profiles_touch_updated_at
  BEFORE UPDATE ON public.tenant_provider_usage_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at_column();

DROP TRIGGER IF EXISTS trg_tenant_provider_daily_usage_touch_updated_at ON public.tenant_provider_daily_usage;
CREATE TRIGGER trg_tenant_provider_daily_usage_touch_updated_at
  BEFORE UPDATE ON public.tenant_provider_daily_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at_column();

DROP TRIGGER IF EXISTS trg_tenant_provider_monthly_snapshots_touch_updated_at ON public.tenant_provider_monthly_snapshots;
CREATE TRIGGER trg_tenant_provider_monthly_snapshots_touch_updated_at
  BEFORE UPDATE ON public.tenant_provider_monthly_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at_column();

DROP TRIGGER IF EXISTS trg_tenant_onboarding_runs_touch_updated_at ON public.tenant_onboarding_runs;
CREATE TRIGGER trg_tenant_onboarding_runs_touch_updated_at
  BEFORE UPDATE ON public.tenant_onboarding_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at_column();

INSERT INTO public.tenant_provider_configs (
  tenant_id,
  provider_key,
  environment_mode,
  status,
  credential_mode,
  enabled,
  sender_identifier,
  base_url,
  public_config,
  secret_config,
  fail_safe_enabled,
  config_version,
  last_validated_at
)
VALUES
  (
    'dccf4492-9576-479c-8594-2795bd6b81d7',
    'mercadopago',
    'all',
    'active',
    'environment_fallback',
    true,
    'estudio-corpo-alma-main',
    'https://api.mercadopago.com',
    jsonb_build_object('public_key_mode', 'environment_fallback'),
    '{}'::jsonb,
    true,
    1,
    timezone('utc', now())
  ),
  (
    'dccf4492-9576-479c-8594-2795bd6b81d7',
    'onesignal',
    'all',
    'active',
    'environment_fallback',
    true,
    'onesignal-main-app',
    'https://api.onesignal.com',
    jsonb_build_object('app_id_mode', 'environment_fallback', 'safari_web_id_mode', 'environment_fallback'),
    '{}'::jsonb,
    true,
    1,
    timezone('utc', now())
  ),
  (
    'dccf4492-9576-479c-8594-2795bd6b81d7',
    'google_maps',
    'all',
    'active',
    'platform_shared',
    true,
    'maps-platform-main',
    'https://routes.googleapis.com',
    jsonb_build_object('origin_address', 'Supermercado Daolio, Centro, Amparo - SP, Brasil'),
    '{}'::jsonb,
    true,
    1,
    timezone('utc', now())
  ),
  (
    'dccf4492-9576-479c-8594-2795bd6b81d7',
    'whatsapp_meta',
    'all',
    'active',
    'platform_shared',
    true,
    'meta-cloud-main',
    'https://graph.facebook.com',
    '{}'::jsonb,
    '{}'::jsonb,
    true,
    1,
    timezone('utc', now())
  )
ON CONFLICT (tenant_id, provider_key, environment_mode) DO UPDATE
SET
  status = EXCLUDED.status,
  credential_mode = EXCLUDED.credential_mode,
  enabled = EXCLUDED.enabled,
  sender_identifier = EXCLUDED.sender_identifier,
  base_url = EXCLUDED.base_url,
  public_config = COALESCE(public.tenant_provider_configs.public_config, '{}'::jsonb) || EXCLUDED.public_config,
  fail_safe_enabled = EXCLUDED.fail_safe_enabled,
  config_version = GREATEST(public.tenant_provider_configs.config_version, EXCLUDED.config_version),
  last_validated_at = EXCLUDED.last_validated_at,
  updated_at = timezone('utc', now());

INSERT INTO public.tenant_provider_usage_profiles (
  tenant_id,
  provider_key,
  billing_model,
  currency,
  package_quota,
  package_price_cents,
  unit_price_cents,
  overage_price_cents,
  reset_cycle,
  is_active
)
VALUES
  (
    'dccf4492-9576-479c-8594-2795bd6b81d7',
    'google_maps',
    'package_plus_overage',
    'BRL',
    500,
    0,
    0,
    35,
    'monthly',
    true
  ),
  (
    'dccf4492-9576-479c-8594-2795bd6b81d7',
    'onesignal',
    'package_plus_overage',
    'BRL',
    3000,
    0,
    0,
    8,
    'monthly',
    true
  )
ON CONFLICT (tenant_id, provider_key) DO UPDATE
SET
  billing_model = EXCLUDED.billing_model,
  currency = EXCLUDED.currency,
  package_quota = EXCLUDED.package_quota,
  package_price_cents = EXCLUDED.package_price_cents,
  unit_price_cents = EXCLUDED.unit_price_cents,
  overage_price_cents = EXCLUDED.overage_price_cents,
  reset_cycle = EXCLUDED.reset_cycle,
  is_active = EXCLUDED.is_active,
  updated_at = timezone('utc', now());

INSERT INTO public.tenants (
  id,
  slug,
  name,
  legal_name,
  status,
  timezone,
  locale,
  base_city,
  base_state,
  support_email,
  support_phone,
  created_at,
  updated_at
)
VALUES (
  '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01',
  'salao-aurora-demo',
  'Salao Aurora',
  'Salao Aurora Beleza e Bem-Estar LTDA',
  'draft',
  'America/Sao_Paulo',
  'pt-BR',
  'Campinas',
  'SP',
  'operacao@salaoaurora.demo',
  '+5511999990000',
  timezone('utc', now()),
  timezone('utc', now())
)
ON CONFLICT (id) DO UPDATE
SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  legal_name = EXCLUDED.legal_name,
  status = EXCLUDED.status,
  timezone = EXCLUDED.timezone,
  locale = EXCLUDED.locale,
  base_city = EXCLUDED.base_city,
  base_state = EXCLUDED.base_state,
  support_email = EXCLUDED.support_email,
  support_phone = EXCLUDED.support_phone,
  updated_at = timezone('utc', now());

INSERT INTO public.tenant_branding (
  tenant_id,
  display_name,
  public_app_name,
  logo_url,
  logo_horizontal_url,
  logo_light_url,
  logo_dark_url,
  icon_url,
  favicon_url,
  primary_color,
  secondary_color,
  accent_color,
  background_color,
  surface_color,
  on_primary_color,
  on_surface_color,
  surface_style,
  heading_font_family,
  body_font_family,
  font_strategy,
  radius_strategy,
  illustration_style
)
VALUES (
  '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01',
  'Salao Aurora',
  'Salao Aurora',
  '/brand/logo.png',
  '/brand/logo-horizontal.png',
  '/brand/logo-horizontal.png',
  '/brand/logo-white.png',
  '/brand/icon.png',
  '/brand/icon.png',
  '#2E6D5A',
  '#F2C7A3',
  '#E38756',
  '#F8F6F2',
  '#FFFFFF',
  '#FFFFFF',
  '#173B32',
  'warm',
  NULL,
  NULL,
  'platform_default',
  'balanced',
  'platform_default'
)
ON CONFLICT (tenant_id) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  public_app_name = EXCLUDED.public_app_name,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  accent_color = EXCLUDED.accent_color,
  background_color = EXCLUDED.background_color,
  surface_color = EXCLUDED.surface_color,
  on_primary_color = EXCLUDED.on_primary_color,
  on_surface_color = EXCLUDED.on_surface_color,
  surface_style = EXCLUDED.surface_style,
  font_strategy = EXCLUDED.font_strategy,
  radius_strategy = EXCLUDED.radius_strategy,
  illustration_style = EXCLUDED.illustration_style,
  updated_at = timezone('utc', now());

INSERT INTO public.tenant_domains (
  tenant_id,
  domain,
  type,
  is_primary,
  is_active,
  verified_at
)
VALUES
  (
    '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01',
    'salao-aurora-demo.vercel.app',
    'dashboard',
    true,
    true,
    NULL
  ),
  (
    '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01',
    'public-salao-aurora-demo.vercel.app',
    'preview_public',
    true,
    true,
    NULL
  )
ON CONFLICT (LOWER(domain)) DO UPDATE
SET
  tenant_id = EXCLUDED.tenant_id,
  type = EXCLUDED.type,
  is_primary = EXCLUDED.is_primary,
  is_active = EXCLUDED.is_active,
  updated_at = timezone('utc', now());

WITH updated_settings AS (
  UPDATE public.settings
  SET
    public_base_url = 'https://public-salao-aurora-demo.vercel.app',
    signal_percentage = 30,
    default_studio_buffer = COALESCE(default_studio_buffer, 30),
    default_home_buffer = COALESCE(default_home_buffer, 30),
    buffer_before_minutes = COALESCE(buffer_before_minutes, 30),
    buffer_after_minutes = COALESCE(buffer_after_minutes, 30),
    whatsapp_automation_enabled = COALESCE(whatsapp_automation_enabled, false),
    updated_at = timezone('utc', now())
  WHERE tenant_id = '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01'
  RETURNING id
)
INSERT INTO public.settings (
  tenant_id,
  public_base_url,
  signal_percentage,
  default_studio_buffer,
  default_home_buffer,
  buffer_before_minutes,
  buffer_after_minutes,
  whatsapp_automation_enabled
)
SELECT
  '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01',
  'https://public-salao-aurora-demo.vercel.app',
  30,
  30,
  30,
  30,
  30,
  false
WHERE NOT EXISTS (SELECT 1 FROM updated_settings)
  AND NOT EXISTS (
    SELECT 1
    FROM public.settings
    WHERE tenant_id = '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01'
  );

INSERT INTO public.dashboard_access_users (
  tenant_id,
  email,
  role,
  is_active
)
VALUES (
  '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01',
  'owner@salaoaurora.demo',
  'owner',
  false
)
ON CONFLICT (tenant_id, email) DO UPDATE
SET
  role = EXCLUDED.role,
  updated_at = timezone('utc', now());

INSERT INTO public.tenant_provider_configs (
  tenant_id,
  provider_key,
  environment_mode,
  status,
  credential_mode,
  enabled,
  sender_identifier,
  base_url,
  public_config,
  secret_config,
  fail_safe_enabled,
  config_version
)
VALUES
  (
    '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01',
    'mercadopago',
    'all',
    'draft',
    'tenant_secret',
    false,
    'salao-aurora-mp',
    'https://api.mercadopago.com',
    '{}'::jsonb,
    '{}'::jsonb,
    true,
    1
  ),
  (
    '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01',
    'onesignal',
    'all',
    'draft',
    'tenant_secret',
    false,
    'salao-aurora-push',
    'https://api.onesignal.com',
    '{}'::jsonb,
    '{}'::jsonb,
    true,
    1
  ),
  (
    '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01',
    'google_maps',
    'all',
    'active',
    'platform_shared',
    true,
    'maps-platform-shared',
    'https://routes.googleapis.com',
    jsonb_build_object('origin_address', 'Campinas, SP, Brasil'),
    '{}'::jsonb,
    true,
    1
  ),
  (
    '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01',
    'whatsapp_meta',
    'all',
    'draft',
    'tenant_secret',
    false,
    'salao-aurora-meta',
    'https://graph.facebook.com',
    '{}'::jsonb,
    '{}'::jsonb,
    true,
    1
  )
ON CONFLICT (tenant_id, provider_key, environment_mode) DO UPDATE
SET
  status = EXCLUDED.status,
  credential_mode = EXCLUDED.credential_mode,
  enabled = EXCLUDED.enabled,
  public_config = EXCLUDED.public_config,
  fail_safe_enabled = EXCLUDED.fail_safe_enabled,
  updated_at = timezone('utc', now());

INSERT INTO public.tenant_provider_usage_profiles (
  tenant_id,
  provider_key,
  billing_model,
  currency,
  package_quota,
  package_price_cents,
  unit_price_cents,
  overage_price_cents,
  reset_cycle,
  is_active
)
VALUES
  (
    '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01',
    'google_maps',
    'package_plus_overage',
    'BRL',
    200,
    0,
    0,
    35,
    'monthly',
    true
  ),
  (
    '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01',
    'onesignal',
    'package_plus_overage',
    'BRL',
    1000,
    0,
    0,
    8,
    'monthly',
    true
  )
ON CONFLICT (tenant_id, provider_key) DO UPDATE
SET
  billing_model = EXCLUDED.billing_model,
  package_quota = EXCLUDED.package_quota,
  overage_price_cents = EXCLUDED.overage_price_cents,
  is_active = EXCLUDED.is_active,
  updated_at = timezone('utc', now());

INSERT INTO public.tenant_onboarding_runs (
  tenant_id,
  status,
  current_step,
  started_by_email,
  notes,
  started_at
)
VALUES (
  '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01',
  'in_progress',
  'integrations',
  'owner@salaoaurora.demo',
  'Tenant de homologacao criado automaticamente para prova WL-9.',
  timezone('utc', now())
)
ON CONFLICT DO NOTHING;

INSERT INTO public.tenant_configuration_audit_logs (
  tenant_id,
  category,
  actor_email,
  source_module,
  change_summary,
  after_json,
  correlation_id
)
VALUES
  (
    'dccf4492-9576-479c-8594-2795bd6b81d7',
    'provider_config',
    'system@codex.local',
    'wl5.migration',
    'Provider governance and usage billing baseline configured for main tenant.',
    jsonb_build_object('providers', jsonb_build_array('mercadopago', 'onesignal', 'google_maps', 'whatsapp_meta')),
    'wl5-seed-main-tenant'
  ),
  (
    '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01',
    'onboarding',
    'system@codex.local',
    'wl9.migration',
    'Homologation tenant seeded for WL-9 proof.',
    jsonb_build_object('slug', 'salao-aurora-demo', 'status', 'draft'),
    'wl9-seed-homolog'
  )
ON CONFLICT DO NOTHING;

COMMIT;
