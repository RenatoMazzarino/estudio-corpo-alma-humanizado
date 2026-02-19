-- Pix keys catalog for internal checkout (multiple keys + active key per tenant)

create table if not exists public.pix_payment_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key_type text not null,
  key_value text not null,
  label text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pix_payment_keys_key_type_check check (key_type in ('cnpj', 'cpf', 'email', 'phone', 'evp')),
  constraint pix_payment_keys_key_value_not_blank check (char_length(trim(key_value)) > 0)
);

-- Normalize existing rows (if table already existed in any environment)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'pix_payment_keys'
  ) then
    with ranked as (
      select
        id,
        row_number() over (
          partition by tenant_id
          order by is_active desc, created_at asc, id asc
        ) as row_number_for_tenant
      from public.pix_payment_keys
    )
    update public.pix_payment_keys p
    set
      is_active = (r.row_number_for_tenant = 1),
      updated_at = now()
    from ranked r
    where p.id = r.id
      and p.is_active is distinct from (r.row_number_for_tenant = 1);
  end if;
end $$;

create index if not exists pix_payment_keys_tenant_idx
  on public.pix_payment_keys (tenant_id);

create unique index if not exists pix_payment_keys_tenant_key_unique
  on public.pix_payment_keys (tenant_id, key_value);

create unique index if not exists pix_payment_keys_active_unique
  on public.pix_payment_keys (tenant_id)
  where is_active = true;

-- Seed default key for tenants that still have no key configured.
insert into public.pix_payment_keys (tenant_id, key_type, key_value, label, is_active)
select
  t.id,
  'cnpj',
  '59163080000149',
  'CNPJ padrão',
  true
from public.tenants t
where not exists (
  select 1
  from public.pix_payment_keys p
  where p.tenant_id = t.id
);
