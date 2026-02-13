"use server";

import crypto from "crypto";
import { createServiceClient } from "../../../../../lib/supabase/service";
import type { Json } from "../../../../../lib/supabase/types";
import { AppError } from "../../../../../src/shared/errors/AppError";
import { fail, ok, type ActionResult } from "../../../../../src/shared/errors/result";
import { buildPayerEmail, normalizePhoneValue, splitName, splitPhone } from "./helpers";

interface PixPaymentResult {
  id: string;
  status: string;
  ticket_url: string | null;
  qr_code: string | null;
  qr_code_base64: string | null;
  transaction_amount: number;
  created_at: string;
  expires_at: string;
}

interface CardPaymentResult {
  id: string;
  status: string;
  internal_status: "paid" | "pending" | "failed";
  status_detail: string | null;
  transaction_amount: number;
}

interface PaymentStatusResult {
  internal_status: "paid" | "pending" | "failed";
}

type InternalPaymentStatus = "paid" | "pending" | "failed";

type MercadoPagoOrderPaymentMethod = {
  id?: string;
  type?: string;
  ticket_url?: string;
  qr_code?: string;
  qr_code_base64?: string;
  date_of_expiration?: string;
  expiration_date?: string;
  expiration_time?: string;
  installments?: number;
};

type MercadoPagoOrderPayment = {
  id?: string | number;
  amount?: string | number;
  status?: string;
  status_detail?: string;
  date_of_expiration?: string;
  expiration_date?: string;
  created_date?: string;
  date_created?: string;
  payment_method?: MercadoPagoOrderPaymentMethod | null;
};

type MercadoPagoOrderResponse = {
  id?: string;
  status?: string;
  status_detail?: string;
  created_date?: string;
  date_created?: string;
  date_of_expiration?: string;
  expiration_date?: string;
  transactions?: {
    payments?: MercadoPagoOrderPayment[] | null;
  } | null;
};

const mapProviderStatusToInternal = (providerStatus: string | null | undefined): InternalPaymentStatus => {
  const normalized = (providerStatus ?? "").toLowerCase();

  if (
    normalized === "approved" ||
    normalized === "processed" ||
    normalized === "accredited" ||
    normalized === "partially_refunded"
  ) {
    return "paid";
  }

  if (
    normalized === "rejected" ||
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "charged_back" ||
    normalized === "failed" ||
    normalized === "refunded"
  ) {
    return "failed";
  }

  return "pending";
};

const parseNumericAmount = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const parseIsoDate = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
};

const parseApiPayload = (payloadText: string) => {
  if (!payloadText) return null;
  try {
    return JSON.parse(payloadText) as Record<string, unknown>;
  } catch {
    return { message: payloadText };
  }
};

const normalizeMercadoPagoToken = (value: string | undefined | null) => {
  if (!value) return "";
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  return trimmed.replace(/^Bearer\s+/i, "");
};

const usesUnsupportedOrdersTestCredential = (token: string) => token.toUpperCase().startsWith("TEST-");

const ordersCredentialsMessage =
  "Checkout Transparente (Orders API) não aceita credenciais TEST-. Configure MERCADOPAGO_ACCESS_TOKEN e MERCADOPAGO_PUBLIC_KEY com credenciais de PRODUÇÃO da mesma aplicação.";
const minimumTransactionAmount = 1;
const defaultPixTtlMs = 24 * 60 * 60 * 1000;

const resolvePayerEmail = ({
  providedEmail,
  phoneDigits,
}: {
  providedEmail?: string | null;
  phoneDigits: string;
}) => {
  const normalized = providedEmail?.trim();
  return normalized && normalized.length > 0 ? normalized : buildPayerEmail(phoneDigits);
};

const getPayloadCauseMessage = (payload: Record<string, unknown> | null) => {
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
};

const getPayloadErrorsMessage = (payload: Record<string, unknown> | null) => {
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
};

const getPayloadMessage = (
  payload: Record<string, unknown> | null,
  fallback: string
) => {
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
};

