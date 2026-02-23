import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { sanitizeDashboardNextPath } from "../../../src/modules/auth/dashboard-access";

export const dynamic = "force-dynamic";

function resolveRequestOrigin(request: NextRequest) {
  const host =
    extractForwardedHeaderValue(request.headers.get("x-forwarded-host")) ??
    extractForwardedHeaderValue(request.headers.get("host"));
  const proto =
    resolveForwardedProto(request.headers.get("x-forwarded-proto")) ??
    resolveForwardedProto(request.nextUrl.protocol.replace(":", ""));

  if (host && proto && isValidOriginParts(host, proto)) {
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
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
