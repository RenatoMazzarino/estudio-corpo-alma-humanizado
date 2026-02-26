-- Regras de status financeiro + código persistido de atendimento

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS attendance_code TEXT;

ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS appointments_payment_status_check;

ALTER TABLE public.appointments
ADD CONSTRAINT appointments_payment_status_check CHECK (
  payment_status IS NULL
  OR payment_status IN ('pending', 'paid', 'partial', 'refunded', 'waived')
);

CREATE SEQUENCE IF NOT EXISTS public.appointments_attendance_code_seq;

CREATE OR REPLACE FUNCTION public.set_appointments_attendance_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  should_regenerate boolean := false;
  client_name_value text := null;
  client_phone_value text := null;
  service_token text := '';
  service_clean text := '';
  client_token text := '';
  client_name_clean text := '';
  client_words text[] := '{}';
  date_token text := '';
  seq_token text := '';
  phone_digits text := '';
BEGIN
  IF TG_OP = 'INSERT' THEN
    should_regenerate := true;
  ELSIF NEW.attendance_code IS NULL THEN
    should_regenerate := true;
  ELSIF NEW.start_time IS DISTINCT FROM OLD.start_time
    OR NEW.client_id IS DISTINCT FROM OLD.client_id
    OR NEW.service_id IS DISTINCT FROM OLD.service_id
    OR NEW.service_name IS DISTINCT FROM OLD.service_name
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    should_regenerate := true;
  END IF;

  IF NOT should_regenerate THEN
    RETURN NEW;
  END IF;

  IF NEW.client_id IS NOT NULL THEN
    SELECT c.name, c.phone
      INTO client_name_value, client_phone_value
      FROM public.clients c
     WHERE c.id = NEW.client_id
       AND (NEW.tenant_id IS NULL OR c.tenant_id = NEW.tenant_id)
     LIMIT 1;
  END IF;

  service_clean := regexp_replace(upper(COALESCE(NEW.service_name, '')), '[^A-Z0-9]+', '', 'g');
  service_token := substring(service_clean from 1 for 2);
  IF COALESCE(service_token, '') = '' THEN
    service_token := 'SV';
  ELSIF char_length(service_token) = 1 THEN
    service_token := service_token || 'X';
  END IF;

  client_name_clean := regexp_replace(upper(COALESCE(client_name_value, '')), '[^A-Z0-9 ]+', ' ', 'g');
  client_name_clean := regexp_replace(trim(client_name_clean), '\s+', ' ', 'g');
  phone_digits := regexp_replace(COALESCE(client_phone_value, ''), '\D+', '', 'g');

  IF client_name_clean <> '' THEN
    client_words := regexp_split_to_array(client_name_clean, '\s+');
    IF COALESCE(array_length(client_words, 1), 0) >= 2 THEN
      client_token := 'N'
        || COALESCE(substring(client_words[1] from 1 for 1), 'X')
        || COALESCE(substring(client_words[array_length(client_words, 1)] from 1 for 1), 'X');
    ELSE
      client_token := 'N'
        || rpad(COALESCE(substring(client_name_clean from 1 for 2), 'XX'), 2, 'X');
    END IF;
  ELSIF phone_digits <> '' THEN
    client_token := 'T' || lpad(right(phone_digits, 4), 4, '0');
  ELSE
    client_token := 'A' || upper(substring(replace(COALESCE(NEW.id::text, ''), '-', '') from 1 for 3));
    client_token := rpad(client_token, 4, 'X');
  END IF;

  date_token := to_char(COALESCE(NEW.start_time, NEW.created_at, now()) AT TIME ZONE 'America/Sao_Paulo', 'YYMMDD');
  seq_token := lpad(nextval('public.appointments_attendance_code_seq')::text, 6, '0');

  NEW.attendance_code := service_token || '-' || client_token || '-' || date_token || '-' || seq_token;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_set_attendance_code ON public.appointments;

CREATE TRIGGER trg_appointments_set_attendance_code
BEFORE INSERT OR UPDATE OF tenant_id, client_id, service_id, service_name, start_time, attendance_code
ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.set_appointments_attendance_code();

CREATE UNIQUE INDEX IF NOT EXISTS appointments_attendance_code_key
  ON public.appointments (attendance_code)
  WHERE attendance_code IS NOT NULL;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT id
      FROM public.appointments
     WHERE attendance_code IS NULL
     ORDER BY created_at ASC, id ASC
  LOOP
    UPDATE public.appointments
       SET attendance_code = NULL
     WHERE id = rec.id;
  END LOOP;
END;
$$;
