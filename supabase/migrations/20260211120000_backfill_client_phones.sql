-- Backfill: move legacy clients.phone into client_phones (only when missing)

insert into public.client_phones (
  client_id,
  tenant_id,
  label,
  number_raw,
  number_e164,
  is_primary,
  is_whatsapp
)
select
  c.id,
  c.tenant_id,
  'Principal',
  c.phone,
  null,
  true,
  true
from public.clients c
where c.phone is not null
  and length(trim(c.phone)) > 0
  and not exists (
    select 1
    from public.client_phones cp
    where cp.client_id = c.id
  );
