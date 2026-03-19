-- WL-2 complemento: expande tenant_branding para contrato white-label completo.
-- Impacto em RLS: nenhum ajuste novo de policy; reutiliza as políticas service_role já existentes.
-- Impacto em índices: sem novos índices necessários nesta fase; escopo focado em ampliação de metadata.
-- Rollback: remover apenas as colunas novas se nenhum ambiente depender delas; manter dados atuais intactos.

BEGIN;

ALTER TABLE public.tenant_branding
  ADD COLUMN IF NOT EXISTS logo_light_url text,
  ADD COLUMN IF NOT EXISTS logo_dark_url text,
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS splash_image_url text,
  ADD COLUMN IF NOT EXISTS surface_color text,
  ADD COLUMN IF NOT EXISTS on_primary_color text,
  ADD COLUMN IF NOT EXISTS on_surface_color text,
  ADD COLUMN IF NOT EXISTS heading_font_family text,
  ADD COLUMN IF NOT EXISTS body_font_family text,
  ADD COLUMN IF NOT EXISTS font_strategy text,
  ADD COLUMN IF NOT EXISTS radius_strategy text,
  ADD COLUMN IF NOT EXISTS illustration_style text;

UPDATE public.tenant_branding
SET
  logo_light_url = COALESCE(NULLIF(logo_light_url, ''), logo_horizontal_url, logo_url),
  logo_dark_url = COALESCE(NULLIF(logo_dark_url, ''), logo_url, logo_horizontal_url),
  favicon_url = COALESCE(NULLIF(favicon_url, ''), icon_url),
  surface_color = COALESCE(NULLIF(surface_color, ''), '#FFFFFF'),
  on_primary_color = COALESCE(NULLIF(on_primary_color, ''), '#FFFFFF'),
  on_surface_color = COALESCE(NULLIF(on_surface_color, ''), '#2F3A2D'),
  font_strategy = COALESCE(NULLIF(font_strategy, ''), 'platform_default'),
  radius_strategy = COALESCE(NULLIF(radius_strategy, ''), 'soft'),
  illustration_style = COALESCE(NULLIF(illustration_style, ''), 'platform_default')
WHERE TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_branding_font_strategy_check'
      AND conrelid = 'public.tenant_branding'::regclass
  ) THEN
    ALTER TABLE public.tenant_branding
      ADD CONSTRAINT tenant_branding_font_strategy_check
      CHECK (font_strategy IN ('platform_default', 'brand_headings_only', 'custom_locked_set'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_branding_radius_strategy_check'
      AND conrelid = 'public.tenant_branding'::regclass
  ) THEN
    ALTER TABLE public.tenant_branding
      ADD CONSTRAINT tenant_branding_radius_strategy_check
      CHECK (radius_strategy IN ('soft', 'balanced', 'sharp'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_branding_illustration_style_check'
      AND conrelid = 'public.tenant_branding'::regclass
  ) THEN
    ALTER TABLE public.tenant_branding
      ADD CONSTRAINT tenant_branding_illustration_style_check
      CHECK (illustration_style IN ('platform_default', 'tenant_custom'));
  END IF;
END;
$$;

ALTER TABLE public.tenant_branding
  ALTER COLUMN font_strategy SET DEFAULT 'platform_default',
  ALTER COLUMN font_strategy SET NOT NULL,
  ALTER COLUMN radius_strategy SET DEFAULT 'soft',
  ALTER COLUMN radius_strategy SET NOT NULL,
  ALTER COLUMN illustration_style SET DEFAULT 'platform_default',
  ALTER COLUMN illustration_style SET NOT NULL;

INSERT INTO public.tenant_branding (
  tenant_id,
  display_name,
  public_app_name,
  logo_url,
  logo_horizontal_url,
  logo_light_url,
  logo_dark_url,
  icon_url,
  favicon_url,
  primary_color,
  secondary_color,
  accent_color,
  background_color,
  surface_color,
  on_primary_color,
  on_surface_color,
  surface_style,
  heading_font_family,
  body_font_family,
  font_strategy,
  radius_strategy,
  illustration_style
)
VALUES (
  'dccf4492-9576-479c-8594-2795bd6b81d7',
  'Estúdio Corpo & Alma Humanizado',
  'Estúdio Corpo & Alma Humanizado',
  '/brand/logo.png',
  '/brand/logo-horizontal.png',
  '/brand/logo-horizontal.png',
  '/brand/logo-white.png',
  '/brand/icon.png',
  '/brand/icon.png',
  '#5D6E56',
  '#C0A4B0',
  '#D4A373',
  '#FAF9F6',
  '#FFFFFF',
  '#FFFFFF',
  '#2F3A2D',
  'soft',
  NULL,
  NULL,
  'platform_default',
  'soft',
  'platform_default'
)
ON CONFLICT (tenant_id) DO UPDATE
SET
  logo_light_url = COALESCE(NULLIF(public.tenant_branding.logo_light_url, ''), EXCLUDED.logo_light_url),
  logo_dark_url = COALESCE(NULLIF(public.tenant_branding.logo_dark_url, ''), EXCLUDED.logo_dark_url),
  favicon_url = COALESCE(NULLIF(public.tenant_branding.favicon_url, ''), EXCLUDED.favicon_url),
  surface_color = COALESCE(NULLIF(public.tenant_branding.surface_color, ''), EXCLUDED.surface_color),
  on_primary_color = COALESCE(NULLIF(public.tenant_branding.on_primary_color, ''), EXCLUDED.on_primary_color),
  on_surface_color = COALESCE(NULLIF(public.tenant_branding.on_surface_color, ''), EXCLUDED.on_surface_color),
  font_strategy = COALESCE(NULLIF(public.tenant_branding.font_strategy, ''), EXCLUDED.font_strategy),
  radius_strategy = COALESCE(NULLIF(public.tenant_branding.radius_strategy, ''), EXCLUDED.radius_strategy),
  illustration_style = COALESCE(NULLIF(public.tenant_branding.illustration_style, ''), EXCLUDED.illustration_style),
  updated_at = timezone('utc', now());

COMMIT;
