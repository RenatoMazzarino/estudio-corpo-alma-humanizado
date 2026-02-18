import { Buffer } from "node:buffer";
import { AppError } from "../../../shared/errors/AppError";
import { fail, ok, type ActionResult } from "../../../shared/errors/result";
import { FIXED_TENANT_ID } from "../../../../lib/tenant-context";
import { getSettings, updateSettings } from "../../settings/repository";

const SPOTIFY_ACCOUNTS_API = "https://accounts.spotify.com";
const SPOTIFY_WEB_API = "https://api.spotify.com/v1";
const TOKEN_REFRESH_SKEW_MS = 60_000;

export type SpotifyPlayerAction = "play" | "pause" | "next" | "previous";

export type SpotifyPlayerState = {
  connected: boolean;
  enabled: boolean;
  hasActiveDevice: boolean;
  isPlaying: boolean;
  trackName: string | null;
  artistName: string | null;
  trackUrl: string | null;
  playlistUrl: string | null;
  deviceName: string | null;
  message: string | null;
};

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  scope?: string;
  expires_in: number;
  refresh_token?: string;
};

type SpotifyConnection = {
  accessToken: string;
  enabled: boolean;
  playlistUrl: string | null;
  playlistUri: string | null;
};

export function getSpotifyClientId() {
  return process.env.SPOTIFY_CLIENT_ID?.trim() ?? "";
}

function getSpotifyClientSecret() {
  return process.env.SPOTIFY_CLIENT_SECRET?.trim() ?? "";
}

export function resolveSpotifyRedirectUri(origin: string) {
  const envUri = process.env.SPOTIFY_REDIRECT_URI?.trim();
  if (envUri) return envUri;
  return `${origin.replace(/\/$/, "")}/api/integrations/spotify/callback`;
}

export function getSpotifyScopes() {
  return [
    "user-read-playback-state",
    "user-read-currently-playing",
    "user-modify-playback-state",
  ];
}