const ensureValidPaymentContext = async ({
  appointmentId,
  tenantId,
  amount,
}: {
  appointmentId: string;
  tenantId: string;
  amount: number;
}) => {
  if (amount <= 0) {
    return fail(new AppError("Valor de pagamento inválido.", "VALIDATION_ERROR", 400));
  }
  if (amount < minimumTransactionAmount) {
    return fail(
      new AppError(
        "Valor mínimo para pagamento no Mercado Pago é R$ 1,00. Ajuste o sinal ou o valor do serviço.",
        "VALIDATION_ERROR",
        400
      )
    );
  }

  const supabase = createServiceClient();
  const { data: appointment, error } = await supabase
    .from("appointments")
    .select("id, tenant_id")
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    return fail(
      new AppError(
        "Não foi possível validar o agendamento para pagamento.",
        "SUPABASE_ERROR",
        500,
        error
      )
    );
  }

  if (!appointment) {
    return fail(new AppError("Agendamento não encontrado para pagamento.", "NOT_FOUND", 404));
  }

  return ok(appointment);
};

const buildIdempotencyKey = (parts: string[]) =>
  crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 64);

const recalculateAppointmentPaymentStatus = async ({
  appointmentId,
  tenantId,
}: {
  appointmentId: string;
  tenantId: string;
}) => {
  const supabase = createServiceClient();
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id, tenant_id, price, price_override")
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (appointmentError) {
    return fail(
      new AppError(
        "Não foi possível atualizar o status financeiro do agendamento.",
        "SUPABASE_ERROR",
        500,
        appointmentError
      )
    );
  }

  if (!appointment) {
    return ok(null);
  }

  const { data: paidPayments, error: paidPaymentsError } = await supabase
    .from("appointment_payments")
    .select("amount")
    .eq("tenant_id", tenantId)
    .eq("appointment_id", appointmentId)
    .eq("status", "paid");

  if (paidPaymentsError) {
    return fail(
      new AppError(
        "Não foi possível atualizar o status financeiro do agendamento.",
        "SUPABASE_ERROR",
        500,
        paidPaymentsError
      )
    );
  }

  const total = Number(appointment.price_override ?? appointment.price ?? 0);
  const paidTotal = (paidPayments ?? []).reduce((acc, item) => acc + Number(item.amount ?? 0), 0);
  const nextStatus =
    paidTotal >= total && total > 0 ? "paid" : paidTotal > 0 ? "partial" : "pending";

  const { error: updateError } = await supabase
    .from("appointments")
    .update({ payment_status: nextStatus })
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId);

  if (updateError) {
    return fail(
      new AppError(
        "Não foi possível atualizar o status financeiro do agendamento.",
        "SUPABASE_ERROR",
        500,
        updateError
      )
    );
  }

  return ok(null);
};

