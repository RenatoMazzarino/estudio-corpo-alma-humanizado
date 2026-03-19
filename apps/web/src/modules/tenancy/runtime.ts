import { createServiceClient } from "../../../lib/supabase/service";
import type { Database } from "../../../lib/supabase/types";
import {
  PRIMARY_STUDIO_BASE_CITY,
  PRIMARY_STUDIO_BASE_STATE,
  PRIMARY_STUDIO_BRANDING,
  PRIMARY_STUDIO_DASHBOARD_BASE_URL,
  PRIMARY_STUDIO_DOMAIN_DEFAULTS,
  PRIMARY_STUDIO_LOCALE,
  PRIMARY_STUDIO_PUBLIC_BASE_URL,
  PRIMARY_STUDIO_TENANT_ID,
  PRIMARY_STUDIO_TENANT_LEGAL_NAME,
  PRIMARY_STUDIO_TENANT_NAME,
  PRIMARY_STUDIO_TENANT_SLUG,
  PRIMARY_STUDIO_TIMEZONE,
} from "./defaults";

type TenantRow = Database["public"]["Tables"]["tenants"]["Row"];
type TenantBrandingRow = Database["public"]["Tables"]["tenant_branding"]["Row"];
type TenantDomainRow = Database["public"]["Tables"]["tenant_domains"]["Row"];
type TenantFeatureFlagRow = Database["public"]["Tables"]["tenant_feature_flags"]["Row"];
type SettingsRow = Database["public"]["Tables"]["settings"]["Row"];

export type TenantRuntimeStatus = "draft" | "active" | "suspended" | "archived";
export type TenantDomainType =
  | "dashboard"
  | "primary_public"
  | "secondary_public"
  | "preview_public";

export type TenantRuntimeConfig = {
  tenant: {
    id: string;
    slug: string;
    name: string;
    legalName: string;
    status: TenantRuntimeStatus;
    timezone: string;
    locale: string;
    baseCity: string | null;
    baseState: string | null;
    supportEmail: string | null;
    supportPhone: string | null;
    createdAt: string;
    updatedAt: string | null;
  };
  branding: {
    displayName: string;
    publicAppName: string;
    logoUrl: string | null;
    logoHorizontalUrl: string | null;
    iconUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
    backgroundColor: string | null;
    surfaceStyle: string | null;
  };
  domains: Array<{
    domain: string;
    type: TenantDomainType;
    isPrimary: boolean;
    isActive: boolean;
    verifiedAt: string | null;
  }>;
  featureFlags: Array<{
    featureKey: string;
    enabled: boolean;
    scope: string | null;
    metadata: Database["public"]["Tables"]["tenant_feature_flags"]["Row"]["metadata"];
  }>;
  publicBaseUrl: string;
  dashboardBaseUrl: string;
};

type RuntimeLookupInput = {
  tenant: TenantRow | null;
  branding: TenantBrandingRow | null;
  domains: TenantDomainRow[];
  featureFlags: TenantFeatureFlagRow[];
  settings: Pick<SettingsRow, "public_base_url"> | null;
};

