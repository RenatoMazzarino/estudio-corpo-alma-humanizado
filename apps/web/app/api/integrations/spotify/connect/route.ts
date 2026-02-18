import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSpotifyClientId, getSpotifyScopes, resolveSpotifyRedirectUri } from "../../../../../src/modules/integrations/spotify/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const clientId = getSpotifyClientId();
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/configuracoes?spotify=missing_client_id", request.nextUrl.origin)
    );
  }

  const state = randomUUID();
  const redirectUri = resolveSpotifyRedirectUri(request.nextUrl.origin);
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/configuracoes";

  const authorizationUrl = new URL("https://accounts.spotify.com/authorize");
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("scope", getSpotifyScopes().join(" "));
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("show_dialog", "true");

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  response.cookies.set("spotify_oauth_return_to", returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