export async function createCardPayment({
  appointmentId,
  tenantId,
  amount,
  token,
  paymentMethodId,
  installments,
  payerEmail,
  payerName,
  payerPhone,
  identificationType,
  identificationNumber,
}: {
  appointmentId: string;
  tenantId: string;
  amount: number;
  token: string;
  paymentMethodId: string;
  installments: number;
  payerEmail: string;
  payerName: string;
  payerPhone: string;
  identificationType?: string;
  identificationNumber?: string;
}): Promise<ActionResult<CardPaymentResult>> {
  const contextResult = await ensureValidPaymentContext({ appointmentId, tenantId, amount });
  if (!contextResult.ok) return contextResult;

  const accessToken = normalizeMercadoPagoToken(process.env.MERCADOPAGO_ACCESS_TOKEN);
  if (!accessToken) {
    return fail(
      new AppError(
        "MERCADOPAGO_ACCESS_TOKEN ausente: configure a chave no ambiente.",
        "CONFIG_ERROR",
        500
      )
    );
  }
  if (usesUnsupportedOrdersTestCredential(accessToken)) {
    return fail(new AppError(ordersCredentialsMessage, "CONFIG_ERROR", 500));
  }

  const { firstName, lastName } = splitName(payerName);
  const phoneDigits = normalizePhoneValue(payerPhone);

  const payer: Record<string, unknown> = {
    email: resolvePayerEmail({ providedEmail: payerEmail, phoneDigits }),
    first_name: firstName,
    last_name: lastName,
    phone: splitPhone(phoneDigits),
  };

  if (identificationType && identificationNumber) {
    payer.identification = {
      type: identificationType,
      number: identificationNumber,
    };
  }

  const idempotencyKey = buildIdempotencyKey([
    "card",
    appointmentId,
    paymentMethodId,
    Number(amount.toFixed(2)).toFixed(2),
    token,
  ]);
  const normalizedInstallments = Number.isFinite(installments) ? Math.max(1, installments) : 1;

  let response: Response;
  try {
    response = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({
        type: "online",
        processing_mode: "automatic",
        total_amount: amount.toFixed(2),
        external_reference: appointmentId,
        payer,
        transactions: {
          payments: [
            {
              amount: amount.toFixed(2),
              payment_method: {
                id: paymentMethodId,
                type: "credit_card",
                token,
                installments: normalizedInstallments,
              },
            },
          ],
        },
      }),
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return fail(
      new AppError(
        "Falha de rede ao processar cartão. Tente novamente.",
        "UNKNOWN",
        500,
        details
      )
    );
  }

  const payloadText = await response.text();
  const payload = parseApiPayload(payloadText);
  const payloadMessage = getPayloadMessage(payload, "Erro ao processar pagamento com cartão.");

  if (!response.ok) {
    console.error("[create-card-payment] Mercado Pago error", {
      appointmentId,
      tenantId,
      status: response.status,
      payload,
      payloadText: payloadText.slice(0, 2000),
    });
    const unauthorizedMessage = `Falha de autenticação com Mercado Pago (401). ${ordersCredentialsMessage}`;
    return fail(
      new AppError(
        response.status === 401 ? `${unauthorizedMessage} Detalhe: ${payloadMessage}` : payloadMessage,
        "SUPABASE_ERROR",
        response.status,
        payload
      )
    );
  }

  const orderPayload = payload as MercadoPagoOrderResponse | null;
  const orderId = orderPayload?.id ? String(orderPayload.id) : null;
  const orderPayment = orderPayload?.transactions?.payments?.[0] ?? null;
  const providerRef = orderPayment?.id ? String(orderPayment.id) : orderId;

  if (!providerRef) {
    return fail(
      new AppError(
        "Resposta inválida do Mercado Pago ao processar cartão.",
        "SUPABASE_ERROR",
        502,
        payload
      )
    );
  }

  const status = orderPayment?.status ?? orderPayload?.status ?? "pending";
  const internalStatus = mapProviderStatusToInternal(status);
  const statusDetail = orderPayment?.status_detail ?? orderPayload?.status_detail ?? null;
  const transactionAmount = parseNumericAmount(orderPayment?.amount, amount);
  const paymentMethod = orderPayment?.payment_method?.id ?? paymentMethodId;
  const installmentsValue =
    typeof orderPayment?.payment_method?.installments === "number"
      ? orderPayment.payment_method.installments
      : normalizedInstallments || null;
  const cardLast4 = null;
  const cardBrand = null;

  const result: CardPaymentResult = {
    id: providerRef,
    status,
    internal_status: internalStatus,
    status_detail: statusDetail,
    transaction_amount: transactionAmount,
  };

  const supabase = createServiceClient();
  const rawPayload = (payload ?? null) as unknown as Json | null;
  const { error: upsertError } = await supabase.from("appointment_payments").upsert(
    {
      appointment_id: appointmentId,
      tenant_id: tenantId,
      method: "card",
      amount: result.transaction_amount,
      status: result.internal_status,
      provider_ref: result.id,
      paid_at: result.internal_status === "paid" ? new Date().toISOString() : null,
      payment_method_id: paymentMethod,
      installments: installmentsValue,
      card_last4: cardLast4,
      card_brand: cardBrand,
      raw_payload: rawPayload,
    },
    { onConflict: "provider_ref,tenant_id" }
  );
  if (upsertError) {
    return fail(
      new AppError("Não foi possível registrar o pagamento.", "SUPABASE_ERROR", 500, upsertError)
    );
  }

  if (result.internal_status === "paid") {
    const recalcResult = await recalculateAppointmentPaymentStatus({ appointmentId, tenantId });
    if (!recalcResult.ok) return recalcResult;
  }

  return ok(result);
}

