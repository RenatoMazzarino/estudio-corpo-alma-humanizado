import { getDashboardAccessForCurrentUser } from "../auth/dashboard-access";
import {
  getTenantRuntimeConfigByDomain,
  getTenantRuntimeConfigBySlug,
  normalizeTenantDomain,
} from "./runtime";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeTenantId(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  if (!normalized) return null;
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function normalizeTenantSlug(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function extractFirstHeaderValue(value: string | null | undefined) {
  if (!value) return null;
  const first = value
    .split(",")
    .map((item) => item.trim())
    .find(Boolean);
  return first ?? null;
}

function extractSlugFromPublicPath(pathname: string) {
  const slugMatch = pathname.match(/^\/agendar\/([^/]+)/i);
  return normalizeTenantSlug(slugMatch?.[1] ?? null);
}

function parseUrlSafe(value: string | null | undefined) {
  try {
    if (!value) return null;
    return new URL(value);
  } catch {
    return null;
  }
}

export async function resolveTenantIdForRequestContext(params: {
  request: Request;
  tenantId?: string | null;
  tenantSlug?: string | null;
  allowDashboardSession?: boolean;
}) {
  const directTenantId = normalizeTenantId(params.tenantId);
  if (directTenantId) return directTenantId;

  if (params.allowDashboardSession !== false) {
    const dashboardAccess = await getDashboardAccessForCurrentUser();
    if (dashboardAccess.ok) return dashboardAccess.data.tenantId;
  }

  const requestUrl = parseUrlSafe(params.request.url);
  const refererUrl = parseUrlSafe(params.request.headers.get("referer"));

  const slugCandidates = [
    normalizeTenantSlug(params.tenantSlug),
    extractSlugFromPublicPath(requestUrl?.pathname ?? ""),
    extractSlugFromPublicPath(refererUrl?.pathname ?? ""),
  ].filter((value): value is string => Boolean(value));

  for (const slug of slugCandidates) {
    const tenantRuntime = await getTenantRuntimeConfigBySlug(slug);
    if (tenantRuntime?.tenant.id) return tenantRuntime.tenant.id;
  }

  const hostCandidates = [
    normalizeTenantDomain(requestUrl?.host ?? null),
    normalizeTenantDomain(extractFirstHeaderValue(params.request.headers.get("x-forwarded-host"))),
    normalizeTenantDomain(extractFirstHeaderValue(params.request.headers.get("host"))),
    normalizeTenantDomain(refererUrl?.host ?? null),
  ].filter((value): value is string => Boolean(value));

  for (const host of hostCandidates) {
    const tenantRuntime = await getTenantRuntimeConfigByDomain(host);
    if (tenantRuntime?.tenant.id) return tenantRuntime.tenant.id;
  }

  return null;
}