function extractSpotifyPlaylistId(rawUrl: string | null | undefined) {
  const trimmed = (rawUrl ?? "").trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("spotify:playlist:")) {
    const id = trimmed.split(":")[2];
    return id?.trim() || null;
  }

  try {
    const parsed = new URL(trimmed);
    const match = parsed.pathname.match(/\/playlist\/([A-Za-z0-9]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function spotifyUriToOpenUrl(uri: string | null | undefined) {
  if (!uri) return null;
  const parts = uri.split(":");
  if (parts.length < 3) return null;
  const type = parts[1]?.trim();
  const id = parts[2]?.trim();
  if (!type || !id) return null;
  return `https://open.spotify.com/${type}/${id}`;
}

function resolvePlaylistUrl(settingsPlaylistUrl: string | null | undefined) {
  const normalized = settingsPlaylistUrl?.trim();
  if (normalized) return normalized;
  return (
    process.env.NEXT_PUBLIC_ATTENDANCE_SPOTIFY_PLAYLIST_URL?.trim() ??
    process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_URL?.trim() ??
    null
  );
}

function resolvePlaylistUri(settingsPlaylistUrl: string | null | undefined) {
  const playlistId = extractSpotifyPlaylistId(resolvePlaylistUrl(settingsPlaylistUrl));
  return playlistId ? `spotify:playlist:${playlistId}` : null;
}

function buildSpotifyAuthHeader(clientId: string, clientSecret: string) {
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${encoded}`;
}

async function exchangeSpotifyCode(params: {
  code: string;
  redirectUri: string;
}): Promise<ActionResult<SpotifyTokenResponse>> {
  const clientId = getSpotifyClientId();
  const clientSecret = getSpotifyClientSecret();
  if (!clientId || !clientSecret) {
    return fail(new AppError("SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET não configurados.", "CONFIG_ERROR", 500));
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
  });

  const response = await fetch(`${SPOTIFY_ACCOUNTS_API}/api/token`, {
    method: "POST",
    headers: {
      Authorization: buildSpotifyAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    return fail(new AppError(`Falha ao trocar código Spotify (${response.status}): ${text}`, "SUPABASE_ERROR", 502));
  }

  const tokenData = (await response.json()) as SpotifyTokenResponse;
  if (!tokenData.access_token) {
    return fail(new AppError("Resposta inválida da autenticação Spotify.", "SUPABASE_ERROR", 502));
  }

  return ok(tokenData);
}

async function refreshSpotifyToken(refreshToken: string): Promise<ActionResult<SpotifyTokenResponse>> {
  const clientId = getSpotifyClientId();
  const clientSecret = getSpotifyClientSecret();
  if (!clientId || !clientSecret) {
    return fail(new AppError("SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET não configurados.", "CONFIG_ERROR", 500));
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(`${SPOTIFY_ACCOUNTS_API}/api/token`, {
    method: "POST",
    headers: {
      Authorization: buildSpotifyAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    return fail(new AppError(`Falha ao atualizar token Spotify (${response.status}): ${text}`, "SUPABASE_ERROR", 502));
  }

  const tokenData = (await response.json()) as SpotifyTokenResponse;
  if (!tokenData.access_token) {
    return fail(new AppError("Resposta inválida ao atualizar token Spotify.", "SUPABASE_ERROR", 502));
  }

  return ok(tokenData);
}

async function fetchSpotifyUserProfile(accessToken: string): Promise<ActionResult<{ id: string; displayName: string | null }>> {
  const response = await fetch(`${SPOTIFY_WEB_API}/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    return fail(new AppError(`Falha ao obter perfil Spotify (${response.status}): ${text}`, "SUPABASE_ERROR", 502));
  }

  const data = (await response.json()) as { id?: string; display_name?: string | null };
  if (!data.id) {
    return fail(new AppError("Perfil Spotify inválido.", "SUPABASE_ERROR", 502));
  }
  return ok({ id: data.id, displayName: data.display_name ?? null });
}

async function spotifyApiRequest<T>(params: {
  accessToken: string;
  path: string;
  method?: "GET" | "POST" | "PUT";
  body?: Record<string, unknown> | null;
}) {
  const response = await fetch(`${SPOTIFY_WEB_API}${params.path}`, {
    method: params.method ?? "GET",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
    cache: "no-store",
  });

  if (response.status === 204) {
    return ok(null as T | null);
  }

  if (!response.ok) {
    const text = await response.text();
    return fail(new AppError(`Spotify API error (${response.status}): ${text}`, "SUPABASE_ERROR", 502));
  }

  const text = await response.text();
  if (!text) return ok(null as T | null);
  return ok(JSON.parse(text) as T);
}

async function ensureSpotifyAccessToken(): Promise<ActionResult<SpotifyConnection>> {
  const settingsResult = await getSettings(FIXED_TENANT_ID);
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
  await updateSettings(FIXED_TENANT_ID, {
    spotify_access_token: tokenData.access_token,
    spotify_refresh_token: tokenData.refresh_token ?? refreshToken,
    spotify_token_expires_at: nextExpiresAt,
  });

  return ok({
    accessToken: tokenData.access_token,
    enabled: settings.spotify_enabled,
    playlistUrl,
    playlistUri,
  });
}

function toPlayerState(params: {
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

export async function connectSpotifyFromAuthorizationCode(params: {
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
  await updateSettings(FIXED_TENANT_ID, {
    spotify_enabled: true,
    spotify_access_token: tokenData.access_token,
    spotify_refresh_token: tokenData.refresh_token ?? null,
    spotify_token_expires_at: nextExpiresAt,
    spotify_connected_at: new Date().toISOString(),
    spotify_account_id: profileResult.data.id,
    spotify_account_name: profileResult.data.displayName,
  });

  return ok({ accountName: profileResult.data.displayName });
}

export async function disconnectSpotifyIntegration(): Promise<ActionResult<{ ok: true }>> {
  await updateSettings(FIXED_TENANT_ID, {
    spotify_enabled: false,
    spotify_access_token: null,
    spotify_refresh_token: null,
    spotify_token_expires_at: null,
    spotify_connected_at: null,
    spotify_account_id: null,
    spotify_account_name: null,
  });
  return ok({ ok: true });
}

export async function getSpotifyPlayerState(): Promise<ActionResult<SpotifyPlayerState>> {
  const connectionResult = await ensureSpotifyAccessToken();
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

export async function sendSpotifyPlayerAction(action: SpotifyPlayerAction): Promise<ActionResult<SpotifyPlayerState>> {
  const connectionResult = await ensureSpotifyAccessToken();
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
    selectedDeviceId = active?.id ?? devicesResult.data.devices[0]?.id ?? null;
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

  return getSpotifyPlayerState();
}
