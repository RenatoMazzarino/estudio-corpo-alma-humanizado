import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import {
  authorizeDashboardSupabaseUser,
  getDashboardAuthRedirectPath,
  sanitizeDashboardNextPath,
} from "../../../src/modules/auth/dashboard-access";

export const dynamic = "force-dynamic";

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

function isTrustedHost(host: string, fallbackHost: string) {
  const normalizedHost = host.trim().toLowerCase();
  const normalizedFallback = fallbackHost.trim().toLowerCase();
  if (!normalizedHost) return false;
  if (normalizedHost === normalizedFallback) return true;

  const hostname = normalizedHost.split(":")[0] ?? "";
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (hostname === "dev.public.corpoealmahumanizado.com.br") return true;
  if (hostname.endsWith(".vercel.app")) return true;
  return false;
}

function resolveRequestOrigin(request: NextRequest) {
  const fallbackOrigin = request.nextUrl.origin;
  const fallbackHost = request.nextUrl.host;
  const host =
    extractForwardedHeaderValue(request.headers.get("x-forwarded-host")) ??
    extractForwardedHeaderValue(request.headers.get("host"));
  if (!host || !isTrustedHost(host, fallbackHost)) {
    return fallbackOrigin;
  }

  const forwardedProto = resolveForwardedProto(request.headers.get("x-forwarded-proto"));
  const proto =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

function isDevPasswordLoginEnabled() {
  return (process.env.DEV_PASSWORD_LOGIN_ENABLED ?? "").trim().toLowerCase() === "true";
}

export async function POST(request: NextRequest) {
  const requestOrigin = resolveRequestOrigin(request);
  const fallbackNext = sanitizeDashboardNextPath(request.nextUrl.searchParams.get("next"), "/");

  if (!isDevPasswordLoginEnabled()) {
    return NextResponse.redirect(
      new URL(getDashboardAuthRedirectPath({ next: fallbackNext, reason: "dev_login_disabled" }), requestOrigin)
    );
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = sanitizeDashboardNextPath(String(formData.get("next") ?? fallbackNext), "/");

  if (!email || !password) {
    return NextResponse.redirect(
      new URL(getDashboardAuthRedirectPath({ next, reason: "dev_login_error" }), requestOrigin)
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  const signedUser = data.session?.user ?? null;
  if (error || !signedUser) {
    return NextResponse.redirect(
      new URL(getDashboardAuthRedirectPath({ next, reason: "dev_login_error" }), requestOrigin)
    );
  }

  const access = await authorizeDashboardSupabaseUser(signedUser);
  if (!access.ok) {
    await supabase.auth.signOut();
    const reason = access.reason === "system_error" ? "system_error" : "forbidden";
    return NextResponse.redirect(new URL(getDashboardAuthRedirectPath({ next, reason }), requestOrigin));
  }

  return NextResponse.redirect(new URL(next, requestOrigin));
}
