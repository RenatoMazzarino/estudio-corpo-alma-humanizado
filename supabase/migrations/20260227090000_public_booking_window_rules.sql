alter table public.settings
  add column if not exists public_booking_cutoff_before_close_minutes integer default 60,
  add column if not exists public_booking_last_slot_before_close_minutes integer default 30;

update public.settings
set
  public_booking_cutoff_before_close_minutes = coalesce(public_booking_cutoff_before_close_minutes, 60),
  public_booking_last_slot_before_close_minutes = coalesce(public_booking_last_slot_before_close_minutes, 30)
where
  public_booking_cutoff_before_close_minutes is null
  or public_booking_last_slot_before_close_minutes is null;

alter table public.settings
  alter column public_booking_cutoff_before_close_minutes set default 60,
  alter column public_booking_last_slot_before_close_minutes set default 30;

comment on column public.settings.public_booking_cutoff_before_close_minutes is
  'Minutos antes do fechamento em que o agendamento online no mesmo dia deixa de aceitar novas marcações.';

comment on column public.settings.public_booking_last_slot_before_close_minutes is
  'Minutos antes do fechamento permitidos para o último horário disponível no agendamento online.';
