create table if not exists public.dashboard_access_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  role text not null default 'staff',
  is_active boolean not null default true,
  auth_user_id uuid null,
  linked_at timestamptz null,
  last_login_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dashboard_access_users_email_not_blank check (char_length(trim(email)) > 0),
  constraint dashboard_access_users_email_normalized check (email = lower(trim(email))),
  constraint dashboard_access_users_role_check check (role = any (array['owner','admin','staff','viewer']::text[]))
);

create unique index if not exists dashboard_access_users_tenant_email_unique
  on public.dashboard_access_users (tenant_id, email);

create unique index if not exists dashboard_access_users_auth_user_unique
  on public.dashboard_access_users (auth_user_id)
  where auth_user_id is not null;

alter table public.dashboard_access_users enable row level security;

drop policy if exists dashboard_access_users_service_role_all on public.dashboard_access_users;
create policy dashboard_access_users_service_role_all
  on public.dashboard_access_users
  to service_role
  using (true)
  with check (true);

insert into public.dashboard_access_users (tenant_id, email, role, is_active)
values
  ('dccf4492-9576-479c-8594-2795bd6b81d7', 'janaina41santos@gmail.com', 'owner', true),
  ('dccf4492-9576-479c-8594-2795bd6b81d7', 'renatomazzarino10@gmail.com', 'admin', true),
  ('dccf4492-9576-479c-8594-2795bd6b81d7', 'renatomazzarinocorp@gmail.com', 'admin', true)
on conflict (tenant_id, email) do update
set
  role = excluded.role,
  is_active = true,
  updated_at = now();

