import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { getDashboardAuthRedirectPath } from "../../../src/modules/auth/dashboard-access";

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
  await supabase.auth.signOut();
  const requestOrigin = resolveRequestOrigin(request);
  return NextResponse.redirect(
    new URL(getDashboardAuthRedirectPath({ reason: "signed_out" }), requestOrigin)
  );
}
