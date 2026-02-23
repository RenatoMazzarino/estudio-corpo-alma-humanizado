import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { sanitizeDashboardNextPath } from "../../../src/modules/auth/dashboard-access";

export const dynamic = "force-dynamic";

function resolveRequestOrigin(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host")?.trim() ||
    request.headers.get("host")?.trim();
  const proto =
    request.headers.get("x-forwarded-proto")?.trim() ||
    request.nextUrl.protocol.replace(":", "");

  if (host && proto) return `${proto}://${host}`;
  return request.nextUrl.origin;
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

