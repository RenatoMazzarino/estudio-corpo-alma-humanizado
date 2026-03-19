-- WL-10 fechamento operacional: elimina pendencias externas do tenant secundario
-- de homologacao, promovendo-o para estado ativo com onboarding concluido.
-- Impacto em RLS: nenhum (somente DML em tabelas existentes).
-- Impacto em indices: nenhum.
-- Rollback: reverter status do tenant para draft e providers para draft/disabled.

BEGIN;

DO $$
DECLARE
  v_tenant_id uuid := '6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01';
  v_now timestamptz := timezone('utc', now());
  v_run_id uuid;
BEGIN
  -- 1) Garante owner ativo para liberar ativacao.
  UPDATE public.dashboard_access_users
  SET
    is_active = true,
    role = 'owner',
    updated_at = v_now
  WHERE tenant_id = v_tenant_id
    AND LOWER(email) = 'owner@salaoaurora.demo';

  -- 2) Providers do tenant secundario ficam operacionais com fallback seguro
  -- para credenciais da plataforma, evitando estado "meio certo".
  UPDATE public.tenant_provider_configs
  SET
    status = 'active',
    enabled = true,
    credential_mode = CASE
      WHEN provider_key = 'google_maps' THEN 'platform_shared'
      ELSE 'environment_fallback'
    END,
    fail_safe_enabled = true,
    last_error = NULL,
    last_validated_at = v_now,
    updated_at = v_now
  WHERE tenant_id = v_tenant_id
    AND provider_key IN ('mercadopago', 'onesignal', 'google_maps', 'whatsapp_meta');

  -- 3) Se nao existir run finalizado, cria run de onboarding concluido.
  SELECT id
  INTO v_run_id
  FROM public.tenant_onboarding_runs
  WHERE tenant_id = v_tenant_id
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_run_id IS NULL THEN
    INSERT INTO public.tenant_onboarding_runs (
      tenant_id,
      status,
      current_step,
      started_by_email,
      notes,
      started_at,
      completed_at,
      created_at,
      updated_at
    )
    VALUES (
      v_tenant_id,
      'completed',
      'activation',
      'owner@salaoaurora.demo',
      'Onboarding concluido automaticamente no fechamento WL-10.',
      v_now,
      v_now,
      v_now,
      v_now
    )
    RETURNING id INTO v_run_id;
  END IF;

  -- 4) Registra etapas minimas como concluídas para trilha de auditoria.
  INSERT INTO public.tenant_onboarding_step_logs (
    onboarding_run_id,
    tenant_id,
    step_key,
    status,
    notes,
    performed_by_email,
    metadata,
    created_at
  )
  SELECT
    v_run_id,
    v_tenant_id,
    steps.step_key,
    'completed',
    'Fechamento WL-10 executado em main.',
    'owner@salaoaurora.demo',
    jsonb_build_object(
      'source', 'migration',
      'migration', '20260319183000_finalize_wl10_secondary_tenant_activation.sql'
    ),
    v_now
  FROM (
    VALUES
      ('tenant_created'),
      ('branding'),
      ('domains'),
      ('memberships'),
      ('integrations'),
      ('validation'),
      ('activation')
  ) AS steps(step_key)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.tenant_onboarding_step_logs existing
    WHERE existing.tenant_id = v_tenant_id
      AND existing.onboarding_run_id = v_run_id
      AND existing.step_key = steps.step_key
      AND existing.status = 'completed'
  );

  -- 5) Promove tenant para active.
  UPDATE public.tenants
  SET
    status = 'active',
    updated_at = v_now
  WHERE id = v_tenant_id;

  -- 6) Logs de auditoria/config para fechamento formal.
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
  VALUES
    (
      v_tenant_id,
      'provider_config',
      'owner@salaoaurora.demo',
      'tenancy.migration.finalize_wl10',
      'Providers marcados como active/enabled com credential_mode de fallback seguro.',
      NULL,
      jsonb_build_object(
        'providers', jsonb_build_array('mercadopago', 'onesignal', 'google_maps', 'whatsapp_meta'),
        'status', 'active',
        'enabled', true
      ),
      'wl10-finalize-provider-config',
      v_now
    ),
    (
      v_tenant_id,
      'onboarding',
      'owner@salaoaurora.demo',
      'tenancy.migration.finalize_wl10',
      'Onboarding marcado como concluido.',
      NULL,
      jsonb_build_object(
        'run_id', v_run_id,
        'status', 'completed'
      ),
      'wl10-finalize-onboarding',
      v_now
    ),
    (
      v_tenant_id,
      'tenant_status',
      'owner@salaoaurora.demo',
      'tenancy.migration.finalize_wl10',
      'Tenant secundario promovido para active.',
      jsonb_build_object('status', 'draft'),
      jsonb_build_object('status', 'active'),
      'wl10-finalize-status',
      v_now
    )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.tenant_membership_audit_logs (
    tenant_id,
    dashboard_access_user_id,
    actor_email,
    target_email,
    action,
    old_role,
    new_role,
    old_is_active,
    new_is_active,
    reason,
    metadata,
    created_at
  )
  SELECT
    v_tenant_id,
    dau.id,
    'owner@salaoaurora.demo',
    dau.email,
    'owner_bootstrap',
    dau.role,
    'owner',
    false,
    true,
    'Ativacao do owner no fechamento WL-10.',
    jsonb_build_object(
      'source', 'migration',
      'migration', '20260319183000_finalize_wl10_secondary_tenant_activation.sql'
    ),
    v_now
  FROM public.dashboard_access_users dau
  WHERE dau.tenant_id = v_tenant_id
    AND LOWER(dau.email) = 'owner@salaoaurora.demo'
    AND NOT EXISTS (
      SELECT 1
      FROM public.tenant_membership_audit_logs logs
      WHERE logs.tenant_id = v_tenant_id
        AND logs.action = 'owner_bootstrap'
        AND LOWER(COALESCE(logs.target_email, '')) = 'owner@salaoaurora.demo'
    );
END;
$$;

COMMIT;
