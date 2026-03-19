-- WL-10 dominio de homologacao: substitui placeholders 404 por dominios reais
-- de producao Vercel para o tenant secundario.
-- Impacto em RLS: nenhum (somente DML).
-- Impacto em indices: nenhum.
-- Rollback: reativar dominios placeholders e ajustar public_base_url anterior.

BEGIN;

DO $$
DECLARE
  v_tenant_id uuid := '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01';
  v_dashboard_domain text := 'estudio-corpo-alma-humanizado-web-renato-mazzarinos-projects.vercel.app';
  v_public_domain text := 'estudio-corpo-alma-humani-git-504855-renato-mazzarinos-projects.vercel.app';
  v_now timestamptz := timezone('utc', now());
BEGIN
  -- Desativa placeholders de dominio que retornam 404.
  UPDATE public.tenant_domains
  SET
    is_active = false,
    is_primary = false,
    updated_at = v_now
  WHERE tenant_id = v_tenant_id
    AND LOWER(domain) IN (
      'salao-aurora-demo.vercel.app',
      'public-salao-aurora-demo.vercel.app'
    );

  -- Registra dominio funcional para dashboard do tenant secundario.
  INSERT INTO public.tenant_domains (
    tenant_id,
    domain,
    type,
    is_primary,
    is_active,
    verified_at
  )
  VALUES (
    v_tenant_id,
    v_dashboard_domain,
    'dashboard',
    true,
    true,
    v_now
  )
  ON CONFLICT (LOWER(domain)) DO UPDATE
  SET
    tenant_id = EXCLUDED.tenant_id,
    type = EXCLUDED.type,
    is_primary = EXCLUDED.is_primary,
    is_active = EXCLUDED.is_active,
    verified_at = COALESCE(public.tenant_domains.verified_at, EXCLUDED.verified_at),
    updated_at = v_now;

  -- Registra dominio funcional para links publicos de homologacao.
  INSERT INTO public.tenant_domains (
    tenant_id,
    domain,
    type,
    is_primary,
    is_active,
    verified_at
  )
  VALUES (
    v_tenant_id,
    v_public_domain,
    'preview_public',
    true,
    true,
    v_now
  )
  ON CONFLICT (LOWER(domain)) DO UPDATE
  SET
    tenant_id = EXCLUDED.tenant_id,
    type = EXCLUDED.type,
    is_primary = EXCLUDED.is_primary,
    is_active = EXCLUDED.is_active,
    verified_at = COALESCE(public.tenant_domains.verified_at, EXCLUDED.verified_at),
    updated_at = v_now;

  -- Base publica canônica do tenant secundario em dominio valido.
  UPDATE public.settings
  SET
    public_base_url = 'https://' || v_public_domain,
    updated_at = v_now
  WHERE tenant_id = v_tenant_id;

  INSERT INTO public.tenant_configuration_audit_logs (
    tenant_id,
    category,
    actor_email,
    source_module,
    change_summary,
    before_json,
    after_json,
    correlation_id,
    created_at
  )
  VALUES (
    v_tenant_id,
    'domains',
    'owner@salaoaurora.demo',
    'tenancy.migration.fix_secondary_domains',
    'Dominios de homologacao substituidos por aliases Vercel validos (HTTP 200).',
    jsonb_build_object(
      'dashboard', 'salao-aurora-demo.vercel.app',
      'public', 'public-salao-aurora-demo.vercel.app'
    ),
    jsonb_build_object(
      'dashboard', v_dashboard_domain,
      'public', v_public_domain
    ),
    'wl10-fix-secondary-domains',
    v_now
  )
  ON CONFLICT DO NOTHING;
END;
$$;

COMMIT;
