import { AppError } from "../../../shared/errors/AppError";
import { fail, ok, type ActionResult } from "../../../shared/errors/result";
import {
  buildSpotifyAuthHeader,
  getSpotifyClientId,
  getSpotifyClientSecret,
  SPOTIFY_ACCOUNTS_API,
  SPOTIFY_WEB_API,
} from "./config";
import type { SpotifyTokenResponse } from "./types";

export async function exchangeSpotifyCode(params: {
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

  let response: Response;
  try {
    response = await fetch(`${SPOTIFY_ACCOUNTS_API}/api/token`, {
      method: "POST",
      headers: {
        Authorization: buildSpotifyAuthHeader(clientId, clientSecret),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  } catch {
    return fail(new AppError("Falha de rede ao autenticar com Spotify.", "SUPABASE_ERROR", 502));
  }

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

export async function refreshSpotifyToken(refreshToken: string): Promise<ActionResult<SpotifyTokenResponse>> {
  const clientId = getSpotifyClientId();
  const clientSecret = getSpotifyClientSecret();
  if (!clientId || !clientSecret) {
    return fail(new AppError("SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET não configurados.", "CONFIG_ERROR", 500));
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  let response: Response;
  try {
    response = await fetch(`${SPOTIFY_ACCOUNTS_API}/api/token`, {
      method: "POST",
      headers: {
        Authorization: buildSpotifyAuthHeader(clientId, clientSecret),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  } catch {
    return fail(new AppError("Falha de rede ao renovar token do Spotify.", "SUPABASE_ERROR", 502));
  }

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

export async function fetchSpotifyUserProfile(
  accessToken: string
): Promise<ActionResult<{ id: string; displayName: string | null }>> {
  let response: Response;
  try {
    response = await fetch(`${SPOTIFY_WEB_API}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
  } catch {
    return fail(new AppError("Falha de rede ao buscar perfil do Spotify.", "SUPABASE_ERROR", 502));
  }

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

export async function spotifyApiRequest<T>(params: {
  accessToken: string;
  path: string;
  method?: "GET" | "POST" | "PUT";
  body?: Record<string, unknown> | null;
}): Promise<ActionResult<T | null>> {
  let response: Response;
  try {
    response = await fetch(`${SPOTIFY_WEB_API}${params.path}`, {
      method: params.method ?? "GET",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: params.body ? JSON.stringify(params.body) : undefined,
      cache: "no-store",
    });
  } catch {
    return fail(new AppError("Falha de rede ao consultar Spotify.", "SUPABASE_ERROR", 502));
  }

  if (response.status === 204) {
    return ok(null as T | null);
  }

  if (!response.ok) {
    const text = await response.text();
    return fail(new AppError(`Spotify API error (${response.status}): ${text}`, "SUPABASE_ERROR", 502));
  }

  const text = await response.text();
  if (!text) return ok(null as T | null);

  try {
    return ok(JSON.parse(text) as T);
  } catch {
    return fail(new AppError("Resposta inesperada do Spotify.", "SUPABASE_ERROR", 502));
  }
}
