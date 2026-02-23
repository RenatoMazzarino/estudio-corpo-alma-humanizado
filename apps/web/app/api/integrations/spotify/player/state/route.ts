import { NextRequest, NextResponse } from "next/server";
import { getSpotifyPlayerState } from "../../../../../../src/modules/integrations/spotify/server";
import {
  isSameOriginInteractiveRequest,
  sanitizeSpotifyUiErrorMessage,
} from "../../../../../../src/modules/integrations/spotify/http-guards";
import {
  buildDashboardUnauthorizedJson,
  getDashboardApiAccess,
} from "../../auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getDashboardApiAccess(request);
  if (!isSameOriginInteractiveRequest(request) || !auth.access.ok) {
    return buildDashboardUnauthorizedJson(request, {
      loginPath: auth.loginPath,
      message: "Sua sessão expirou. Faça login para continuar.",
      extra: {
        connected: false,
        enabled: false,
        hasActiveDevice: false,
        isPlaying: false,
        trackName: null,
        artistName: null,
        trackUrl: null,
        playlistUrl: null,
        deviceName: null,
      },
    });
  }

  const result = await getSpotifyPlayerState();
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        enabled: false,
        hasActiveDevice: false,
        isPlaying: false,
        trackName: null,
        artistName: null,
        trackUrl: null,
        playlistUrl: null,
        deviceName: null,
        message: sanitizeSpotifyUiErrorMessage(result.error, "Não foi possível sincronizar o Spotify agora."),
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      ...result.data,
    },
    { status: 200 }
  );
}
