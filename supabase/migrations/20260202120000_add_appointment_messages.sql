-- G29: appointment messages for attendance flow

CREATE TABLE IF NOT EXISTS appointment_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'drafted',
  payload jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointment_messages_status_idx
  ON appointment_messages (appointment_id, status);

CREATE INDEX IF NOT EXISTS appointment_messages_type_idx
  ON appointment_messages (type, sent_at);

ALTER TABLE appointment_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin appointment_messages access" ON appointment_messages;
CREATE POLICY "Admin appointment_messages access" ON appointment_messages
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);
