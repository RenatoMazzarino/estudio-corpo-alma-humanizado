-- WL-1: remove heranca single-tenant do schema operacional
-- Objetivo:
-- 1) eliminar DEFAULT tenant_id hardcoded em tabelas core
-- 2) remover policies RLS service_role presas ao tenant original
-- 3) manter o modelo operacional atual baseado em service_role, sem depender
--    do UUID do tenant inicial

do $$
declare
  v_table_name text;
  tables_with_hardcoded_default text[] := array[
    'settings',
    'availability_blocks',
    'transactions',
    'appointment_attendances',
    'appointment_checklist_items',
    'appointment_evolution_entries',
    'appointment_checkout',
    'appointment_checkout_items',
    'appointment_payments',
    'appointment_post',
    'appointment_events',
    'appointment_messages',
    'client_addresses',
    'client_phones',
    'client_emails',
    'client_health_items',
    'whatsapp_webhook_events'
  ];
begin
  foreach v_table_name in array tables_with_hardcoded_default
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = v_table_name
        and column_name = 'tenant_id'
    ) then
      execute format(
        'alter table public.%I alter column tenant_id drop default',
        v_table_name
      );
    end if;
  end loop;
end
$$;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select *
    from (
      values
        ('services', 'Admin services access'),
        ('business_hours', 'Admin business_hours access'),
        ('settings', 'Admin settings access'),
        ('availability_blocks', 'Admin availability_blocks access'),
        ('transactions', 'Admin transactions access'),
        ('clients', 'Admin clients access'),
        ('appointments', 'Admin appointments access'),
        ('notification_templates', 'Admin notification_templates access'),
        ('notification_jobs', 'Admin notification_jobs access'),
        ('appointment_attendances', 'Admin appointment_attendances access'),
        ('appointment_checklist_items', 'Admin appointment_checklist_items access'),
        ('appointment_evolution_entries', 'Admin appointment_evolution_entries access'),
        ('appointment_checkout', 'Admin appointment_checkout access'),
        ('appointment_checkout_items', 'Admin appointment_checkout_items access'),
        ('appointment_payments', 'Admin appointment_payments access'),
        ('appointment_post', 'Admin appointment_post access'),
        ('appointment_events', 'Admin appointment_events access'),
        ('appointment_messages', 'Admin appointment_messages access'),
        ('client_addresses', 'Admin client_addresses access'),
        ('client_phones', 'Admin client_phones access'),
        ('client_emails', 'Admin client_emails access'),
        ('client_health_items', 'Admin client_health_items access'),
        ('whatsapp_webhook_events', 'Admin whatsapp_webhook_events access')
    ) as policies(table_name, policy_name)
  loop
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = policy_record.table_name
    ) then
      execute format(
        'drop policy if exists %I on public.%I',
        policy_record.policy_name,
        policy_record.table_name
      );

      execute format(
        'create policy %I on public.%I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')',
        policy_record.policy_name,
        policy_record.table_name
      );
    end if;
  end loop;
end
$$;

comment on schema public is
  'WL-1 aplicado: defaults hardcoded de tenant removidos das tabelas operacionais e policies service_role desamarradas do tenant original.';
