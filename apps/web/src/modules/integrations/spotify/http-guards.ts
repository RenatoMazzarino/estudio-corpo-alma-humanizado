import type { NextRequest } from "next/server";

export function resolveRequestOrigin(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host")?.trim() ||
    request.headers.get("host")?.trim();
  const proto =
    request.headers.get("x-forwarded-proto")?.trim() ||
    request.nextUrl.protocol.replace(":", "");

  if (host && proto) {
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
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

