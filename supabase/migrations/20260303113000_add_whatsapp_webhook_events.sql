-- G67: persistencia de eventos de webhook WhatsApp (YCloud)

CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE DEFAULT 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  notification_job_id uuid REFERENCES notification_jobs(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'ycloud' CHECK (provider IN ('ycloud')),
  event_type text NOT NULL CHECK (event_type LIKE 'whatsapp.%'),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  event_timestamp timestamptz,
  source_message_id text,
  source_contact text,
  summary text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_tenant_created_idx
  ON whatsapp_webhook_events (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_tenant_event_idx
  ON whatsapp_webhook_events (tenant_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_job_idx
  ON whatsapp_webhook_events (notification_job_id);

ALTER TABLE whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin whatsapp_webhook_events access" ON whatsapp_webhook_events;
CREATE POLICY "Admin whatsapp_webhook_events access" ON whatsapp_webhook_events
  FOR ALL
  USING (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid)
  WITH CHECK (auth.role() = 'service_role' AND tenant_id = 'dccf4492-9576-479c-8594-2795bd6b81d7'::uuid);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_webhook_events'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'whatsapp_webhook_events'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_webhook_events';
    END IF;
  END IF;
END
$$;;
