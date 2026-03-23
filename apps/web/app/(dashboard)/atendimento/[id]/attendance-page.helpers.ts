export function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const prefix = hours > 0 ? `${hours.toString().padStart(2, "0")}:` : "";
  return `${prefix}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function formatSignedCountdown(totalSeconds: number) {
  const isNegative = totalSeconds < 0;
  const absolute = Math.abs(totalSeconds);
  const base = formatTime(absolute);
  return isNegative ? `-${base}` : base;
}

export function getHeaderPaymentStatusMeta(status: string | null | undefined) {
  switch (status) {
    case "paid":
      return { label: "Pago", className: "border-emerald-200 bg-emerald-50 text-emerald-700", dotClass: "bg-emerald-500" };
    case "partial":
      return { label: "Parcial", className: "border-amber-200 bg-amber-50 text-amber-700", dotClass: "bg-amber-500" };
    case "waived":
      return { label: "Liberado", className: "border-sky-200 bg-sky-50 text-sky-700", dotClass: "bg-sky-500" };
    case "refunded":
      return { label: "Estornado", className: "border-slate-300 bg-slate-100 text-slate-700", dotClass: "bg-slate-500" };
    default:
      return { label: "Pendente", className: "border-orange-200 bg-orange-50 text-orange-700", dotClass: "bg-orange-500" };
  }
}

export function formatAppointmentDateTime(startTime: string) {
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return "";

  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${dateLabel} - ${timeLabel}`;
}

export function formatAppointmentContext(startTime: string, serviceName: string) {
  const dateTimeLabel = formatAppointmentDateTime(startTime);
  if (!dateTimeLabel) return serviceName;
  return serviceName ? `${dateTimeLabel} - ${serviceName}` : dateTimeLabel;
}

export function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "CA";
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function resolvePublicBaseUrl(rawBaseUrl: string) {
  const trimmed = rawBaseUrl.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, "");
  return `https://${trimmed.replace(/\/$/, "")}`;
}

export function normalizePhoneForWhatsapp(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function formatDateToUrlParam(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
