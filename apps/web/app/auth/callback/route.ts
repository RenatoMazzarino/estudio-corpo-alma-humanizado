import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import {
  getDashboardAccessForCurrentUser,
  getDashboardAuthRedirectPath,
  sanitizeDashboardNextPath,
} from "../../../src/modules/auth/dashboard-access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const next = sanitizeDashboardNextPath(request.nextUrl.searchParams.get("next"), "/");
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL(getDashboardAuthRedirectPath({ next, reason: access.reason }), request.nextUrl.origin)
    );
  }

  return NextResponse.redirect(new URL(next, request.nextUrl.origin));
}

