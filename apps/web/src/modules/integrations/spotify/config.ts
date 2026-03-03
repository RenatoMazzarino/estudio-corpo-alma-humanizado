import { Buffer } from "node:buffer";

export const SPOTIFY_ACCOUNTS_API = "https://accounts.spotify.com";
export const SPOTIFY_WEB_API = "https://api.spotify.com/v1";
export const TOKEN_REFRESH_SKEW_MS = 60_000;

export function getSpotifyClientId() {
  return process.env.SPOTIFY_CLIENT_ID?.trim() ?? "";
}

export function getSpotifyClientSecret() {
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
    "playlist-read-private",
    "playlist-read-collaborative",
  ];
}

export function extractSpotifyPlaylistId(rawUrl: string | null | undefined) {
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

export function spotifyUriToOpenUrl(uri: string | null | undefined) {
  if (!uri) return null;
  const parts = uri.split(":");
  if (parts.length < 3) return null;
  const type = parts[1]?.trim();
  const id = parts[2]?.trim();
  if (!type || !id) return null;
  return `https://open.spotify.com/${type}/${id}`;
}

export function resolvePlaylistUrl(settingsPlaylistUrl: string | null | undefined) {
  const normalized = settingsPlaylistUrl?.trim();
  if (normalized) return normalized;
  return process.env.NEXT_PUBLIC_ATTENDANCE_SPOTIFY_PLAYLIST_URL?.trim() ?? null;
}

export function resolvePlaylistUri(settingsPlaylistUrl: string | null | undefined) {
  const playlistId = extractSpotifyPlaylistId(resolvePlaylistUrl(settingsPlaylistUrl));
  return playlistId ? `spotify:playlist:${playlistId}` : null;
}

export function buildSpotifyAuthHeader(clientId: string, clientSecret: string) {
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${encoded}`;
}
