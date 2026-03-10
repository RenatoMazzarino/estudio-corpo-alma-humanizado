-- Align WhatsApp reminder templates to the new 24h matrix and seed the template catalog.

DO $$
DECLARE
  v_default_reminder text := 'lembrete_confirmacao_24h_estudio_saldo_pendente';
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'settings'
      AND column_name = 'whatsapp_template_reminder_name'
  ) THEN
    EXECUTE format(
      $sql$
      UPDATE public.settings
      SET whatsapp_template_reminder_name = %L
      WHERE whatsapp_template_reminder_name IS NULL
         OR btrim(whatsapp_template_reminder_name) = ''
         OR btrim(whatsapp_template_reminder_name) = 'confirmacao_de_agendamento_24h'
      $sql$,
      v_default_reminder
    );

    EXECUTE format(
      'ALTER TABLE public.settings ALTER COLUMN whatsapp_template_reminder_name SET DEFAULT %L',
      v_default_reminder
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_environment_channels'
  ) THEN
    WITH defaults AS (
      SELECT ARRAY[
        'lembrete_confirmacao_24h_estudio_pago_integral',
        'lembrete_confirmacao_24h_estudio_saldo_pendente',
        'lembrete_confirmacao_24h_domicilio_pago_integral',
        'lembrete_confirmacao_24h_domicilio_saldo_pendente'
      ]::text[] AS reminder_templates
    ),
    normalized AS (
      SELECT
        c.id,
        ARRAY(
          SELECT DISTINCT trimmed_name
          FROM (
            SELECT btrim(item) AS trimmed_name
            FROM unnest(
              array_remove(coalesce(c.allowed_reminder_template_names, '{}'::text[]), 'confirmacao_de_agendamento_24h')
              || d.reminder_templates
            ) AS item
          ) names
          WHERE trimmed_name <> ''
        ) AS merged_templates
      FROM public.whatsapp_environment_channels c
      CROSS JOIN defaults d
    )
    UPDATE public.whatsapp_environment_channels c
    SET
      allowed_reminder_template_names = CASE
        WHEN cardinality(normalized.merged_templates) > 0 THEN normalized.merged_templates
        ELSE ARRAY[
          'lembrete_confirmacao_24h_estudio_pago_integral',
          'lembrete_confirmacao_24h_estudio_saldo_pendente',
          'lembrete_confirmacao_24h_domicilio_pago_integral',
          'lembrete_confirmacao_24h_domicilio_saldo_pendente'
        ]::text[]
      END,
      updated_at = now()
    FROM normalized
    WHERE c.id = normalized.id;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'notification_templates'
  ) THEN
    WITH template_seed(name, status, template_group) AS (
      VALUES
        ('aviso_agendamento_no_estudio_com_sinal_pago_com_flora', 'active', 'appointment_notice_variations'),
        ('aviso_agendamento_no_estudio_com_sinal_pago_sem_oi_flora', 'active', 'appointment_notice_variations'),
        ('aviso_agendamento_no_estudio_pago_integral_com_flora', 'active', 'appointment_notice_variations'),
        ('aviso_agendamento_no_estudio_pago_integral_sem_oi_flora', 'active', 'appointment_notice_variations'),
        ('aviso_agendamento_domicilio_sinal_pago_com_flora', 'in_review', 'appointment_notice_variations'),
        ('aviso_agendamento_domicilio_sinal_pago_sem_oi_flora', 'active', 'appointment_notice_variations'),
        ('aviso_agendamento_domicilio_pago_integral_com_flora', 'in_review', 'appointment_notice_variations'),
        ('aviso_agendamento_domicilio_pago_integral_sem_oi_flora', 'active', 'appointment_notice_variations'),
        ('aviso_agendamento_estudio_pagamento_no_atendimento_com_flora', 'active', 'appointment_notice_variations'),
        ('aviso_agendamento_estudio_pagamento_no_atendimento_sem_oi_flora', 'active', 'appointment_notice_variations'),
        ('aviso_agendamento_domicilio_pagamento_no_atendimento_com_flora', 'in_review', 'appointment_notice_variations'),
        ('aviso_agendamento_domicilio_pagamento_no_atendimento_sem_oi_flora', 'active', 'appointment_notice_variations'),
        ('lembrete_confirmacao_24h_estudio_pago_integral', 'active', 'appointment_reminder_confirmation_24h'),
        ('lembrete_confirmacao_24h_estudio_saldo_pendente', 'active', 'appointment_reminder_confirmation_24h'),
        ('lembrete_confirmacao_24h_domicilio_pago_integral', 'active', 'appointment_reminder_confirmation_24h'),
        ('lembrete_confirmacao_24h_domicilio_saldo_pendente', 'active', 'appointment_reminder_confirmation_24h')
    ),
    tenant_seed AS (
      SELECT id AS tenant_id
      FROM public.tenants
    )
    INSERT INTO public.notification_templates (
      tenant_id,
      channel,
      name,
      body,
      provider,
      provider_template_id,
      language_code,
      status,
      quality,
      category,
      source,
      metadata,
      last_synced_at,
      updated_at
    )
    SELECT
      t.tenant_id,
      'whatsapp',
      s.name,
      NULL,
      'meta',
      NULL,
      'pt_BR',
      s.status,
      NULL,
      NULL,
      'migration_seed',
      jsonb_build_object('seed', '20260311043000', 'template_group', s.template_group),
      now(),
      now()
    FROM tenant_seed t
    CROSS JOIN template_seed s
    ON CONFLICT (tenant_id, channel, name, language_code)
    DO UPDATE SET
      provider = EXCLUDED.provider,
      status = EXCLUDED.status,
      source = EXCLUDED.source,
      metadata = coalesce(public.notification_templates.metadata, '{}'::jsonb) || EXCLUDED.metadata,
      last_synced_at = EXCLUDED.last_synced_at,
      updated_at = now();
  END IF;
END
$$;
