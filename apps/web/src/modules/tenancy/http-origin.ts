import type { NextRequest } from "next/server";
import {
  PRIMARY_STUDIO_DASHBOARD_BASE_URL,
  PRIMARY_STUDIO_TRUSTED_HOSTS,
} from "./defaults";
import { isKnownTenantDomain, normalizeTenantDomain } from "./runtime";

export function extractForwardedHeaderValue(value: string | null) {
  if (!value) return null;
  const firstValue = value
    .split(",")
    .map((entry) => entry.trim())
    .find(Boolean);
  return firstValue ?? null;
}

export function resolveForwardedProto(value: string | null) {
  const normalized = extractForwardedHeaderValue(value)?.toLowerCase();
  if (normalized === "http" || normalized === "https") return normalized;
  return null;
}

export function isValidOriginParts(host: string, proto: "http" | "https") {
  try {
    const url = new URL(`${proto}://${host}`);
    return url.host.length > 0;
  } catch {
    return false;
  }
}

function isLocalOrPrivateHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

function isIntrinsicTrustedHost(hostname: string) {
  return (
    isLocalOrPrivateHost(hostname) ||
    hostname.endsWith(".vercel.app") ||
    PRIMARY_STUDIO_TRUSTED_HOSTS.some((trustedHost) => trustedHost === hostname)
  );
}

export async function isTrustedRuntimeHost(host: string | null | undefined) {
  const normalizedHost = normalizeTenantDomain(host);
  if (!normalizedHost) return false;
  if (isIntrinsicTrustedHost(normalizedHost)) return true;
  return isKnownTenantDomain(normalizedHost);
}

export async function resolveTrustedRequestOrigin(request: NextRequest) {
  const fallbackProto =
    resolveForwardedProto(request.nextUrl.protocol.replace(":", "")) ?? "https";

  if (await isTrustedRuntimeHost(request.nextUrl.host)) {
    return request.nextUrl.origin;
  }

  const forwardedHost =
    extractForwardedHeaderValue(request.headers.get("x-forwarded-host")) ??
    extractForwardedHeaderValue(request.headers.get("host"));

  if (
    forwardedHost &&
    isValidOriginParts(forwardedHost, fallbackProto) &&
    (await isTrustedRuntimeHost(forwardedHost))
  ) {
    return `${fallbackProto}://${forwardedHost}`;
  }

  return new URL(PRIMARY_STUDIO_DASHBOARD_BASE_URL).origin;
}
