import type { NextRequest } from "next/server";
import { AppError } from "../../../shared/errors/AppError";

export function resolveRequestOrigin(request: NextRequest) {
  const host =
    extractForwardedHeaderValue(request.headers.get("x-forwarded-host")) ??
    extractForwardedHeaderValue(request.headers.get("host"));
  const proto =
    resolveForwardedProto(request.headers.get("x-forwarded-proto")) ??
    resolveForwardedProto(request.nextUrl.protocol.replace(":", ""));

  if (host && proto && isValidOriginParts(host, proto)) {
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
}

function extractForwardedHeaderValue(value: string | null) {
  if (!value) return null;
  const firstValue = value
    .split(",")
    .map((entry) => entry.trim())
    .find(Boolean);
  return firstValue ?? null;
}

function resolveForwardedProto(value: string | null) {
  const normalized = extractForwardedHeaderValue(value)?.toLowerCase();
  if (normalized === "http" || normalized === "https") return normalized;
  return null;
}

function isValidOriginParts(host: string, proto: "http" | "https") {
  try {
    const url = new URL(`${proto}://${host}`);
    return url.host.length > 0;
  } catch {
    return false;
  }
}

function safeParseUrl(raw: string | null) {
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function isSameOriginInteractiveRequest(request: NextRequest) {
  const expectedOrigin = resolveRequestOrigin(request);

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
