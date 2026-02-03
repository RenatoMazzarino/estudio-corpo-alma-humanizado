-- G32: client phones/emails + extra data + profile fields

CREATE TABLE IF NOT EXISTS client_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid,
  label text,
  number_raw text NOT NULL,
  number_e164 text,
  is_primary boolean NOT NULL DEFAULT false,
  is_whatsapp boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_phones_client_idx
  ON client_phones (client_id, is_primary);

ALTER TABLE client_phones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin client_phones access" ON client_phones;
CREATE POLICY "Admin client_phones access" ON client_phones
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

CREATE TABLE IF NOT EXISTS client_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid,
  label text,
  email text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_emails_client_idx
  ON client_emails (client_id, is_primary);

ALTER TABLE client_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin client_emails access" ON client_emails;
CREATE POLICY "Admin client_emails access" ON client_emails
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS extra_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS clinical_history text,
  ADD COLUMN IF NOT EXISTS anamnese_url text;

-- Backfill primary phone/email into new tables
INSERT INTO client_phones (
  client_id,
  tenant_id,
  label,
  number_raw,
  number_e164,
  is_primary,
  is_whatsapp
)
SELECT
  c.id,
  c.tenant_id,
  'Principal',
  c.phone,
  NULL,
  true,
  true
FROM clients c
WHERE c.phone IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM client_phones cp WHERE cp.client_id = c.id
);

INSERT INTO client_emails (
  client_id,
  tenant_id,
  label,
  email,
  is_primary
)
SELECT
  c.id,
  c.tenant_id,
  'Principal',
  c.email,
  true
FROM clients c
WHERE c.email IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM client_emails ce WHERE ce.client_id = c.id
);
