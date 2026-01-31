-- G20: store actual duration of appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS actual_duration_minutes integer;
