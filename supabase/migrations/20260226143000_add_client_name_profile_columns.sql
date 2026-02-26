alter table public.clients
  add column if not exists public_first_name text,
  add column if not exists public_last_name text,
  add column if not exists internal_reference text;

comment on column public.clients.public_first_name is
  'Primeiro nome usado em mensagens e telas públicas.';
comment on column public.clients.public_last_name is
  'Sobrenome completo usado em telas públicas.';
comment on column public.clients.internal_reference is
  'Referência interna opcional para compor clients.name como "Primeiro Nome (Referência)".';

-- Backfill genérico (fallback) para linhas que ainda não possuam o perfil de nome preenchido.
with parsed as (
  select
    c.id,
    c.tenant_id,
    nullif(trim(c.name), '') as raw_name,
    nullif(trim(regexp_replace(coalesce(c.name, ''), '\s*\([^)]*\)\s*$', '')), '') as base_name,
    nullif(trim(substring(coalesce(c.name, '') from '\(([^)]*)\)\s*$')), '') as parsed_reference
  from public.clients c
)
update public.clients c
set
  public_first_name = coalesce(
    c.public_first_name,
    nullif(split_part(p.base_name, ' ', 1), '')
  ),
  public_last_name = coalesce(
    c.public_last_name,
    nullif(trim(regexp_replace(coalesce(p.base_name, ''), '^\S+\s*', '')), '')
  ),
  internal_reference = coalesce(c.internal_reference, p.parsed_reference)
from parsed p
where c.id = p.id
  and (
    c.public_first_name is null
    or c.public_last_name is null
    or c.internal_reference is null
  );

-- Backfill curado do tenant de produção (clientes atuais informados manualmente).
with payload (
  client_id,
  tenant_id,
  public_first_name,
  public_last_name,
  internal_reference
) as (
  values
    ('005a971d-39b6-4097-9d61-aef6f123e85c'::uuid, 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid, 'Simone', null, 'Gerente Daolio'),
    ('1a5882b6-2e8a-4619-8688-2e9159ca94cf'::uuid, 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid, 'Ivania', null, null),
    ('1af1b761-7b81-4d8a-b5ce-df4a601ae16e'::uuid, 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid, 'Mariane', null, null),
    ('20e72554-272e-4b68-a69c-9cb2ed55b821'::uuid, 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid, 'Thiago', null, 'Fisioterapeuta'),
    ('696c0864-fb59-4682-a6d4-9badfe956d8e'::uuid, 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid, 'Rosangela', null, 'Karbi'),
    ('7d803f95-9b61-431b-80a0-a931832c9162'::uuid, 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid, 'Daniela', null, 'Guarda Municipal'),
    ('7ffd1ee9-8bdd-4eaf-bdaa-55dbf6f09cfd'::uuid, 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid, 'Roseli', null, null),
    ('a554d7cd-657b-4196-8a5d-8ae3bdde6769'::uuid, 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid, 'Caroline', 'Santos Lima', 'Irmã'),
    ('b82ffd90-f905-4530-813e-152db3ce2a15'::uuid, 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid, 'Luciana', 'Nasr', null),
    ('cce4231f-5259-4cff-8c35-8c8de0ecdd24'::uuid, 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid, 'Silvia', 'Freitas', null),
    ('debb4782-25c1-42f3-a762-567d925bd094'::uuid, 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid, 'Renato', 'Mazzarino', null),
    ('ebee60f8-7dd5-4bef-b628-f704c54c5736'::uuid, 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid, 'Tatiana', 'Boiago', null),
    ('f81d6594-218e-4c6e-b110-94d024c50c7d'::uuid, 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid, 'Renato', null, 'Teste')
)
update public.clients c
set
  public_first_name = p.public_first_name,
  public_last_name = p.public_last_name,
  internal_reference = p.internal_reference,
  name = case
    when p.internal_reference is not null and btrim(p.internal_reference) <> '' then
      p.public_first_name || ' (' || p.internal_reference || ')'
    when p.public_last_name is not null and btrim(p.public_last_name) <> '' then
      p.public_first_name || ' ' || p.public_last_name
    else p.public_first_name
  end,
  initials = upper(substr(regexp_replace(coalesce(p.public_first_name, ''), '\s+', '', 'g'), 1, 2))
from payload p
where c.id = p.client_id
  and c.tenant_id = p.tenant_id;
