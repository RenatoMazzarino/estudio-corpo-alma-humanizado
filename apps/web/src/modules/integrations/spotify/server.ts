import { AppError } from "../../../shared/errors/AppError";
import { fail, ok, type ActionResult } from "../../../shared/errors/result";
import { updateSettings } from "../../settings/repository";
import {
  getSpotifyClientId,
  getSpotifyScopes,
  resolveSpotifyRedirectUri,
  spotifyUriToOpenUrl,
} from "./config";
import { ensureSpotifyAccessToken, toPlayerState } from "./connection";
import { exchangeSpotifyCode, fetchSpotifyUserProfile, spotifyApiRequest } from "./http";
import type { SpotifyPlayerAction, SpotifyPlayerState } from "./types";

export { getSpotifyClientId, getSpotifyScopes, resolveSpotifyRedirectUri };
export type { SpotifyPlayerAction, SpotifyPlayerState };

export async function connectSpotifyFromAuthorizationCode(params: {
  tenantId: string;
  code: string;
  redirectUri: string;
}): Promise<ActionResult<{ accountName: string | null }>> {
  const codeResult = await exchangeSpotifyCode({
    code: params.code,
    redirectUri: params.redirectUri,
  });
  if (!codeResult.ok) return fail(codeResult.error);

  const tokenData = codeResult.data;
  const profileResult = await fetchSpotifyUserProfile(tokenData.access_token);
  if (!profileResult.ok) return fail(profileResult.error);

  const nextExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
  const { error: connectUpdateError } = await updateSettings(params.tenantId, {
    spotify_enabled: true,
    spotify_access_token: tokenData.access_token,
    spotify_refresh_token: tokenData.refresh_token ?? null,
    spotify_token_expires_at: nextExpiresAt,
    spotify_connected_at: new Date().toISOString(),
    spotify_account_id: profileResult.data.id,
    spotify_account_name: profileResult.data.displayName,
  });
  if (connectUpdateError) {
    return fail(
      new AppError(
        `Falha ao persistir conexão Spotify: ${connectUpdateError.message}`,
        "SUPABASE_ERROR",
        500
      )
    );
  }

  return ok({ accountName: profileResult.data.displayName });
}

export async function disconnectSpotifyIntegration(tenantId: string): Promise<ActionResult<{ ok: true }>> {
  const { error: disconnectUpdateError } = await updateSettings(tenantId, {
    spotify_enabled: false,
    spotify_access_token: null,
    spotify_refresh_token: null,
    spotify_token_expires_at: null,
    spotify_connected_at: null,
    spotify_account_id: null,
    spotify_account_name: null,
  });
  if (disconnectUpdateError) {
    return fail(
      new AppError(
        `Falha ao limpar conexão Spotify: ${disconnectUpdateError.message}`,
        "SUPABASE_ERROR",
        500
      )
    );
  }
  return ok({ ok: true });
}

export async function getSpotifyPlayerState(tenantId: string): Promise<ActionResult<SpotifyPlayerState>> {
  const connectionResult = await ensureSpotifyAccessToken(tenantId);
  if (!connectionResult.ok) {
    return ok(
      toPlayerState({
        connected: false,
        enabled: false,
        message: connectionResult.error.message,
      })
    );
  }

  const connection = connectionResult.data;
  const playerResult = await spotifyApiRequest<{
    is_playing?: boolean;
    device?: { name?: string; is_active?: boolean } | null;
    item?: {
      name?: string;
      artists?: Array<{ name?: string }>;
      external_urls?: { spotify?: string };
    } | null;
    context?: {
      uri?: string;
      external_urls?: { spotify?: string };
    } | null;
  }>({
    accessToken: connection.accessToken,
    path: "/me/player",
  });
  if (!playerResult.ok) {
    return ok(
      toPlayerState({
        connected: true,
        enabled: connection.enabled,
        message: "Não foi possível consultar o player agora.",
        playlistUrl: connection.playlistUrl,
      })
    );
  }

  const player = playerResult.data;
  if (!player) {
    return ok(
      toPlayerState({
        connected: true,
        enabled: connection.enabled,
        hasActiveDevice: false,
        isPlaying: false,
        message: "Sem dispositivo ativo no momento.",
        playlistUrl: connection.playlistUrl,
      })
    );
  }

  const artists = (player.item?.artists ?? [])
    .map((artist) => artist?.name?.trim() ?? "")
    .filter(Boolean)
    .join(", ");
  const playlistUrl =
    player.context?.external_urls?.spotify ??
    spotifyUriToOpenUrl(player.context?.uri) ??
    connection.playlistUrl;

  return ok(
    toPlayerState({
      connected: true,
      enabled: connection.enabled,
      hasActiveDevice: true,
      isPlaying: Boolean(player.is_playing),
      trackName: player.item?.name?.trim() || null,
      artistName: artists || null,
      trackUrl: player.item?.external_urls?.spotify ?? null,
      playlistUrl,
      deviceName: player.device?.name ?? null,
      message: null,
    })
  );
}

