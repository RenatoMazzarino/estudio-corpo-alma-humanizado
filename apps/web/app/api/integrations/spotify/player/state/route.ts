import { NextRequest, NextResponse } from "next/server";
import { getSpotifyPlayerState } from "../../../../../../src/modules/integrations/spotify/server";
import { isSameOriginInteractiveRequest } from "../../../../../../src/modules/integrations/spotify/http-guards";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isSameOriginInteractiveRequest(request)) {
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
        message: result.error.message,
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
