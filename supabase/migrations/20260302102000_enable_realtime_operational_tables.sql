-- Enable realtime publication for operational tables used by live UI refresh.

do $$
declare
  v_table_name text;
  table_names text[] := array[
    'appointments',
    'availability_blocks',
    'appointment_checkout',
    'appointment_checkout_items',
    'appointment_payments',
    'notification_jobs'
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
