import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { getDashboardAuthRedirectPath } from "../../../src/modules/auth/dashboard-access";

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
  const host = request.headers.get("host")?.trim();
  if (!host || !isTrustedRedirectHost(host, fallbackHost)) {
    return fallbackOrigin;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim().toLowerCase();
  const proto =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const requestOrigin = resolveRequestOrigin(request);
  return NextResponse.redirect(
    new URL(getDashboardAuthRedirectPath({ reason: "signed_out" }), requestOrigin)
  );
}
