-- Define fonte oficial nova do tenant principal via contrato white-label.
-- Objetivo: eliminar fallback legado e garantir consistencia de tipografia.

DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT id
  INTO v_tenant_id
  FROM public.tenants
  WHERE slug = 'estudio-corpo-alma'
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.tenant_branding
  SET
    heading_font_family = 'Cormorant Garamond',
    body_font_family = 'Inter',
    font_strategy = 'custom_locked_set',
    updated_at = timezone('utc', now())
  WHERE tenant_id = v_tenant_id;
END
$$;
