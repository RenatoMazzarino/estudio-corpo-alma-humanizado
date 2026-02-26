-- G58: remove legacy clients.extra_data after migration to explicit name profile columns

ALTER TABLE public.clients
  DROP COLUMN IF EXISTS extra_data;
