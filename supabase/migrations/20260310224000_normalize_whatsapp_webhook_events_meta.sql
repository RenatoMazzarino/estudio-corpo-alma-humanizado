-- Normaliza legado da tabela whatsapp_webhook_events para operação Meta Cloud.
-- Mantém histórico append-only: corrige via nova migration (sem editar migration antiga).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_webhook_events'
  ) THEN
    RETURN;
  END IF;

  -- Remove o check legado provider in ('ycloud') se existir.
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_webhook_events'
      AND constraint_name = 'whatsapp_webhook_events_provider_check'
  ) THEN
    EXECUTE 'ALTER TABLE public.whatsapp_webhook_events DROP CONSTRAINT whatsapp_webhook_events_provider_check';
  END IF;

  -- Remove default hardcoded de tenant legado.
  EXECUTE 'ALTER TABLE public.whatsapp_webhook_events ALTER COLUMN tenant_id DROP DEFAULT';

  -- Regrava provider legado para o provider oficial atual.
  EXECUTE $sql$
    UPDATE public.whatsapp_webhook_events
    SET provider = 'meta_cloud'
    WHERE provider = 'ycloud'
  $sql$;

  -- Define provider oficial.
  EXECUTE $sql$
    ALTER TABLE public.whatsapp_webhook_events
      ALTER COLUMN provider SET DEFAULT 'meta_cloud'
  $sql$;

  EXECUTE $sql$
    ALTER TABLE public.whatsapp_webhook_events
      ADD CONSTRAINT whatsapp_webhook_events_provider_check
      CHECK (provider IN ('meta_cloud'))
  $sql$;
END
$$;

DROP POLICY IF EXISTS "Admin whatsapp_webhook_events access" ON public.whatsapp_webhook_events;
CREATE POLICY "Admin whatsapp_webhook_events access"
  ON public.whatsapp_webhook_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
