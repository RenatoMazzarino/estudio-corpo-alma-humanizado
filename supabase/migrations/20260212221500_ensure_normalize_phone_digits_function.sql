-- G66: hardening
-- Never edit already-applied migrations. This patch guarantees the helper
-- function used by appointment/client reconciliation migrations.

CREATE OR REPLACE FUNCTION public.normalize_phone_digits(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(COALESCE(value, ''), '\D', '', 'g');
$$;

