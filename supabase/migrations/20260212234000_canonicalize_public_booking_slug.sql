-- Padroniza o slug publico do tenant principal para evitar rotas divergentes entre ambientes.
do $$
declare
  target_tenant_id uuid := 'dccf4492-9576-479c-8594-2795bd6b81d7';
  canonical_slug text := 'estudio-corpo-alma';
  conflicting_tenant_id uuid;
begin
  select id
    into conflicting_tenant_id
    from public.tenants
   where slug = canonical_slug
     and id <> target_tenant_id
   limit 1;

  if conflicting_tenant_id is not null then
    raise exception
      'Nao foi possivel padronizar slug para "%": slug ja usado pelo tenant %',
      canonical_slug,
      conflicting_tenant_id;
  end if;

  update public.tenants
     set slug = canonical_slug
   where id = target_tenant_id
     and slug is distinct from canonical_slug;
end
$$;
