import type { Json } from "../../../lib/supabase/types";
import { DEFAULT_PUBLIC_BASE_URL } from "../../shared/config";
import { BRAZIL_TIME_ZONE } from "../../shared/timezone";
import { WHATSAPP_AUTOMATION_STUDIO_LOCATION_LINE } from "./automation-config";
import type { NotificationJobRow } from "./repository";

export type WhatsAppNotificationJobType =
  | "appointment_created"
  | "appointment_canceled"
  | "appointment_reminder";

export type MetaWebhookInboundMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  context?: {
    id?: string;
  } | null;
  interactive?: {
    type?: string;
    button_reply?: {
      id?: string;
      title?: string;
    } | null;
  } | null;
  button?: {
    payload?: string;
    text?: string;
  } | null;
};

export const isSupportedWhatsAppJobType = (value: string): value is WhatsAppNotificationJobType =>
  value === "appointment_created" || value === "appointment_canceled" || value === "appointment_reminder";

export const asJsonObject = (value: Json | null | undefined): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

export const getAutomationPayload = (payload: Json | null | undefined) => {
  const root = asJsonObject(payload);
  const automation = asJsonObject(root.automation as Json | undefined);
  return { root, automation };
};

export const mergeJobPayload = (job: NotificationJobRow, patch: Record<string, unknown>): Json => {
  return {
    ...asJsonObject(job.payload),
    ...patch,
  } as Json;
};

export const buildMessageTypeFromJobType = (type: WhatsAppNotificationJobType) => {
  switch (type) {
    case "appointment_created":
      return "auto_appointment_created";
    case "appointment_reminder":
      return "auto_appointment_reminder";
    case "appointment_canceled":
      return "auto_appointment_canceled";
    default:
      return "auto_notification";
  }
};

export const buildAutomationMessagePreview = (job: NotificationJobRow) => {
  const payload = asJsonObject(job.payload);
  const startTime = typeof payload.start_time === "string" ? payload.start_time : null;
  switch (job.type) {
    case "appointment_created":
      return `Automação WhatsApp (agendamento criado)${startTime ? ` • ${startTime}` : ""}`;
    case "appointment_reminder":
      return `Automação WhatsApp (lembrete)${startTime ? ` • ${startTime}` : ""}`;
    case "appointment_canceled":
      return "Automação WhatsApp (agendamento cancelado)";
    default:
      return "Automação WhatsApp";
  }
};

export const onlyDigits = (value: string) => value.replace(/\D/g, "");
const capitalizeFirst = (value: string) => (value ? `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}` : value);

export const parseJsonResponse = async (response: Response) => {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export function extractMetaApiErrorMessage(payload: Record<string, unknown> | null, status: number) {
  if (
    payload &&
    typeof payload.error === "object" &&
    payload.error &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }
  return `Meta WhatsApp API respondeu ${status}.`;
}

export function extractMetaStatusFailureMessage(errors: unknown) {
  if (!Array.isArray(errors)) return null;
  const parts = errors
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const obj = entry as Record<string, unknown>;
      const code =
        typeof obj.code === "number"
          ? String(obj.code)
          : typeof obj.code === "string"
            ? obj.code
            : null;
      const title = typeof obj.title === "string" ? obj.title.trim() : "";
      const message = typeof obj.message === "string" ? obj.message.trim() : "";
      const text = message || title || null;
      if (!code && !text) return null;
      return code && text ? `${code}: ${text}` : code ?? text;
    })
    .filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join(" | ") : null;
}

export const isRetryableDeliveryError = (message: string) => {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("não configurado") ||
    normalized.includes("unauthorized") ||
    normalized.includes("token") ||
    normalized.includes("template") ||
    normalized.includes("verify token")
  ) {
    return false;
  }
  return true;
};

export const computeRetryDelaySeconds = (attemptNumber: number, baseSeconds: number) => {
  const base = Math.max(1, baseSeconds);
  const multiplier = Math.max(1, Math.min(8, attemptNumber));
  return base * multiplier;
};

export const toIsoAfterSeconds = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();

export function formatAppointmentDateForTemplate(startTimeIso: string) {
  const date = new Date(startTimeIso);
  if (Number.isNaN(date.getTime())) {
    return { dateLabel: "--", timeLabel: "--:--" };
  }

  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: BRAZIL_TIME_ZONE,
  }).format(date);
  const dayMonth = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: BRAZIL_TIME_ZONE,
  }).format(date);
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: BRAZIL_TIME_ZONE,
  }).format(date);

  return {
    dateLabel: `${capitalizeFirst(weekday)}, ${dayMonth}`,
    timeLabel: time,
  };
}

export function resolveLocationLineFromAppointmentRecord(record: Record<string, unknown>) {
  const isHomeVisit = Boolean(record.is_home_visit);
  const clients = asJsonObject(record.clients as Json | undefined);
  const clientAddress =
    (typeof clients.endereco_completo === "string" && clients.endereco_completo.trim()) ||
    [
      record.address_logradouro,
      record.address_numero,
      record.address_bairro,
      record.address_cidade,
      record.address_estado,
    ]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean)
      .join(", ");

  if (isHomeVisit) {
    return clientAddress
      ? `No endereço informado: ${clientAddress}`
      : "Atendimento domiciliar (endereço a confirmar)";
  }
  return WHATSAPP_AUTOMATION_STUDIO_LOCATION_LINE
    ? `No estúdio: ${WHATSAPP_AUTOMATION_STUDIO_LOCATION_LINE}`
    : "No estúdio";
}

export function normalizeMetaStatus(status: string | undefined) {
  const value = (status ?? "").trim().toLowerCase();
  if (!value) return "unknown";
  return value;
}

export function mapMetaStatusToAppointmentMessageStatus(status: string) {
  switch (status) {
    case "sent":
      return "provider_sent";
    case "delivered":
      return "provider_delivered";
    case "read":
      return "provider_read";
    case "failed":
      return "provider_failed";
    default:
      return `provider_${status}`;
  }
}

function normalizeButtonReplyText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function extractMetaInboundButtonSelection(message: MetaWebhookInboundMessage) {
  if (message.type === "interactive" && message.interactive?.type === "button_reply") {
    const title =
      typeof message.interactive.button_reply?.title === "string" ? message.interactive.button_reply.title : "";
    const id = typeof message.interactive.button_reply?.id === "string" ? message.interactive.button_reply.id : "";
    return (title || id || "").trim();
  }
  if (message.type === "button") {
    const text = typeof message.button?.text === "string" ? message.button.text : "";
    const payload = typeof message.button?.payload === "string" ? message.button.payload : "";
    return (text || payload || "").trim();
  }
  return "";
}

export function mapButtonSelectionToAction(selection: string) {
  const normalized = normalizeButtonReplyText(selection);
  if (!normalized) return null;
  if (normalized.includes("confirm")) return "confirm";
  if (normalized.includes("reagendar")) return "reschedule";
  if (normalized.includes("falar") || normalized.includes("jana")) return "talk_to_jana";
  return null;
}

export function resolvePublicBaseUrlFromWebhookOrigin(webhookOrigin?: string) {
  if (webhookOrigin) {
    try {
      const parsed = new URL(webhookOrigin);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.origin;
      }
    } catch {
      // fallback abaixo
    }
  }
  return DEFAULT_PUBLIC_BASE_URL;
}
