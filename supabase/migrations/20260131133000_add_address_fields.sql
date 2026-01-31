-- G23: add structured address fields to clients and appointments
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS address_cep text,
ADD COLUMN IF NOT EXISTS address_logradouro text,
ADD COLUMN IF NOT EXISTS address_numero text,
ADD COLUMN IF NOT EXISTS address_complemento text,
ADD COLUMN IF NOT EXISTS address_bairro text,
ADD COLUMN IF NOT EXISTS address_cidade text,
ADD COLUMN IF NOT EXISTS address_estado text;

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS address_cep text,
ADD COLUMN IF NOT EXISTS address_logradouro text,
ADD COLUMN IF NOT EXISTS address_numero text,
ADD COLUMN IF NOT EXISTS address_complemento text,
ADD COLUMN IF NOT EXISTS address_bairro text,
ADD COLUMN IF NOT EXISTS address_cidade text,
ADD COLUMN IF NOT EXISTS address_estado text;
