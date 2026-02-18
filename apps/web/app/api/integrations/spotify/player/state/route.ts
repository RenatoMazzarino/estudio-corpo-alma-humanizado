import { NextResponse } from "next/server";
import { getSpotifyPlayerState } from "../../../../../../src/modules/integrations/spotify/server";

export const dynamic = "force-dynamic";

export async function GET() {
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
