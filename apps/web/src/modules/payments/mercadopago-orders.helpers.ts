import crypto from "crypto";
import { normalizePhoneDigits } from "../../shared/phone";

export const minimumTransactionAmount = 1;
export const defaultPixTtlMs = 24 * 60 * 60 * 1000;

export function normalizeMercadoPagoToken(value: string | undefined | null) {
  if (!value) return "";
  let trimmed = value.trim();
  if (trimmed.startsWith("\"") || trimmed.startsWith("'")) {
    trimmed = trimmed.slice(1);
  }
  if (trimmed.endsWith("\"") || trimmed.endsWith("'")) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.replace(/^Bearer\s+/i, "");
}

export function usesUnsupportedOrdersTestCredential(token: string) {
  return token.toUpperCase().startsWith("TEST-");
}

export function splitName(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "Cliente", lastName: "Corpo & Alma" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Corpo & Alma" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function buildPayerEmail(phoneDigits: string) {
  const clean = normalizePhoneDigits(phoneDigits);
  return `cliente+${clean || "anon"}@corpoealmahumanizado.com.br`;
}

export function splitPhone(phoneDigits: string) {
  const digits = normalizePhoneDigits(phoneDigits);
  const area = digits.slice(0, 2);
  const number = digits.slice(2);
  return { area_code: area || "11", number: number || digits };
}

export function resolvePayerEmail({
  providedEmail,
  phoneDigits,
}: {
  providedEmail?: string | null;
  phoneDigits: string;
}) {
  const normalized = providedEmail?.trim();
  return normalized && normalized.length > 0 ? normalized : buildPayerEmail(phoneDigits);
}

export function parseNumericAmount(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function parseIsoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

export function parseApiPayload(payloadText: string) {
  if (!payloadText) return null;
  try {
    return JSON.parse(payloadText) as Record<string, unknown>;
  } catch {
    return { message: payloadText };
  }
}

export function mapProviderStatusToInternal(providerStatus: string | null | undefined) {
  const normalized = (providerStatus ?? "").toLowerCase();

  if (
    normalized === "approved" ||
    normalized === "processed" ||
    normalized === "accredited" ||
    normalized === "partially_refunded"
  ) {
    return "paid" as const;
  }

  if (
    normalized === "rejected" ||
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "charged_back" ||
    normalized === "failed" ||
    normalized === "refunded"
  ) {
    return "failed" as const;
  }

  return "pending" as const;
}

function getPayloadCauseMessage(payload: Record<string, unknown> | null) {
  if (!payload) return null;
  const cause = payload.cause;
  if (!Array.isArray(cause)) return null;
  const parts = cause
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const causeItem = item as Record<string, unknown>;
      if (typeof causeItem.description === "string" && causeItem.description.trim().length > 0) {
        return causeItem.description.trim();
      }
      if (typeof causeItem.code === "string" && causeItem.code.trim().length > 0) {
        return causeItem.code.trim();
      }
      return null;
    })
    .filter((entry): entry is string => Boolean(entry));

  return parts.length > 0 ? parts.join(" | ") : null;
}

function getPayloadErrorsMessage(payload: Record<string, unknown> | null) {
  if (!payload) return null;
  const errors = payload.errors;
  if (!Array.isArray(errors)) return null;
  const parts = errors
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const errorItem = entry as Record<string, unknown>;
      const message =
        typeof errorItem.message === "string" && errorItem.message.trim().length > 0
          ? errorItem.message.trim()
          : null;
      const code =
        typeof errorItem.code === "string" && errorItem.code.trim().length > 0
          ? errorItem.code.trim()
          : null;
      return message ?? code;
    })
    .filter((entry): entry is string => Boolean(entry));
  return parts.length > 0 ? parts.join(" | ") : null;
}

export function getPayloadMessage(payload: Record<string, unknown> | null, fallback: string) {
  if (!payload) return fallback;
  const directMessage =
    typeof payload.message === "string" && payload.message.trim().length > 0
      ? payload.message.trim()
      : null;
  const errorMessage =
    typeof payload.error === "string" && payload.error.trim().length > 0
      ? payload.error.trim()
      : null;
  const errorsMessage = getPayloadErrorsMessage(payload);
  const causeMessage = getPayloadCauseMessage(payload);
  return directMessage ?? errorMessage ?? errorsMessage ?? causeMessage ?? fallback;
}

function collectMercadoPagoDetails(payload: Record<string, unknown> | null) {
  if (!payload) return "";
  const details = new Set<string>();

  const collectFromErrors = (input: unknown) => {
    if (!Array.isArray(input)) return;
    input.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const record = entry as Record<string, unknown>;
      const code = typeof record.code === "string" ? record.code : null;
      const message = typeof record.message === "string" ? record.message : null;
      if (code) details.add(code);
      if (message) details.add(message);
      if (Array.isArray(record.details)) {
        record.details.forEach((item) => {
          if (typeof item === "string") details.add(item);
        });
      }
    });
  };

  collectFromErrors(payload.errors);
  collectFromErrors(payload.cause);

  return Array.from(details).join(" | ").toLowerCase();
}

export function mapMercadoPagoUserMessage({
  method,
  status,
  payload,
  fallback,
}: {
  method: "card" | "pix" | "point";
  status: number;
  payload: Record<string, unknown> | null;
  fallback: string;
}) {
  const details = collectMercadoPagoDetails(payload);

  if (status === 401 || details.includes("invalid_credentials")) {
    return "Pagamento indisponível no momento. Tente novamente em alguns minutos.";
  }
  if (details.includes("high_risk")) {
    return "Cartão recusado por segurança. Tente outro cartão ou Pix.";
  }
  if (details.includes("invalid_users_involved")) {
    return "Não foi possível validar os dados do pagador. Confira nome, CPF e email.";
  }
  if (details.includes("invalid_transaction_amount")) {
    return "Valor de pagamento inválido para processamento.";
  }
  if (details.includes("unsupported_properties")) {
    return "Pagamento indisponível no momento. Tente novamente em instantes.";
  }
  if (details.includes("failed") && method === "card") {
    return "Cartão não aprovado. Tente outro cartão ou Pix.";
  }
  if (details.includes("failed") && method === "pix") {
    return "Não foi possível gerar o Pix agora. Tente novamente.";
  }
  if (details.includes("failed") && method === "point") {
    return "Cobrança na maquininha não concluída. Verifique o terminal e tente novamente.";
  }

  return fallback;
}

export function buildIdempotencyKey(parts: string[]) {
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 64);
}

export function roundCurrencyValue(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function deriveAppointmentPaymentStatus(params: {
  total: number;
  paidTotal: number;
  appointmentStatus?: string | null;
  currentPaymentStatus?: string | null;
}) {
  const total = roundCurrencyValue(Number(params.total ?? 0));
  const paidTotal = roundCurrencyValue(Number(params.paidTotal ?? 0));
  const appointmentStatus = params.appointmentStatus ?? null;
  const currentPaymentStatus = params.currentPaymentStatus ?? null;

  if (currentPaymentStatus === "waived") {
    return "waived" as const;
  }

  if (currentPaymentStatus === "refunded" && paidTotal <= 0) {
    return "refunded" as const;
  }

  if (total <= 0) {
    return "paid" as const;
  }

  if (paidTotal + 0.009 >= total) {
    return "paid" as const;
  }

  if (paidTotal > 0) {
    return appointmentStatus === "completed" ? ("pending" as const) : ("partial" as const);
  }

  return "pending" as const;
}
