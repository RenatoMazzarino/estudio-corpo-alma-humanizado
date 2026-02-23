import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import {
  authorizeDashboardSupabaseUser,
  getDashboardAccessForCurrentUser,
  getDashboardAuthRedirectPath,
  sanitizeDashboardNextPath,
} from "../../../src/modules/auth/dashboard-access";

export const dynamic = "force-dynamic";

function resolveRequestOrigin(request: NextRequest) {
  const host = request.headers.get("host")?.trim();
  const proto =
    request.headers.get("x-forwarded-proto")?.trim() ||
    request.nextUrl.protocol.replace(":", "");
  if (host && proto) return `${proto}://${host}`;
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const next = sanitizeDashboardNextPath(request.nextUrl.searchParams.get("next"), "/");
  const code = request.nextUrl.searchParams.get("code");
  const requestOrigin = resolveRequestOrigin(request);
  let access = null as Awaited<ReturnType<typeof getDashboardAccessForCurrentUser>> | null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const exchangeUser = data?.session?.user ?? null;

    if (error) {
      return NextResponse.redirect(
        new URL(getDashboardAuthRedirectPath({ next, reason: "oauth_error" }), requestOrigin)
      );
    }

    if (exchangeUser) {
      access = await authorizeDashboardSupabaseUser(exchangeUser);
    }
  }

  if (!access) {
    access = await getDashboardAccessForCurrentUser();
  }
  if (!access.ok) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL(getDashboardAuthRedirectPath({ next, reason: access.reason }), requestOrigin)
    );
  }

  return NextResponse.redirect(new URL(next, requestOrigin));
}
