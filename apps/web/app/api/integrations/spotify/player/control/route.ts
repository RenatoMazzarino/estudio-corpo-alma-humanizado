import { NextRequest, NextResponse } from "next/server";
import { sendSpotifyPlayerAction, type SpotifyPlayerAction } from "../../../../../../src/modules/integrations/spotify/server";
import {
  isSameOriginInteractiveRequest,
  sanitizeSpotifyUiErrorMessage,
} from "../../../../../../src/modules/integrations/spotify/http-guards";
import {
  buildDashboardUnauthorizedJson,
  getDashboardApiAccess,
} from "../../auth-guard";

export const dynamic = "force-dynamic";

function parseAction(value: unknown): SpotifyPlayerAction | null {
  if (value === "play" || value === "pause" || value === "next" || value === "previous") {
    return value;
  }
  return null;
}

export async function POST(request: NextRequest) {
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

  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ ok: false, message: "Payload inválido." }, { status: 400 });
    }

    const action = parseAction((payload as { action?: unknown })?.action);
    if (!action) {
      return NextResponse.json({ ok: false, message: "Ação Spotify inválida." }, { status: 400 });
    }

    const result = await sendSpotifyPlayerAction(action);
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
          message: sanitizeSpotifyUiErrorMessage(result.error, "Não foi possível controlar o Spotify agora."),
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
  } catch {
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
        message: "Falha inesperada no controle do Spotify. Tente novamente.",
      },
      { status: 200 }
    );
  }
}
