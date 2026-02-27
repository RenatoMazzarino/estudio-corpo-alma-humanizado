import type { Json } from "../../../lib/supabase/types";
import { normalizePhoneDigits } from "../../shared/phone";
import { AppError } from "../../shared/errors/AppError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import {
  buildIdempotencyKey,
  defaultPixTtlMs,
  getPayloadMessage,
  mapMercadoPagoUserMessage,
  mapProviderStatusToInternal,
  parseApiPayload,
  parseNumericAmount,
  resolvePayerEmail,
  splitName,
  splitPhone,
} from "./mercadopago-orders.helpers";
import { resolveMercadoPagoAccessToken } from "./mercadopago-access-token";
import {
  ensureValidPaymentContext,
  extractOrder,
  resolveOrderPayment,
  upsertAppointmentPayment,
} from "./mercadopago-orders-core";
import { recalculateAppointmentPaymentStatus } from "./mercadopago-orders-financial";
import type { CardOrderResult, PixOrderResult, PointCardMode, PointOrderResult } from "./mercadopago-orders.types";

export async function createOnlineCardOrderForAppointment({
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
  payerEmail?: string | null;
  payerName: string;
  payerPhone: string;
  identificationType?: string;
  identificationNumber?: string;
}): Promise<ActionResult<CardOrderResult>> {
  const contextResult = await ensureValidPaymentContext({ appointmentId, tenantId, amount });
  if (!contextResult.ok) return contextResult;

  const tokenResult = resolveMercadoPagoAccessToken();
  if (!tokenResult.ok) return tokenResult;
  const accessToken = tokenResult.data;

  const { firstName, lastName } = splitName(payerName);
  const phoneDigits = normalizePhoneDigits(payerPhone);

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

  const normalizedInstallments = Number.isFinite(installments) ? Math.max(1, installments) : 1;
  const idempotencyKey = buildIdempotencyKey([
    "online-card",
    appointmentId,
    paymentMethodId,
    Number(amount.toFixed(2)).toFixed(2),
    token,
  ]);

  let response: Response;
  try {
    response = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
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
    return fail(new AppError("Falha de rede ao processar cartão. Tente novamente.", "UNKNOWN", 500, details));
  }

  const payloadText = await response.text();
  const payload = parseApiPayload(payloadText);
  const payloadMessage = getPayloadMessage(payload, "Erro ao processar pagamento com cartão.");

  if (!response.ok) {
    const userMessage = mapMercadoPagoUserMessage({
      method: "card",
      status: response.status,
      payload,
      fallback: payloadMessage,
    });
    return fail(new AppError(userMessage, "SUPABASE_ERROR", response.status, payload));
  }

  const order = extractOrder(payload);
  const orderData = resolveOrderPayment(order);
  if (!orderData.paymentId || !orderData.orderId) {
    return fail(new AppError("Resposta inválida do Mercado Pago ao processar cartão.", "SUPABASE_ERROR", 502, payload));
  }

  const internalStatus = mapProviderStatusToInternal(orderData.providerStatus);
  const transactionAmount = parseNumericAmount(orderData.amount, amount);

  const upsertResult = await upsertAppointmentPayment({
    appointmentId,
    tenantId,
    method: "card",
    amount: transactionAmount,
    status: internalStatus,
    providerRef: orderData.paymentId,
    providerOrderId: orderData.orderId,
    paymentMethodId: orderData.paymentMethodId ?? paymentMethodId,
    installments: orderData.installments ?? normalizedInstallments,
    cardMode: "credit",
    rawPayload: (payload ?? null) as Json | null,
  });
  if (!upsertResult.ok) return upsertResult;

  if (internalStatus === "paid") {
    const recalcResult = await recalculateAppointmentPaymentStatus({ appointmentId, tenantId });
    if (!recalcResult.ok) return recalcResult;
  }

  return ok({
    id: orderData.paymentId,
    order_id: orderData.orderId,
    status: orderData.providerStatus,
    internal_status: internalStatus,
    status_detail: orderData.statusDetail,
    transaction_amount: transactionAmount,
  });
}

