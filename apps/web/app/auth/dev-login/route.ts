import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import {
  authorizeDashboardSupabaseUser,
  getDashboardAuthRedirectPath,
  sanitizeDashboardNextPath,
} from "../../../src/modules/auth/dashboard-access";
import { resolveTrustedRequestOrigin } from "../../../src/modules/tenancy/http-origin";

export const dynamic = "force-dynamic";

function isDevPasswordLoginEnabled() {
  return (process.env.DEV_PASSWORD_LOGIN_ENABLED ?? "").trim().toLowerCase() === "true";
}

export async function POST(request: NextRequest) {
  const requestOrigin = await resolveTrustedRequestOrigin(request);
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
