-- Enterprise: tenant dynamic foundations + client canonicalization + env->db runtime settings

-- 1) Settings prepared for tenant-level runtime config (timezone and WhatsApp templates/flags)
alter table if exists public.settings
  add column if not exists timezone text;

update public.settings
set timezone = coalesce(nullif(trim(timezone), ''), 'America/Sao_Paulo')
where timezone is null or trim(timezone) = '';

alter table if exists public.settings
  alter column timezone set default 'America/Sao_Paulo';

alter table if exists public.settings
  alter column timezone set not null;

alter table if exists public.settings
  add column if not exists whatsapp_automation_enabled boolean not null default false,
  add column if not exists whatsapp_template_created_name text,
  add column if not exists whatsapp_template_created_language text not null default 'pt_BR',
  add column if not exists whatsapp_template_reminder_name text,
  add column if not exists whatsapp_template_reminder_language text not null default 'pt_BR',
  add column if not exists whatsapp_studio_location_line text;

-- 2) Canonical birth date
update public.clients
set birth_date = data_nascimento
where birth_date is null
  and data_nascimento is not null;

-- 3) Backfill canonical phone records from legacy clients.phone
insert into public.client_phones (
  id,
  client_id,
  tenant_id,
  label,
  number_raw,
  number_e164,
  is_primary,
  is_whatsapp,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  c.id,
  c.tenant_id,
  'Principal',
  c.phone,
  null,
  not exists (
    select 1
    from public.client_phones p0
    where p0.client_id = c.id
      and p0.is_primary = true
  ),
  true,
  now(),
  now()
from public.clients c
where c.phone is not null
  and btrim(c.phone) <> ''
  and not exists (
    select 1
    from public.client_phones p
    where p.client_id = c.id
      and public.normalize_phone_digits(p.number_raw) = public.normalize_phone_digits(c.phone)
  );

-- 4) Backfill canonical email records from legacy clients.email
insert into public.client_emails (
  id,
  client_id,
  tenant_id,
  label,
  email,
  is_primary,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  c.id,
  c.tenant_id,
  'Principal',
  lower(trim(c.email)),
  not exists (
    select 1
    from public.client_emails e0
    where e0.client_id = c.id
      and e0.is_primary = true
  ),
  now(),
  now()
from public.clients c
where c.email is not null
  and btrim(c.email) <> ''
  and not exists (
    select 1
    from public.client_emails e
    where e.client_id = c.id
      and lower(trim(e.email)) = lower(trim(c.email))
  );

-- 5) Backfill canonical address records from legacy clients.address_* and clients.endereco_completo
insert into public.client_addresses (
  id,
  client_id,
  tenant_id,
  label,
  is_primary,
  address_cep,
  address_logradouro,
  address_numero,
  address_complemento,
  address_bairro,
  address_cidade,
  address_estado,
  referencia,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  c.id,
  c.tenant_id,
  'Principal',
  true,
  nullif(trim(c.address_cep), ''),
  nullif(trim(c.address_logradouro), ''),
  nullif(trim(c.address_numero), ''),
  nullif(trim(c.address_complemento), ''),
  nullif(trim(c.address_bairro), ''),
  nullif(trim(c.address_cidade), ''),
  nullif(trim(c.address_estado), ''),
  nullif(trim(c.endereco_completo), ''),
  now(),
  now()
from public.clients c
where (
    coalesce(trim(c.address_cep), '') <> ''
    or coalesce(trim(c.address_logradouro), '') <> ''
    or coalesce(trim(c.address_numero), '') <> ''
    or coalesce(trim(c.address_bairro), '') <> ''
    or coalesce(trim(c.address_cidade), '') <> ''
    or coalesce(trim(c.address_estado), '') <> ''
    or coalesce(trim(c.endereco_completo), '') <> ''
  )
  and not exists (
    select 1
    from public.client_addresses a
    where a.client_id = c.id
  );

-- 6) Drop fixed tenant defaults from tenant_id columns (tenant dynamic safety)
do $$
declare
  rec record;
begin
  for rec in
    select table_schema, table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'tenant_id'
      and column_default is not null
      and column_default like '%dccf4492-9576-479c-8594-2795bd6b81d7%'
  loop
    execute format('alter table %I.%I alter column %I drop default', rec.table_schema, rec.table_name, rec.column_name);
  end loop;
end
$$;

-- 7) Replace hardcoded Admin policies that pin to fixed tenant UUID
do $$
declare
  rec record;
begin
  for rec in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and policyname like 'Admin % access'
      and (
        coalesce(qual, '') like '%dccf4492-9576-479c-8594-2795bd6b81d7%'
        or coalesce(with_check, '') like '%dccf4492-9576-479c-8594-2795bd6b81d7%'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', rec.policyname, rec.schemaname, rec.tablename);
    execute format(
      'create policy %I on %I.%I for all using ((auth.role() = ''service_role''::text)) with check ((auth.role() = ''service_role''::text))',
      rec.policyname,
      rec.schemaname,
      rec.tablename
    );
  end loop;
end
$$;

-- 8) Keep data_nascimento as legacy shadow only during transition.
comment on column public.clients.data_nascimento is
  'LEGADO: manter apenas para transição. Campo canônico é birth_date.';
