-- Ajustes curados para clientes de DEV/local (sem impacto no remoto se os nomes não existirem).
update public.clients
set
  public_first_name = 'Renato',
  public_last_name = 'Mazzarino',
  internal_reference = null,
  name = 'Renato Mazzarino',
  initials = 'RE'
where tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid
  and name = 'Renato';

update public.clients
set
  public_first_name = null,
  public_last_name = null,
  internal_reference = 'E2E Card 565381',
  name = 'E2E Card 565381',
  initials = 'E2'
where tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid
  and name in ('E2E Card 565381', 'EE2E Card 565381');

update public.clients
set
  public_first_name = null,
  public_last_name = null,
  internal_reference = 'E2E Pix 565381',
  name = 'E2E Pix 565381',
  initials = 'E2'
where tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid
  and name in ('E2E Pix 565381', 'EE2E Pix 565381');
