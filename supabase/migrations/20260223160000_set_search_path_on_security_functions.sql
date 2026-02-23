-- Hardening: fixa search_path em funções sinalizadas pelo linter do Supabase
-- (function_search_path_mutable)

ALTER FUNCTION public.activate_pix_payment_key(uuid, uuid)
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.remove_pix_payment_key_and_rebalance(uuid, uuid)
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.normalize_phone_digits(text)
  SET search_path = pg_catalog;