export async function createPixPayment({
  appointmentId,
  tenantId,
  amount,
  payerEmail,
  payerName,
  payerPhone,
  attempt,
}: {
  appointmentId: string;
  tenantId: string;
  amount: number;
  payerEmail: string;
  payerName: string;
  payerPhone: string;
  attempt?: number;
}): Promise<ActionResult<PixPaymentResult>> {
  const contextResult = await ensureValidPaymentContext({ appointmentId, tenantId, amount });
  if (!contextResult.ok) return contextResult;

  const accessToken = normalizeMercadoPagoToken(process.env.MERCADOPAGO_ACCESS_TOKEN);
  if (!accessToken) {
    return fail(
      new AppError(
        "MERCADOPAGO_ACCESS_TOKEN ausente: configure a chave no ambiente.",
        "CONFIG_ERROR",
        500
      )
    );
  }
  if (usesUnsupportedOrdersTestCredential(accessToken)) {
    return fail(new AppError(ordersCredentialsMessage, "CONFIG_ERROR", 500));
  }

  const { firstName, lastName } = splitName(payerName);
  const phoneDigits = normalizePhoneValue(payerPhone);
  const payer = {
    email: resolvePayerEmail({ providedEmail: payerEmail, phoneDigits }),
    first_name: firstName,
    last_name: lastName,
    phone: splitPhone(phoneDigits),
  };

  const normalizedAttempt =
    Number.isFinite(attempt) && Number(attempt) >= 0 ? Math.floor(Number(attempt)) : 0;

  const idempotencyKey = buildIdempotencyKey([
    "pix",
    appointmentId,
    Number(amount.toFixed(2)).toFixed(2),
    String(normalizedAttempt),
  ]);

  let response: Response;
  try {
    response = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({
        type: "online",
        processing_mode: "automatic",
        total_amount: amount.toFixed(2),
        external_reference: appointmentId,
        payer,
        transactions: {
          payments: [
            {
              amount: amount.toFixed(2),
              payment_method: {
                id: "pix",
                type: "bank_transfer",
              },
            },
          ],
        },
      }),
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return fail(
      new AppError(
        "Falha de rede ao criar pagamento Pix. Tente novamente.",
        "UNKNOWN",
        500,
        details
      )
    );
  }

  const payloadText = await response.text();
  const payload = parseApiPayload(payloadText);
  const payloadMessage = getPayloadMessage(payload, "Erro ao criar pagamento Pix.");

  if (!response.ok) {
    console.error("[create-pix-payment] Mercado Pago error", {
      appointmentId,
      tenantId,
      status: response.status,
      payload,
      payloadText: payloadText.slice(0, 2000),
    });
    const unauthorizedMessage = `Falha de autenticação com Mercado Pago (401). ${ordersCredentialsMessage}`;
    return fail(
      new AppError(
        response.status === 401 ? `${unauthorizedMessage} Detalhe: ${payloadMessage}` : payloadMessage,
        "SUPABASE_ERROR",
        response.status,
        payload
      )
    );
  }

  const orderPayload = payload as MercadoPagoOrderResponse | null;
  const orderId = orderPayload?.id ? String(orderPayload.id) : null;
  const orderPayment = orderPayload?.transactions?.payments?.[0] ?? null;
  const providerRef = orderPayment?.id ? String(orderPayment.id) : orderId;

  if (!providerRef) {
    return fail(
      new AppError(
        "Resposta inválida do Mercado Pago ao criar Pix.",
        "SUPABASE_ERROR",
        502,
        payload
      )
    );
  }

  const paymentMethod = orderPayment?.payment_method;
  const status = orderPayment?.status ?? orderPayload?.status ?? "pending";
  const internalStatus = mapProviderStatusToInternal(status);
  const ticketUrl = paymentMethod?.ticket_url ?? null;
  const qrCode = paymentMethod?.qr_code ?? null;
  const qrCodeBase64 = paymentMethod?.qr_code_base64 ?? null;
  const transactionAmount = parseNumericAmount(orderPayment?.amount, amount);
  const createdAt =
    parseIsoDate(orderPayment?.created_date) ??
    parseIsoDate(orderPayment?.date_created) ??
    parseIsoDate(orderPayload?.created_date) ??
    parseIsoDate(orderPayload?.date_created) ??
    new Date().toISOString();
  const providerExpiresAt =
    parseIsoDate(paymentMethod?.date_of_expiration) ??
    parseIsoDate(paymentMethod?.expiration_date) ??
    parseIsoDate(paymentMethod?.expiration_time) ??
    parseIsoDate(orderPayment?.date_of_expiration) ??
    parseIsoDate(orderPayment?.expiration_date) ??
    parseIsoDate(orderPayload?.date_of_expiration) ??
    parseIsoDate(orderPayload?.expiration_date);
  const expiresAt =
    providerExpiresAt ??
    new Date(new Date(createdAt).getTime() + defaultPixTtlMs).toISOString();

  const result: PixPaymentResult = {
    id: providerRef,
    status,
    ticket_url: ticketUrl,
    qr_code: qrCode,
    qr_code_base64: qrCodeBase64,
    transaction_amount: transactionAmount,
    created_at: createdAt,
    expires_at: expiresAt,
  };

  const supabase = createServiceClient();
  const rawPayload = (payload ?? null) as unknown as Json | null;
  const { error: upsertError } = await supabase.from("appointment_payments").upsert(
    {
      appointment_id: appointmentId,
      tenant_id: tenantId,
      method: "pix",
      amount: result.transaction_amount,
      status: internalStatus,
      provider_ref: result.id,
      paid_at: internalStatus === "paid" ? new Date().toISOString() : null,
      payment_method_id: "pix",
      raw_payload: rawPayload,
    },
    { onConflict: "provider_ref,tenant_id" }
  );
  if (upsertError) {
    return fail(
      new AppError("Não foi possível registrar o pagamento.", "SUPABASE_ERROR", 500, upsertError)
    );
  }

  if (internalStatus === "paid") {
    const recalcResult = await recalculateAppointmentPaymentStatus({ appointmentId, tenantId });
    if (!recalcResult.ok) return recalcResult;
  }

  return ok(result);
}

