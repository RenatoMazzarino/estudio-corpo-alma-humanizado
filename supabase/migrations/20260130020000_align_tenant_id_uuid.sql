-- Align tenant_id to UUID + FK for settings, availability_blocks, transactions

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT tenant_id FROM settings
      UNION ALL SELECT tenant_id FROM availability_blocks
      UNION ALL SELECT tenant_id FROM transactions
    ) t
    WHERE tenant_id IS NOT NULL
      AND tenant_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'Non-UUID tenant_id values found in settings/availability_blocks/transactions';
  END IF;
END $$;

-- SETTINGS
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS tenant_id_uuid uuid;

UPDATE settings
SET tenant_id_uuid = tenant_id::uuid
WHERE tenant_id_uuid IS NULL;

ALTER TABLE settings
  ALTER COLUMN tenant_id_uuid SET NOT NULL;

ALTER TABLE settings
  ADD CONSTRAINT settings_tenant_id_fkey
  FOREIGN KEY (tenant_id_uuid) REFERENCES tenants(id);

DROP POLICY IF EXISTS "Acesso total settings admin" ON settings;

ALTER TABLE settings DROP COLUMN tenant_id;
ALTER TABLE settings RENAME COLUMN tenant_id_uuid TO tenant_id;
ALTER TABLE settings ALTER COLUMN tenant_id SET DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid;
CREATE POLICY "Acesso total settings admin" ON settings FOR ALL USING (
  tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid
);

-- AVAILABILITY_BLOCKS
ALTER TABLE availability_blocks
  ADD COLUMN IF NOT EXISTS tenant_id_uuid uuid;

UPDATE availability_blocks
SET tenant_id_uuid = tenant_id::uuid
WHERE tenant_id_uuid IS NULL;

ALTER TABLE availability_blocks
  ALTER COLUMN tenant_id_uuid SET NOT NULL;

ALTER TABLE availability_blocks
  ADD CONSTRAINT availability_blocks_tenant_id_fkey
  FOREIGN KEY (tenant_id_uuid) REFERENCES tenants(id);

DROP POLICY IF EXISTS "Acesso total blocks admin" ON availability_blocks;

ALTER TABLE availability_blocks DROP COLUMN tenant_id;
ALTER TABLE availability_blocks RENAME COLUMN tenant_id_uuid TO tenant_id;
ALTER TABLE availability_blocks ALTER COLUMN tenant_id SET DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid;
CREATE POLICY "Acesso total blocks admin" ON availability_blocks FOR ALL USING (
  tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid
);

-- TRANSACTIONS
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS tenant_id_uuid uuid;

UPDATE transactions
SET tenant_id_uuid = tenant_id::uuid
WHERE tenant_id_uuid IS NULL;

ALTER TABLE transactions
  ALTER COLUMN tenant_id_uuid SET NOT NULL;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_tenant_id_fkey
  FOREIGN KEY (tenant_id_uuid) REFERENCES tenants(id);

DROP POLICY IF EXISTS "Acesso total transactions admin" ON transactions;

ALTER TABLE transactions DROP COLUMN tenant_id;
ALTER TABLE transactions RENAME COLUMN tenant_id_uuid TO tenant_id;
ALTER TABLE transactions ALTER COLUMN tenant_id SET DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid;
CREATE POLICY "Acesso total transactions admin" ON transactions FOR ALL USING (
  tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid
);