export async function sendSpotifyPlayerAction(
  tenantId: string,
  action: SpotifyPlayerAction
): Promise<ActionResult<SpotifyPlayerState>> {
  const connectionResult = await ensureSpotifyAccessToken(tenantId);
  if (!connectionResult.ok) {
    return ok(
      toPlayerState({
        connected: false,
        enabled: false,
        message: connectionResult.error.message,
      })
    );
  }
  const connection = connectionResult.data;

  const devicesResult = await spotifyApiRequest<{
    devices?: Array<{ id?: string; is_active?: boolean }>;
  }>({
    accessToken: connection.accessToken,
    path: "/me/player/devices",
  });

  let selectedDeviceId: string | null = null;
  if (devicesResult.ok && devicesResult.data?.devices?.length) {
    const active = devicesResult.data.devices.find((device) => device.is_active);
    selectedDeviceId = active?.id ?? null;

    if (!selectedDeviceId && action === "play" && devicesResult.data.devices.length === 1) {
      selectedDeviceId = devicesResult.data.devices[0]?.id ?? null;
    }
  }

  if (!selectedDeviceId && action !== "play") {
    return ok(
      toPlayerState({
        connected: true,
        enabled: connection.enabled,
        hasActiveDevice: false,
        message: "Abra o Spotify no celular e inicie uma música para habilitar os controles.",
        playlistUrl: connection.playlistUrl,
      })
    );
  }

  const playerBeforeAction =
    action === "next" || action === "previous"
      ? await spotifyApiRequest<{ item?: { id?: string } | null }>({
          accessToken: connection.accessToken,
          path: "/me/player",
        })
      : null;

  const encodedDevice = selectedDeviceId ? `?device_id=${encodeURIComponent(selectedDeviceId)}` : "";
  const commandPath =
    action === "play"
      ? `/me/player/play${encodedDevice}`
      : action === "pause"
        ? `/me/player/pause${encodedDevice}`
        : action === "next"
          ? `/me/player/next${encodedDevice}`
          : `/me/player/previous${encodedDevice}`;
  const method = action === "play" || action === "pause" ? "PUT" : "POST";

  let body: Record<string, unknown> | null = null;
  if (action === "play" && connection.playlistUri) {
    const stateResult = await spotifyApiRequest<{
      item?: { id?: string } | null;
      is_playing?: boolean;
    }>({
      accessToken: connection.accessToken,
      path: "/me/player",
    });
    const hasCurrent = Boolean(stateResult.ok && stateResult.data?.item?.id);
    if (!hasCurrent) {
      body = { context_uri: connection.playlistUri };
    }
  }

  const commandResult = await spotifyApiRequest<unknown>({
    accessToken: connection.accessToken,
    path: commandPath,
    method,
    body,
  });

  if (!commandResult.ok) {
    return ok(
      toPlayerState({
        connected: true,
        enabled: connection.enabled,
        hasActiveDevice: Boolean(selectedDeviceId),
        message: "Comando não aceito. Verifique se o app Spotify está aberto no celular.",
        playlistUrl: connection.playlistUrl,
      })
    );
  }

  if ((action === "next" || action === "previous") && playerBeforeAction?.ok) {
    const beforeTrackId = playerBeforeAction.data?.item?.id ?? null;
    if (beforeTrackId) {
      await new Promise((resolve) => setTimeout(resolve, 220));
      const playerAfterAction = await spotifyApiRequest<{ item?: { id?: string } | null }>({
        accessToken: connection.accessToken,
        path: "/me/player",
      });
      const afterTrackId = playerAfterAction.ok ? playerAfterAction.data?.item?.id ?? null : null;

      if (afterTrackId && afterTrackId === beforeTrackId) {
        await spotifyApiRequest<unknown>({
          accessToken: connection.accessToken,
          path: commandPath,
          method,
        });
      }
    }
  }

  return getSpotifyPlayerState(tenantId);
}
