-- Foundation tables for enterprise realtime/edge/push program.
-- Includes canonical outbox, dispatch logs, dead letter queue, and push delivery artifacts.

create table if not exists public.notification_event_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_id text not null,
  event_type text not null,
  event_version integer not null default 1 check (event_version > 0),
  source_module text not null,
  correlation_id text not null,
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processing', 'processed', 'failed', 'dead')),
  available_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  processed_at timestamptz null,
  last_error text null,
  last_error_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, event_id),
  unique (tenant_id, idempotency_key)
);

create index if not exists notification_event_outbox_status_available_idx
  on public.notification_event_outbox (processing_status, available_at, created_at);

create index if not exists notification_event_outbox_tenant_type_created_idx
  on public.notification_event_outbox (tenant_id, event_type, created_at desc);

alter table public.notification_event_outbox enable row level security;

drop policy if exists "Admin notification_event_outbox access" on public.notification_event_outbox;
create policy "Admin notification_event_outbox access"
  on public.notification_event_outbox
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.notification_dispatch_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  outbox_id uuid null references public.notification_event_outbox(id) on delete set null,
  event_id text not null,
  event_type text not null,
  channel text not null check (channel in ('whatsapp', 'push', 'payments', 'system')),
  status text not null check (status in ('success', 'failed', 'skipped')),
  target text null,
  attempt integer not null default 1 check (attempt > 0),
  duration_ms integer null check (duration_ms is null or duration_ms >= 0),
  correlation_id text not null,
  response_payload jsonb null,
  error_message text null,
  created_at timestamptz not null default now()
);

create index if not exists notification_dispatch_logs_tenant_created_idx
  on public.notification_dispatch_logs (tenant_id, created_at desc);

create index if not exists notification_dispatch_logs_outbox_idx
  on public.notification_dispatch_logs (outbox_id);

alter table public.notification_dispatch_logs enable row level security;

drop policy if exists "Admin notification_dispatch_logs access" on public.notification_dispatch_logs;
create policy "Admin notification_dispatch_logs access"
  on public.notification_dispatch_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.notification_dead_letter_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  outbox_id uuid null references public.notification_event_outbox(id) on delete set null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  correlation_id text not null,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  first_failed_at timestamptz not null default now(),
  moved_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolution_note text null,
  error_message text null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists notification_dead_letter_queue_unresolved_idx
  on public.notification_dead_letter_queue (tenant_id, resolved_at, moved_at desc);

alter table public.notification_dead_letter_queue enable row level security;

drop policy if exists "Admin notification_dead_letter_queue access" on public.notification_dead_letter_queue;
create policy "Admin notification_dead_letter_queue access"
  on public.notification_dead_letter_queue
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  dashboard_access_user_id uuid null references public.dashboard_access_users(id) on delete set null,
  external_id text not null,
  onesignal_subscription_id text not null,
  onesignal_onesignal_id text null,
  platform text not null default 'web_push',
  user_agent text null,
  device_label text null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, onesignal_subscription_id)
);

create index if not exists push_subscriptions_tenant_external_idx
  on public.push_subscriptions (tenant_id, external_id, is_active);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Admin push_subscriptions access" on public.push_subscriptions;
create policy "Admin push_subscriptions access"
  on public.push_subscriptions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.user_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  dashboard_access_user_id uuid null references public.dashboard_access_users(id) on delete set null,
  external_id text not null,
  event_type text not null,
  enabled boolean not null default true,
  channels jsonb not null default '{"push": true}'::jsonb,
  quiet_hours jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, external_id, event_type)
);

create index if not exists user_notification_preferences_tenant_external_idx
  on public.user_notification_preferences (tenant_id, external_id);

alter table public.user_notification_preferences enable row level security;

drop policy if exists "Admin user_notification_preferences access" on public.user_notification_preferences;
create policy "Admin user_notification_preferences access"
  on public.user_notification_preferences
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.push_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  outbox_id uuid null references public.notification_event_outbox(id) on delete set null,
  push_subscription_id uuid null references public.push_subscriptions(id) on delete set null,
  event_id text not null,
  event_type text not null,
  provider text not null default 'onesignal',
  provider_message_id text null,
  status text not null default 'queued' check (status in ('queued', 'success', 'failed', 'retry', 'dead')),
  correlation_id text not null,
  attempt integer not null default 1 check (attempt > 0),
  next_retry_at timestamptz null,
  delivered_at timestamptz null,
  request_payload jsonb null,
  response_payload jsonb null,
  error_message text null,
  created_at timestamptz not null default now()
);

create index if not exists push_delivery_attempts_status_retry_idx
  on public.push_delivery_attempts (status, next_retry_at, created_at);

create index if not exists push_delivery_attempts_tenant_created_idx
  on public.push_delivery_attempts (tenant_id, created_at desc);

alter table public.push_delivery_attempts enable row level security;

drop policy if exists "Admin push_delivery_attempts access" on public.push_delivery_attempts;
create policy "Admin push_delivery_attempts access"
  on public.push_delivery_attempts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

do $$
declare
  v_table_name text;
  table_names text[] := array[
    'notification_templates',
    'whatsapp_webhook_events',
    'notification_event_outbox',
    'notification_dispatch_logs',
    'notification_dead_letter_queue',
    'push_delivery_attempts'
  ];
begin
  foreach v_table_name in array table_names
  loop
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = v_table_name
    ) then
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = v_table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', v_table_name);
      end if;
    end if;
  end loop;
end
$$;
