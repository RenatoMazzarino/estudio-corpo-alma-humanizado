-- G31: health tags (allergy/condition) per client

CREATE TABLE IF NOT EXISTS client_health_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid,
  type text NOT NULL CHECK (type IN ('allergy', 'condition', 'tag')),
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, type, label)
);

CREATE INDEX IF NOT EXISTS client_health_items_client_idx
  ON client_health_items (client_id, type);

ALTER TABLE client_health_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin client_health_items access" ON client_health_items;
CREATE POLICY "Admin client_health_items access" ON client_health_items
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);
