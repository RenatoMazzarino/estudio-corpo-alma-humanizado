import type { NextRequest } from "next/server";
import { AppError } from "../../../shared/errors/AppError";
import { resolveTrustedRequestOrigin } from "../../tenancy/http-origin";

export async function resolveRequestOrigin(request: NextRequest) {
  return resolveTrustedRequestOrigin(request);
}

function safeParseUrl(raw: string | null) {
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export async function isSameOriginInteractiveRequest(request: NextRequest) {
  const expectedOrigin = await resolveRequestOrigin(request);

  const originHeader = request.headers.get("origin");
  if (originHeader && originHeader.trim() === expectedOrigin) {
    return true;
  }

  const refererUrl = safeParseUrl(request.headers.get("referer"));
  if (refererUrl && refererUrl.origin === expectedOrigin) {
    return true;
  }

  return false;
}

export function sanitizeSpotifyReturnTo(raw: string | null | undefined) {
  const fallback = "/configuracoes";
  const value = (raw ?? "").trim();
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\") || value.includes("\0")) return fallback;
  return value;
}

const SPOTIFY_UI_SAFE_MESSAGES = new Set([
  "Spotify desabilitado nas configurações.",
  "Spotify não conectado. Conecte em Configurações.",
  "Sem dispositivo ativo no momento.",
  "Abra o Spotify no celular e inicie uma música para habilitar os controles.",
  "Comando não aceito. Verifique se o app Spotify está aberto no celular.",
  "Não foi possível consultar o player agora.",
  "Acesso não autorizado.",
]);

export function sanitizeSpotifyUiErrorMessage(
  error: unknown,
  fallback = "Não foi possível sincronizar o Spotify agora."
) {
  const message =
    typeof error === "object" && error && "message" in error && typeof error.message === "string"
      ? error.message.trim()
      : "";

  if (SPOTIFY_UI_SAFE_MESSAGES.has(message)) return message;

  const code =
    error instanceof AppError
      ? error.code
      : typeof error === "object" && error && "code" in error && typeof error.code === "string"
        ? error.code
        : undefined;

  if (code === "VALIDATION_ERROR") {
    return "Conexão do Spotify indisponível. Verifique em Configurações e tente novamente.";
  }

  if (code === "CONFIG_ERROR") {
    return "Integração Spotify indisponível agora. Tente novamente mais tarde.";
  }

  if (code === "UNAUTHORIZED") {
    return "Acesso não autorizado.";
  }

  return fallback;
}
