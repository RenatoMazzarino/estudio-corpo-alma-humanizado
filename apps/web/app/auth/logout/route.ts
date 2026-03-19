import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { getDashboardAuthRedirectPath } from "../../../src/modules/auth/dashboard-access";
import { resolveTrustedRequestOrigin } from "../../../src/modules/tenancy/http-origin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const requestOrigin = await resolveTrustedRequestOrigin(request);
  return NextResponse.redirect(
    new URL(getDashboardAuthRedirectPath({ reason: "signed_out" }), requestOrigin)
  );
}
