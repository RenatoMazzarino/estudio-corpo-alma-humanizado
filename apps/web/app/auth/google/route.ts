import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { sanitizeDashboardNextPath } from "../../../src/modules/auth/dashboard-access";

export const dynamic = "force-dynamic";

function isTrustedRedirectHost(host: string, fallbackHost: string) {
  const normalizedHost = host.trim().toLowerCase();
  const normalizedFallback = fallbackHost.trim().toLowerCase();
  if (!normalizedHost) return false;
  if (normalizedHost === normalizedFallback) return true;

  const hostname = normalizedHost.split(":")[0] ?? "";
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (hostname === "public.corpoealmahumanizado.com.br") return true;
  if (hostname === "dev.public.corpoealmahumanizado.com.br") return true;
  if (hostname.endsWith(".vercel.app")) return true;
  return false;
}

function resolveRequestOrigin(request: NextRequest) {
  const fallbackOrigin = request.nextUrl.origin;
  const fallbackHost = request.nextUrl.host;
  const host =
    extractForwardedHeaderValue(request.headers.get("host")) ??
    extractForwardedHeaderValue(request.headers.get("x-forwarded-host"));
  const proto =
    resolveForwardedProto(request.headers.get("x-forwarded-proto")) ??
    resolveForwardedProto(request.nextUrl.protocol.replace(":", ""));

  if (host && proto && isTrustedRedirectHost(host, fallbackHost) && isValidOriginParts(host, proto)) {
    return `${proto}://${host}`;
  }

  return fallbackOrigin;
}

function extractForwardedHeaderValue(value: string | null) {
  if (!value) return null;
  const firstValue = value
    .split(",")
    .map((entry) => entry.trim())
    .find(Boolean);
  return firstValue ?? null;
}

function resolveForwardedProto(value: string | null) {
  const normalized = extractForwardedHeaderValue(value)?.toLowerCase();
  if (normalized === "http" || normalized === "https") return normalized;
  return null;
}

function isValidOriginParts(host: string, proto: "http" | "https") {
  try {
    const url = new URL(`${proto}://${host}`);
    return url.host.length > 0;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const next = sanitizeDashboardNextPath(request.nextUrl.searchParams.get("next"), "/");
  const redirectTo = new URL("/auth/callback", resolveRequestOrigin(request));
  redirectTo.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo.toString(),
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      new URL(`/auth/login?reason=oauth_error${next && next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`, request.nextUrl.origin)
    );
  }

  return NextResponse.redirect(data.url);
}
