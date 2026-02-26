create table if not exists public.public_booking_identity_lookup_guards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_key_hash text not null,
  phone_hash text not null,
  phone_last4 text null,
  completed_cycles integer not null default 0,
  attempts_in_cycle integer not null default 0,
  cooldown_until timestamptz null,
  hard_block_until timestamptz null,
  last_attempt_at timestamptz null,
  last_success_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists public_booking_identity_lookup_guards_unique_idx
  on public.public_booking_identity_lookup_guards (tenant_id, actor_key_hash, phone_hash);

create index if not exists public_booking_identity_lookup_guards_lookup_idx
  on public.public_booking_identity_lookup_guards (tenant_id, updated_at desc);

create table if not exists public.public_booking_identity_lookup_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_key_hash text not null,
  phone_hash text not null,
  phone_last4 text null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists public_booking_identity_lookup_events_idx
  on public.public_booking_identity_lookup_events (tenant_id, created_at desc);

comment on table public.public_booking_identity_lookup_guards is
  'Controle server-side de ciclos/tentativas para lookup de identidade no agendamento online.';

comment on table public.public_booking_identity_lookup_events is
  'Log operacional de eventos de segurança do lookup de identidade (anti-enumeração).';
