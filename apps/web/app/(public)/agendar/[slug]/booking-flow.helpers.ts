export function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidPhoneDigits(value: string) {
  return value.length === 10 || value.length === 11;
}

export function normalizeCpfDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function isValidCpfDigits(value: string) {
  return value.length === 11;
}

export function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function resolveSignalPercentage(value: number | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30;
  return Math.min(parsed, 100);
}

export function resolvePositiveMinutes(value: number | null | undefined, fallback: number) {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

export function buildWhatsAppLink(whatsappNumber?: string | null) {
  if (!whatsappNumber) return null;
  const digits = whatsappNumber.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.length <= 11 ? `55${digits}` : digits;
  const message = encodeURIComponent("Olá! Gostaria de falar com a Flora sobre meu agendamento.");
  return `https://wa.me/${normalized}?text=${message}`;
}

export function buildMapsQuery(parts: Array<string | null | undefined>) {
  return parts.filter((value) => value && value.trim().length > 0).join(", ");
}

export function resolvePublicClientFullName(params: {
  firstName: string;
  lastName: string;
  fallbackName: string;
}) {
  return [params.firstName.trim(), params.lastName.trim()].filter(Boolean).join(" ") || params.fallbackName.trim();
}

export function resolveClientHeaderFirstName(value: string) {
  const full = value.trim();
  if (!full) return "Visitante";
  return full.split(/\s+/)[0] ?? "Visitante";
}

export function computePixProgress(params: {
  createdAt?: string | null;
  expiresAt?: string | null;
  nowMs: number;
}) {
  const createdAtMs = params.createdAt ? Date.parse(params.createdAt) : Number.NaN;
  const expiresAtMs = params.expiresAt ? Date.parse(params.expiresAt) : Number.NaN;
  const totalMs =
    Number.isFinite(createdAtMs) && Number.isFinite(expiresAtMs) && expiresAtMs > createdAtMs
      ? expiresAtMs - createdAtMs
      : 24 * 60 * 60 * 1000;
  const remainingMs = Number.isFinite(expiresAtMs) ? Math.max(0, expiresAtMs - params.nowMs) : totalMs;
  const progressPct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  const isExpired = remainingMs <= 0;
  return {
    remainingMs,
    progressPct,
    isExpired,
  };
}