export function normalizeTenantBaseUrl(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function normalizeTenantDomain(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  return normalized.split(":")[0] ?? null;
}

function buildDefaultTenantRuntimeConfig(): TenantRuntimeConfig {
  return {
    tenant: {
      id: PRIMARY_STUDIO_TENANT_ID,
      slug: PRIMARY_STUDIO_TENANT_SLUG,
      name: PRIMARY_STUDIO_TENANT_NAME,
      legalName: PRIMARY_STUDIO_TENANT_LEGAL_NAME,
      status: "active",
      timezone: PRIMARY_STUDIO_TIMEZONE,
      locale: PRIMARY_STUDIO_LOCALE,
      baseCity: PRIMARY_STUDIO_BASE_CITY,
      baseState: PRIMARY_STUDIO_BASE_STATE,
      supportEmail: null,
      supportPhone: null,
      createdAt: new Date(0).toISOString(),
      updatedAt: null,
    },
    branding: {
      displayName: PRIMARY_STUDIO_BRANDING.displayName,
      publicAppName: PRIMARY_STUDIO_BRANDING.publicAppName,
      logoUrl: PRIMARY_STUDIO_BRANDING.logoUrl,
      logoHorizontalUrl: PRIMARY_STUDIO_BRANDING.logoHorizontalUrl,
      iconUrl: PRIMARY_STUDIO_BRANDING.iconUrl,
      primaryColor: PRIMARY_STUDIO_BRANDING.primaryColor,
      secondaryColor: PRIMARY_STUDIO_BRANDING.secondaryColor,
      accentColor: PRIMARY_STUDIO_BRANDING.accentColor,
      backgroundColor: PRIMARY_STUDIO_BRANDING.backgroundColor,
      surfaceStyle: PRIMARY_STUDIO_BRANDING.surfaceStyle,
    },
    domains: [
      {
        domain: PRIMARY_STUDIO_DOMAIN_DEFAULTS.dashboard,
        type: "dashboard",
        isPrimary: true,
        isActive: true,
        verifiedAt: null,
      },
      {
        domain: PRIMARY_STUDIO_DOMAIN_DEFAULTS.publicPrimary,
        type: "primary_public",
        isPrimary: true,
        isActive: true,
        verifiedAt: null,
      },
      {
        domain: PRIMARY_STUDIO_DOMAIN_DEFAULTS.publicPreview,
        type: "preview_public",
        isPrimary: false,
        isActive: true,
        verifiedAt: null,
      },
    ],
    featureFlags: [],
    publicBaseUrl: PRIMARY_STUDIO_PUBLIC_BASE_URL,
    dashboardBaseUrl: PRIMARY_STUDIO_DASHBOARD_BASE_URL,
  };
}

export const DEFAULT_TENANT_RUNTIME = buildDefaultTenantRuntimeConfig();

function mapTenantRuntimeConfig(input: RuntimeLookupInput): TenantRuntimeConfig {
  const fallback = DEFAULT_TENANT_RUNTIME;
  const activeDomains = (input.domains ?? [])
    .filter((entry) => Boolean(entry.is_active))
    .map((entry) => ({
      domain: normalizeTenantDomain(entry.domain) ?? entry.domain,
      type: entry.type as TenantDomainType,
      isPrimary: Boolean(entry.is_primary),
      isActive: Boolean(entry.is_active),
      verifiedAt: entry.verified_at ?? null,
    }));

  const publicPrimaryDomain =
    activeDomains.find((entry) => entry.type === "primary_public" && entry.isPrimary)?.domain ??
    activeDomains.find((entry) => entry.type === "primary_public")?.domain ??
    activeDomains.find((entry) => entry.type === "secondary_public" && entry.isPrimary)?.domain ??
    activeDomains.find((entry) => entry.type === "secondary_public")?.domain ??
    fallback.domains.find((entry) => entry.type === "primary_public")?.domain ??
    null;

  const dashboardDomain =
    activeDomains.find((entry) => entry.type === "dashboard" && entry.isPrimary)?.domain ??
    activeDomains.find((entry) => entry.type === "dashboard")?.domain ??
    fallback.domains.find((entry) => entry.type === "dashboard")?.domain ??
    null;

  const settingsBaseUrl = normalizeTenantBaseUrl(input.settings?.public_base_url);
  const publicBaseUrl =
    settingsBaseUrl ??
    (publicPrimaryDomain ? `https://${publicPrimaryDomain}` : null) ??
    fallback.publicBaseUrl;
  const dashboardBaseUrl = dashboardDomain ? `https://${dashboardDomain}` : fallback.dashboardBaseUrl;

  return {
    tenant: {
      id: input.tenant?.id ?? fallback.tenant.id,
      slug: input.tenant?.slug ?? fallback.tenant.slug,
      name: input.tenant?.name ?? fallback.tenant.name,
      legalName: input.tenant?.legal_name ?? fallback.tenant.legalName,
      status: (input.tenant?.status as TenantRuntimeStatus | null) ?? fallback.tenant.status,
      timezone: input.tenant?.timezone ?? fallback.tenant.timezone,
      locale: input.tenant?.locale ?? fallback.tenant.locale,
      baseCity: input.tenant?.base_city ?? fallback.tenant.baseCity,
      baseState: input.tenant?.base_state ?? fallback.tenant.baseState,
      supportEmail: input.tenant?.support_email ?? fallback.tenant.supportEmail,
      supportPhone: input.tenant?.support_phone ?? fallback.tenant.supportPhone,
      createdAt: input.tenant?.created_at ?? fallback.tenant.createdAt,
      updatedAt: input.tenant?.updated_at ?? fallback.tenant.updatedAt,
    },
    branding: {
      displayName: input.branding?.display_name ?? fallback.branding.displayName,
      publicAppName: input.branding?.public_app_name ?? fallback.branding.publicAppName,
      logoUrl: input.branding?.logo_url ?? fallback.branding.logoUrl,
      logoHorizontalUrl: input.branding?.logo_horizontal_url ?? fallback.branding.logoHorizontalUrl,
      iconUrl: input.branding?.icon_url ?? fallback.branding.iconUrl,
      primaryColor: input.branding?.primary_color ?? fallback.branding.primaryColor,
      secondaryColor: input.branding?.secondary_color ?? fallback.branding.secondaryColor,
      accentColor: input.branding?.accent_color ?? fallback.branding.accentColor,
      backgroundColor: input.branding?.background_color ?? fallback.branding.backgroundColor,
      surfaceStyle: input.branding?.surface_style ?? fallback.branding.surfaceStyle,
    },
    domains: activeDomains.length > 0 ? activeDomains : fallback.domains,
    featureFlags: (input.featureFlags ?? []).map((entry) => ({
      featureKey: entry.feature_key,
      enabled: Boolean(entry.enabled),
      scope: entry.scope ?? null,
      metadata: entry.metadata,
    })),
    publicBaseUrl,
    dashboardBaseUrl,
  };
}

async function loadTenantRuntimeBy(selector: { id?: string; slug?: string }) {
  const supabase = createServiceClient();
  const tenantColumns =
    "id, slug, name, legal_name, status, timezone, locale, base_city, base_state, support_email, support_phone, created_at, updated_at";

  let tenantQuery = supabase.from("tenants").select(tenantColumns);
  if (selector.id) {
    tenantQuery = tenantQuery.eq("id", selector.id);
  }
  if (selector.slug) {
    tenantQuery = tenantQuery.eq("slug", selector.slug);
  }

  const { data: tenant, error: tenantError } = await tenantQuery.maybeSingle();
  if (tenantError || !tenant) return null;

  const tenantId = tenant.id;
  const [{ data: branding }, { data: domains }, { data: featureFlags }, { data: settings }] = await Promise.all([
    supabase
      .from("tenant_branding")
      .select(
        "tenant_id, display_name, public_app_name, logo_url, logo_horizontal_url, icon_url, primary_color, secondary_color, accent_color, background_color, surface_style, created_at, updated_at"
      )
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("tenant_domains")
      .select("tenant_id, domain, type, is_primary, is_active, verified_at, updated_at")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("is_primary", { ascending: false }),
    supabase
      .from("tenant_feature_flags")
      .select("tenant_id, feature_key, enabled, scope, metadata, updated_at")
      .eq("tenant_id", tenantId),
    supabase.from("settings").select("public_base_url").eq("tenant_id", tenantId).maybeSingle(),
  ]);

  return mapTenantRuntimeConfig({
    tenant,
    branding: branding ?? null,
    domains: (domains ?? []) as TenantDomainRow[],
    featureFlags: (featureFlags ?? []) as TenantFeatureFlagRow[],
    settings: settings ?? null,
  });
}

export async function getTenantRuntimeConfigBySlug(slug: string) {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) return null;
  return loadTenantRuntimeBy({ slug: normalizedSlug });
}

export async function getTenantRuntimeConfigById(tenantId: string) {
  const normalizedTenantId = tenantId.trim();
  if (!normalizedTenantId) return null;
  return loadTenantRuntimeBy({ id: normalizedTenantId });
}

export async function isKnownTenantDomain(hostname: string) {
  const normalizedHostname = normalizeTenantDomain(hostname);
  if (!normalizedHostname) return false;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("tenant_domains")
      .select("tenant_id")
      .eq("domain", normalizedHostname)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error) return false;
    return Boolean(data?.tenant_id);
  } catch {
    return false;
  }
}

export function buildTenantPublicUrl(pathname: string, baseUrl = DEFAULT_TENANT_RUNTIME.publicBaseUrl) {
  const normalizedBase = normalizeTenantBaseUrl(baseUrl) ?? DEFAULT_TENANT_RUNTIME.publicBaseUrl;
  const normalizedPath = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  return new URL(normalizedPath, `${normalizedBase}/`).toString();
}
