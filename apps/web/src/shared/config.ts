import {
  PRIMARY_STUDIO_BRANDING,
  PRIMARY_STUDIO_PUBLIC_BASE_URL,
  PRIMARY_STUDIO_TENANT_DISPLAY_NAME,
} from "../modules/tenancy/defaults";

export const DEFAULT_PUBLIC_BASE_URL = PRIMARY_STUDIO_PUBLIC_BASE_URL;
export const DEFAULT_STUDIO_DISPLAY_NAME = PRIMARY_STUDIO_TENANT_DISPLAY_NAME;
export const DEFAULT_STUDIO_BRANDING = PRIMARY_STUDIO_BRANDING;

export const ATTENDANCE_PIX_RECEIVER_NAME =
  process.env.NEXT_PUBLIC_ATTENDANCE_PIX_RECEIVER_NAME ?? "ESTUDIO CORPO ALMA";
export const ATTENDANCE_PIX_RECEIVER_CITY =
  process.env.NEXT_PUBLIC_ATTENDANCE_PIX_RECEIVER_CITY ?? "SAO PAULO";
export const ATTENDANCE_PIX_TXID = process.env.NEXT_PUBLIC_ATTENDANCE_PIX_TXID ?? "***";

export function normalizeBaseUrl(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function buildPublicAppUrl(pathname: string, baseUrl = DEFAULT_PUBLIC_BASE_URL) {
  const normalizedBase = normalizeBaseUrl(baseUrl) ?? DEFAULT_PUBLIC_BASE_URL;
  const normalizedPath = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  return new URL(normalizedPath, `${normalizedBase}/`).toString();
}