export async function getCardPaymentStatus({
  appointmentId,
  tenantId,
}: {
  appointmentId: string;
  tenantId: string;
}): Promise<ActionResult<PaymentStatusResult>> {
  return getPaymentStatusByMethod({
    appointmentId,
    tenantId,
    method: "card",
  });
}

export async function getPixPaymentStatus({
  appointmentId,
  tenantId,
}: {
  appointmentId: string;
  tenantId: string;
}): Promise<ActionResult<PaymentStatusResult>> {
  return getPaymentStatusByMethod({
    appointmentId,
    tenantId,
    method: "pix",
  });
}

async function getPaymentStatusByMethod({
  appointmentId,
  tenantId,
  method,
}: {
  appointmentId: string;
  tenantId: string;
  method: "card" | "pix";
}): Promise<ActionResult<PaymentStatusResult>> {
  const supabase = createServiceClient();
  const { data: payments, error } = await supabase
    .from("appointment_payments")
    .select("status, created_at")
    .eq("appointment_id", appointmentId)
    .eq("tenant_id", tenantId)
    .eq("method", method)
    .order("created_at", { ascending: false });

  if (error) {
    return fail(
      new AppError("Não foi possível consultar o status do pagamento.", "SUPABASE_ERROR", 500, error)
    );
  }

  const statuses = (payments ?? [])
    .map((item) => (typeof item.status === "string" ? item.status : null))
    .filter((value): value is string => Boolean(value));

  if (statuses.includes("paid")) {
    return ok({ internal_status: "paid" });
  }

  const latestStatus = statuses[0] ?? null;
  if (latestStatus === "failed") {
    return ok({ internal_status: "failed" });
  }
  if (latestStatus === "pending") {
    return ok({ internal_status: "pending" });
  }

  return ok({ internal_status: "pending" });
}