export async function createPixOrderForAppointment({
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
  payerEmail?: string | null;
  payerName: string;
  payerPhone: string;
  attempt?: number;
}): Promise<ActionResult<PixOrderResult>> {
  const contextResult = await ensureValidPaymentContext({ appointmentId, tenantId, amount });
  if (!contextResult.ok) return contextResult;

  const tokenResult = resolveMercadoPagoAccessToken();
  if (!tokenResult.ok) return tokenResult;
  const accessToken = tokenResult.data;

  const { firstName, lastName } = splitName(payerName);
  const phoneDigits = normalizePhoneDigits(payerPhone);
  const payer = {
    email: resolvePayerEmail({ providedEmail: payerEmail, phoneDigits }),
    first_name: firstName,
    last_name: lastName,
    phone: splitPhone(phoneDigits),
  };

  const normalizedAttempt = Number.isFinite(attempt) && Number(attempt) >= 0 ? Math.floor(Number(attempt)) : 0;
  const idempotencyKey = buildIdempotencyKey([
    "online-pix",
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
        "X-Idempotency-Key": idempotencyKey,
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
    return fail(new AppError("Falha de rede ao criar pagamento Pix. Tente novamente.", "UNKNOWN", 500, details));
  }

  const payloadText = await response.text();
  const payload = parseApiPayload(payloadText);
  const payloadMessage = getPayloadMessage(payload, "Erro ao criar pagamento Pix.");

  if (!response.ok) {
    const userMessage = mapMercadoPagoUserMessage({
      method: "pix",
      status: response.status,
      payload,
      fallback: payloadMessage,
    });
    return fail(new AppError(userMessage, "SUPABASE_ERROR", response.status, payload));
  }

  const order = extractOrder(payload);
  const orderData = resolveOrderPayment(order);
  if (!orderData.paymentId || !orderData.orderId) {
    return fail(new AppError("Resposta inválida do Mercado Pago ao criar Pix.", "SUPABASE_ERROR", 502, payload));
  }

  const internalStatus = mapProviderStatusToInternal(orderData.providerStatus);
  const transactionAmount = parseNumericAmount(orderData.amount, amount);

  const upsertResult = await upsertAppointmentPayment({
    appointmentId,
    tenantId,
    method: "pix",
    amount: transactionAmount,
    status: internalStatus,
    providerRef: orderData.paymentId,
    providerOrderId: orderData.orderId,
    paymentMethodId: "pix",
    rawPayload: (payload ?? null) as Json | null,
  });
  if (!upsertResult.ok) return upsertResult;

  if (internalStatus === "paid") {
    const recalcResult = await recalculateAppointmentPaymentStatus({ appointmentId, tenantId });
    if (!recalcResult.ok) return recalcResult;
  }

  const expiresAt =
    orderData.expiresAt ?? new Date(new Date(orderData.createdAt).getTime() + defaultPixTtlMs).toISOString();

  return ok({
    id: orderData.paymentId,
    order_id: orderData.orderId,
    status: orderData.providerStatus,
    internal_status: internalStatus,
    ticket_url: orderData.ticketUrl,
    qr_code: orderData.qrCode,
    qr_code_base64: orderData.qrCodeBase64,
    transaction_amount: transactionAmount,
    created_at: orderData.createdAt,
    expires_at: expiresAt,
  });
}

export async function createPointOrderForAppointment({
  appointmentId,
  tenantId,
  amount,
  terminalId,
  cardMode,
  attempt,
}: {
  appointmentId: string;
  tenantId: string;
  amount: number;
  terminalId: string;
  cardMode: PointCardMode;
  attempt?: number;
}): Promise<ActionResult<PointOrderResult>> {
  const contextResult = await ensureValidPaymentContext({ appointmentId, tenantId, amount });
  if (!contextResult.ok) return contextResult;

  const tokenResult = resolveMercadoPagoAccessToken();
  if (!tokenResult.ok) return tokenResult;
  const accessToken = tokenResult.data;

  const normalizedTerminalId = terminalId.trim();
  if (!normalizedTerminalId) {
    return fail(new AppError("Terminal Point não configurado.", "VALIDATION_ERROR", 400));
  }

  const normalizedAttempt = Number.isFinite(attempt) && Number(attempt) >= 0 ? Math.floor(Number(attempt)) : 0;
  const idempotencyKey = buildIdempotencyKey([
    "point-card",
    appointmentId,
    normalizedTerminalId,
    cardMode,
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
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        type: "point",
        processing_mode: "automatic",
        total_amount: amount.toFixed(2),
        external_reference: appointmentId,
        config: {
          point: {
            terminal_id: normalizedTerminalId,
          },
        },
        transactions: {
          payments: [
            {
              amount: amount.toFixed(2),
              payment_method: {
                type: cardMode === "debit" ? "debit_card" : "credit_card",
              },
            },
          ],
        },
      }),
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return fail(
      new AppError("Falha de rede ao enviar cobrança para maquininha.", "UNKNOWN", 500, details)
    );
  }

  const payloadText = await response.text();
  const payload = parseApiPayload(payloadText);
  const payloadMessage = getPayloadMessage(payload, "Erro ao cobrar na maquininha.");

  if (!response.ok) {
    const userMessage = mapMercadoPagoUserMessage({
      method: "point",
      status: response.status,
      payload,
      fallback: payloadMessage,
    });
    return fail(new AppError(userMessage, "SUPABASE_ERROR", response.status, payload));
  }

  const order = extractOrder(payload);
  const orderData = resolveOrderPayment(order);
  if (!orderData.paymentId || !orderData.orderId) {
    return fail(new AppError("Resposta inválida do Mercado Pago para cobrança Point.", "SUPABASE_ERROR", 502, payload));
  }

  const internalStatus = mapProviderStatusToInternal(orderData.providerStatus);
  const transactionAmount = parseNumericAmount(orderData.amount, amount);

  const upsertResult = await upsertAppointmentPayment({
    appointmentId,
    tenantId,
    method: "card",
    amount: transactionAmount,
    status: internalStatus,
    providerRef: orderData.paymentId,
    providerOrderId: orderData.orderId,
    pointTerminalId: normalizedTerminalId,
    cardMode,
    paymentMethodId: orderData.paymentMethodId,
    rawPayload: (payload ?? null) as Json | null,
  });
  if (!upsertResult.ok) return upsertResult;

  if (internalStatus === "paid") {
    const recalcResult = await recalculateAppointmentPaymentStatus({ appointmentId, tenantId });
    if (!recalcResult.ok) return recalcResult;
  }

  return ok({
    id: orderData.paymentId,
    order_id: orderData.orderId,
    status: orderData.providerStatus,
    internal_status: internalStatus,
    status_detail: orderData.statusDetail,
    transaction_amount: transactionAmount,
    point_terminal_id: normalizedTerminalId,
    card_mode: cardMode,
  });
}
