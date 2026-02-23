import { NextRequest, NextResponse } from "next/server";
import { getSpotifyPlayerState } from "../../../../../../src/modules/integrations/spotify/server";
import {
  isSameOriginInteractiveRequest,
  sanitizeSpotifyUiErrorMessage,
} from "../../../../../../src/modules/integrations/spotify/http-guards";
import { hasSpotifyDashboardAccess } from "../../auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isSameOriginInteractiveRequest(request) || !(await hasSpotifyDashboardAccess())) {
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
        message: "Acesso não autorizado.",
      },
      { status: 403 }
    );
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
