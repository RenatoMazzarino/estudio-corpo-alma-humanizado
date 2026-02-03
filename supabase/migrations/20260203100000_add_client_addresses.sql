-- G31: client addresses + optional appointment reference

CREATE TABLE IF NOT EXISTS client_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid,
  label text NOT NULL DEFAULT 'Principal',
  is_primary boolean NOT NULL DEFAULT false,
  address_cep text,
  address_logradouro text,
  address_numero text,
  address_complemento text,
  address_bairro text,
  address_cidade text,
  address_estado text,
  referencia text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_addresses_client_idx
  ON client_addresses (client_id, is_primary);

ALTER TABLE client_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin client_addresses access" ON client_addresses;
CREATE POLICY "Admin client_addresses access" ON client_addresses
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS client_address_id uuid REFERENCES client_addresses(id);

-- Backfill: use legacy address fields from clients table
INSERT INTO client_addresses (
  client_id,
  tenant_id,
  label,
  is_primary,
  address_cep,
  address_logradouro,
  address_numero,
  address_complemento,
  address_bairro,
  address_cidade,
  address_estado,
  referencia
)
SELECT
  c.id,
  c.tenant_id,
  'Principal',
  true,
  c.address_cep,
  c.address_logradouro,
  c.address_numero,
  c.address_complemento,
  c.address_bairro,
  c.address_cidade,
  c.address_estado,
  c.endereco_completo
FROM clients c
WHERE (
  c.address_cep IS NOT NULL OR
  c.address_logradouro IS NOT NULL OR
  c.address_numero IS NOT NULL OR
  c.address_complemento IS NOT NULL OR
  c.address_bairro IS NOT NULL OR
  c.address_cidade IS NOT NULL OR
  c.address_estado IS NOT NULL OR
  c.endereco_completo IS NOT NULL
)
AND NOT EXISTS (
  SELECT 1 FROM client_addresses ca WHERE ca.client_id = c.id
);
