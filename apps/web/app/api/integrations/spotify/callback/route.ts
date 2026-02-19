import { NextRequest, NextResponse } from "next/server";
import { connectSpotifyFromAuthorizationCode, resolveSpotifyRedirectUri } from "../../../../../src/modules/integrations/spotify/server";

export const dynamic = "force-dynamic";

function resolveRequestOrigin(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host")?.trim() ||
    request.headers.get("host")?.trim();
  const proto =
    request.headers.get("x-forwarded-proto")?.trim() ||
    request.nextUrl.protocol.replace(":", "");

  if (host && proto) {
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
}

function resolveReturnUrl(request: NextRequest, status: "connected" | "error" | "state_invalid") {
  const cookieReturn = request.cookies.get("spotify_oauth_return_to")?.value || "/configuracoes";
  const target = new URL(cookieReturn, resolveRequestOrigin(request));
  target.searchParams.set("spotify", status);
  return target;
}

export async function GET(request: NextRequest) {
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
