export const PRIMARY_STUDIO_TENANT_ID = "dccf4492-9576-479c-8594-2795bd6b81d7";
export const PRIMARY_STUDIO_TENANT_SLUG = "estudio-corpo-alma";
export const PRIMARY_STUDIO_TENANT_NAME = "Estúdio Corpo & Alma";
export const PRIMARY_STUDIO_TENANT_DISPLAY_NAME = "Estúdio Corpo & Alma Humanizado";
export const PRIMARY_STUDIO_TENANT_LEGAL_NAME = "Estúdio Corpo & Alma Humanizado";
export const PRIMARY_STUDIO_TENANT_PUBLIC_APP_NAME = "Estúdio Corpo & Alma Humanizado";

export const PRIMARY_STUDIO_BASE_CITY = "Amparo";
export const PRIMARY_STUDIO_BASE_STATE = "SP";
export const PRIMARY_STUDIO_LOCALE = "pt-BR";
export const PRIMARY_STUDIO_TIMEZONE = "America/Sao_Paulo";

export const PRIMARY_STUDIO_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_PUBLIC_BASE_URL ?? "https://public.corpoealmahumanizado.com.br";
export const PRIMARY_STUDIO_DASHBOARD_BASE_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_BASE_URL ?? "https://app.corpoealmahumanizado.com.br";
export const PRIMARY_STUDIO_PREVIEW_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_PREVIEW_PUBLIC_BASE_URL ?? "https://dev.public.corpoealmahumanizado.com.br";

export const PRIMARY_STUDIO_BRANDING = {
  displayName: PRIMARY_STUDIO_TENANT_DISPLAY_NAME,
  publicAppName: PRIMARY_STUDIO_TENANT_PUBLIC_APP_NAME,
  logoUrl: "/brand/logo.png",
  logoHorizontalUrl: "/brand/logo-horizontal.png",
  logoLightUrl: "/brand/logo-horizontal.png",
  logoDarkUrl: "/brand/logo-white.png",
  iconUrl: "/brand/icon.png",
  faviconUrl: "/brand/icon.png",
  splashImageUrl: null,
  primaryColor: "#5D6E56",
  secondaryColor: "#C0A4B0",
  accentColor: "#D4A373",
  backgroundColor: "#FAF9F6",
  surfaceColor: "#FFFFFF",
  onPrimaryColor: "#FFFFFF",
  onSurfaceColor: "#2F3A2D",
  surfaceStyle: "soft",
  headingFontFamily: null,
  bodyFontFamily: null,
  fontStrategy: "platform_default",
  radiusStrategy: "soft",
  illustrationStyle: "platform_default",
} as const;

export const PRIMARY_STUDIO_DOMAIN_DEFAULTS = {
  dashboard: "app.corpoealmahumanizado.com.br",
  publicPrimary: "public.corpoealmahumanizado.com.br",
  publicPreview: "dev.public.corpoealmahumanizado.com.br",
} as const;

export const PRIMARY_STUDIO_TRUSTED_HOSTS = [
  PRIMARY_STUDIO_DOMAIN_DEFAULTS.dashboard,
  PRIMARY_STUDIO_DOMAIN_DEFAULTS.publicPrimary,
  PRIMARY_STUDIO_DOMAIN_DEFAULTS.publicPreview,
] as const;
