-- Hardening da tabela de chaves Pix do checkout interno:
-- 1) habilita RLS
-- 2) cria policy explícita para service_role
-- 3) adiciona funções transacionais para ativação/remoção atômica

ALTER TABLE public.pix_payment_keys ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pix_payment_keys'
      AND policyname = 'pix_payment_keys_service_role_all'
  ) THEN
    CREATE POLICY pix_payment_keys_service_role_all
      ON public.pix_payment_keys
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.activate_pix_payment_key(
  p_tenant_id uuid,
  p_key_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.pix_payment_keys
    WHERE tenant_id = p_tenant_id
      AND id = p_key_id
  ) THEN
    RAISE EXCEPTION 'Chave Pix não encontrada para o tenant informado.';
  END IF;

  UPDATE public.pix_payment_keys
  SET
    is_active = (id = p_key_id),
    updated_at = now()
  WHERE tenant_id = p_tenant_id;
END
$$;

CREATE OR REPLACE FUNCTION public.remove_pix_payment_key_and_rebalance(
  p_tenant_id uuid,
  p_key_id uuid
)
RETURNS TABLE (
  deleted_was_active boolean,
  next_active_key_id uuid
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_is_active boolean;
  v_next_active_key_id uuid;
BEGIN
  SELECT is_active
  INTO v_deleted_is_active
  FROM public.pix_payment_keys
  WHERE tenant_id = p_tenant_id
    AND id = p_key_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  DELETE FROM public.pix_payment_keys
  WHERE tenant_id = p_tenant_id
    AND id = p_key_id;

  IF COALESCE(v_deleted_is_active, false) THEN
    SELECT id
    INTO v_next_active_key_id
    FROM public.pix_payment_keys
    WHERE tenant_id = p_tenant_id
    ORDER BY created_at ASC, id ASC
    LIMIT 1
    FOR UPDATE;

    IF v_next_active_key_id IS NOT NULL THEN
      UPDATE public.pix_payment_keys
      SET
        is_active = (id = v_next_active_key_id),
        updated_at = now()
      WHERE tenant_id = p_tenant_id;
    END IF;
  END IF;

  deleted_was_active := COALESCE(v_deleted_is_active, false);
  next_active_key_id := v_next_active_key_id;
  RETURN NEXT;
END
$$;

