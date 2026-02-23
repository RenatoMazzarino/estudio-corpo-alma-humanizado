import { NextRequest, NextResponse } from "next/server";
import { connectSpotifyFromAuthorizationCode, resolveSpotifyRedirectUri } from "../../../../../src/modules/integrations/spotify/server";
import {
  resolveRequestOrigin,
  sanitizeSpotifyReturnTo,
} from "../../../../../src/modules/integrations/spotify/http-guards";
import { hasSpotifyDashboardAccess } from "../auth-guard";

export const dynamic = "force-dynamic";

function resolveReturnUrl(request: NextRequest, status: "connected" | "error" | "state_invalid") {
  const cookieReturn = sanitizeSpotifyReturnTo(request.cookies.get("spotify_oauth_return_to")?.value);
  const target = new URL(cookieReturn, resolveRequestOrigin(request));
  target.searchParams.set("spotify", status);
  return target;
}

export async function GET(request: NextRequest) {
  if (!(await hasSpotifyDashboardAccess())) {
    return NextResponse.redirect(new URL("/configuracoes?spotify=forbidden", request.nextUrl.origin));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("spotify_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    const response = NextResponse.redirect(resolveReturnUrl(request, "state_invalid"));
    response.cookies.delete("spotify_oauth_state");
    response.cookies.delete("spotify_oauth_return_to");
    return response;
  }

  const result = await connectSpotifyFromAuthorizationCode({
    code,
    redirectUri: resolveSpotifyRedirectUri(resolveRequestOrigin(request)),
  });

  const response = NextResponse.redirect(resolveReturnUrl(request, result.ok ? "connected" : "error"));
  response.cookies.delete("spotify_oauth_state");
  response.cookies.delete("spotify_oauth_return_to");
  return response;
}
