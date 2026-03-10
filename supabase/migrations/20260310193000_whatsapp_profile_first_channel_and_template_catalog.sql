-- WhatsApp profile-first canonical structure:
-- 1) Canal por ambiente (evita flags soltas por env)
-- 2) Catálogo oficial notification_templates com status/qualidade/categoria

create table if not exists public.whatsapp_environment_channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  environment text not null check (environment in ('development', 'preview', 'production')),
  profile text not null check (profile in ('dev_sandbox', 'preview_real_test', 'prod_real')),
  provider text not null default 'meta_cloud' check (provider in ('meta_cloud')),
  enabled boolean not null default true,
  sender_phone_number_id text null,
  sender_display_phone text null,
  force_test_recipient boolean not null default true,
  test_recipient_e164 text null,
  default_language_code text not null default 'pt_BR',
  allowed_created_template_names text[] not null default '{}'::text[],
  allowed_reminder_template_names text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, environment)
);

alter table public.whatsapp_environment_channels enable row level security;

drop policy if exists "Admin whatsapp_environment_channels access" on public.whatsapp_environment_channels;
create policy "Admin whatsapp_environment_channels access"
  on public.whatsapp_environment_channels
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

with env_profiles as (
  select * from (
    values
      ('development'::text, 'dev_sandbox'::text, true),
      ('preview'::text, 'preview_real_test'::text, true),
      ('production'::text, 'prod_real'::text, false)
  ) as t(environment, profile, force_test_recipient)
),
template_lists as (
  select
    array[
      'aviso_agendamento_no_estudio_com_sinal_pago_com_flora',
      'aviso_agendamento_no_estudio_com_sinal_pago_sem_oi_flora',
      'aviso_agendamento_no_estudio_pago_integral_com_flora',
      'aviso_agendamento_no_estudio_pago_integral_sem_oi_flora',
      'aviso_agendamento_domicilio_sinal_pago_com_flora',
      'aviso_agendamento_domicilio_sinal_pago_sem_oi_flora',
      'aviso_agendamento_domicilio_pago_integral_com_flora',
      'aviso_agendamento_domicilio_pago_integral_sem_oi_flora',
      'aviso_agendamento_estudio_pagamento_no_atendimento_com_flora',
      'aviso_agendamento_estudio_pagamento_no_atendimento_sem_oi_flora',
      'aviso_agendamento_domicilio_pagamento_no_atendimento_com_flora',
      'aviso_agendamento_domicilio_pagamento_no_atendimento_sem_oi_flora'
    ]::text[] as created_templates,
    array['confirmacao_de_agendamento_24h']::text[] as reminder_templates
)
insert into public.whatsapp_environment_channels (
  tenant_id,
  environment,
  profile,
  provider,
  enabled,
  force_test_recipient,
  default_language_code,
  allowed_created_template_names,
  allowed_reminder_template_names
)
select
  tenants.id,
  env_profiles.environment,
  env_profiles.profile,
  'meta_cloud',
  true,
  env_profiles.force_test_recipient,
  'pt_BR',
  template_lists.created_templates,
  template_lists.reminder_templates
from public.tenants
cross join env_profiles
cross join template_lists
on conflict (tenant_id, environment) do update
set
  profile = excluded.profile,
  provider = excluded.provider,
  enabled = excluded.enabled,
  force_test_recipient = excluded.force_test_recipient,
  default_language_code = excluded.default_language_code,
  allowed_created_template_names = case
    when cardinality(coalesce(public.whatsapp_environment_channels.allowed_created_template_names, '{}'::text[])) > 0
      then public.whatsapp_environment_channels.allowed_created_template_names
    else excluded.allowed_created_template_names
  end,
  allowed_reminder_template_names = case
    when cardinality(coalesce(public.whatsapp_environment_channels.allowed_reminder_template_names, '{}'::text[])) > 0
      then public.whatsapp_environment_channels.allowed_reminder_template_names
    else excluded.allowed_reminder_template_names
  end,
  updated_at = now();

alter table public.notification_templates
  add column if not exists provider text not null default 'meta',
  add column if not exists provider_template_id text null,
  add column if not exists language_code text not null default 'pt_BR',
  add column if not exists status text not null default 'unknown',
  add column if not exists quality text null,
  add column if not exists category text null,
  add column if not exists source text not null default 'manual',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists last_synced_at timestamptz null;

alter table public.notification_templates
  alter column body drop not null;

update public.notification_templates
set
  provider = coalesce(nullif(trim(provider), ''), 'meta'),
  language_code = coalesce(nullif(trim(language_code), ''), 'pt_BR'),
  status = coalesce(nullif(trim(status), ''), 'unknown'),
  source = coalesce(nullif(trim(source), ''), 'manual'),
  metadata = coalesce(metadata, '{}'::jsonb)
where true;

create unique index if not exists notification_templates_tenant_channel_name_language_idx
  on public.notification_templates (tenant_id, channel, name, language_code);

drop policy if exists "Admin notification_templates access" on public.notification_templates;
create policy "Admin notification_templates access"
  on public.notification_templates
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
