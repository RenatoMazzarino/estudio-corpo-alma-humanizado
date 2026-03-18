import { normalizePhoneDigits } from "../../shared/phone";

function resolveBrazilDialDigits(value: string | null | undefined) {
  const digits = normalizePhoneDigits(value);
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function buildClientPhoneHref(value: string | null | undefined) {
  const digits = resolveBrazilDialDigits(value);
  return digits ? `tel:+${digits}` : null;
}

export function buildClientWhatsAppHref(value: string | null | undefined, message?: string) {
  const digits = resolveBrazilDialDigits(value);
  if (!digits) return null;
  const params = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${params}`;
}

export function buildNewAppointmentHref(clientId: string, returnTo = "/clientes") {
  const params = new URLSearchParams({ clientId, returnTo });
  return `/novo?${params.toString()}`;
}
