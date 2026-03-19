import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { sanitizeDashboardNextPath } from "../../../src/modules/auth/dashboard-access";
import { resolveTrustedRequestOrigin } from "../../../src/modules/tenancy/http-origin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const next = sanitizeDashboardNextPath(request.nextUrl.searchParams.get("next"), "/");
  const redirectTo = new URL("/auth/callback", await resolveTrustedRequestOrigin(request));
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
