import { AppError } from "../../../shared/errors/AppError";
import { fail, ok, type ActionResult } from "../../../shared/errors/result";
import { getSettings, updateSettings } from "../../settings/repository";
import { resolvePlaylistUri, resolvePlaylistUrl, TOKEN_REFRESH_SKEW_MS } from "./config";
import { refreshSpotifyToken } from "./http";
import type { SpotifyConnection, SpotifyPlayerState } from "./types";

export async function ensureSpotifyAccessToken(tenantId: string): Promise<ActionResult<SpotifyConnection>> {
  const settingsResult = await getSettings(tenantId);
  if (settingsResult.error || !settingsResult.data) {
    return fail(new AppError("Configurações não encontradas para Spotify.", "NOT_FOUND", 404));
  }

  const settings = settingsResult.data;
  const playlistUrl = resolvePlaylistUrl(settings.spotify_playlist_url ?? null);
  const playlistUri = resolvePlaylistUri(settings.spotify_playlist_url ?? null);
  if (!settings.spotify_enabled) {
    return fail(new AppError("Spotify desabilitado nas configurações.", "VALIDATION_ERROR", 400));
  }

  const refreshToken = settings.spotify_refresh_token?.trim() ?? "";
  if (!refreshToken) {
    return fail(new AppError("Spotify não conectado. Conecte em Configurações.", "VALIDATION_ERROR", 400));
  }

  const now = Date.now();
  const expiresAt = settings.spotify_token_expires_at
    ? new Date(settings.spotify_token_expires_at).getTime()
    : 0;
  const accessToken = settings.spotify_access_token?.trim() ?? "";
  const shouldRefresh = !accessToken || !expiresAt || expiresAt - TOKEN_REFRESH_SKEW_MS <= now;

  if (!shouldRefresh) {
    return ok({
      accessToken,
      enabled: settings.spotify_enabled,
      playlistUrl,
      playlistUri,
    });
  }

  const refreshResult = await refreshSpotifyToken(refreshToken);
  if (!refreshResult.ok) return fail(refreshResult.error);

  const tokenData = refreshResult.data;
  const nextExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
  const { error: refreshUpdateError } = await updateSettings(tenantId, {
    spotify_access_token: tokenData.access_token,
    spotify_refresh_token: tokenData.refresh_token ?? refreshToken,
    spotify_token_expires_at: nextExpiresAt,
  });
  if (refreshUpdateError) {
    return fail(
      new AppError(
        `Falha ao salvar token Spotify atualizado: ${refreshUpdateError.message}`,
        "SUPABASE_ERROR",
        500
      )
    );
  }

  return ok({
    accessToken: tokenData.access_token,
    enabled: settings.spotify_enabled,
    playlistUrl,
    playlistUri,
  });
}

export function toPlayerState(params: {
  connected: boolean;
  enabled: boolean;
  hasActiveDevice?: boolean;
  isPlaying?: boolean;
  trackName?: string | null;
  artistName?: string | null;
  trackUrl?: string | null;
  playlistUrl?: string | null;
  deviceName?: string | null;
  message?: string | null;
}): SpotifyPlayerState {
  return {
    connected: params.connected,
    enabled: params.enabled,
    hasActiveDevice: params.hasActiveDevice ?? false,
    isPlaying: params.isPlaying ?? false,
    trackName: params.trackName ?? null,
    artistName: params.artistName ?? null,
    trackUrl: params.trackUrl ?? null,
    playlistUrl: params.playlistUrl ?? null,
    deviceName: params.deviceName ?? null,
    message: params.message ?? null,
  };
}
