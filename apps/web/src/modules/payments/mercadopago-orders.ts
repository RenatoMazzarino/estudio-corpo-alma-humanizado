import { createServiceClient } from "../../../lib/supabase/service";
import type { Json } from "../../../lib/supabase/types";
import { normalizePhoneDigits } from "../../shared/phone";
import { AppError } from "../../shared/errors/AppError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import {
  buildIdempotencyKey,
  defaultPixTtlMs,
  deriveAppointmentPaymentStatus,
  getPayloadMessage,
  mapMercadoPagoUserMessage,
  mapProviderStatusToInternal,
  minimumTransactionAmount,
  parseApiPayload,
  parseIsoDate,
  parseNumericAmount,
  resolvePayerEmail,
  splitName,
  splitPhone,
} from "./mercadopago-orders.helpers";
import { resolveMercadoPagoAccessToken } from "./mercadopago-access-token";
export {
  configurePointDeviceToPdv,
  listPointDevices,
  type PointDevice,
} from "./mercadopago-point-devices";

export { normalizeMercadoPagoToken } from "./mercadopago-orders.helpers";

export type InternalPaymentStatus = "paid" | "pending" | "failed";
export type PointCardMode = "debit" | "credit";

export interface CardOrderResult {
  id: string;
  order_id: string;
  status: string;
  internal_status: InternalPaymentStatus;
  status_detail: string | null;
  transaction_amount: number;
}

export interface PixOrderResult {
  id: string;
  order_id: string;
  status: string;
  internal_status: InternalPaymentStatus;
  ticket_url: string | null;
  qr_code: string | null;
  qr_code_base64: string | null;
  transaction_amount: number;
  created_at: string;
  expires_at: string;
}

export interface PointOrderResult {
  id: string;
  order_id: string;
  status: string;
  internal_status: InternalPaymentStatus;
  status_detail: string | null;
  transaction_amount: number;
  point_terminal_id: string;
  card_mode: PointCardMode;
}

export interface PointOrderStatusResult {
  id: string;
  order_id: string;
  status: string;
  internal_status: InternalPaymentStatus;
  status_detail: string | null;
  transaction_amount: number;
  point_terminal_id: string | null;
  card_mode: PointCardMode | null;
  appointment_id: string | null;
}

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
  paid_amount?: string | number;
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
  external_reference?: string | null;
  config?: {
    point?: {
      terminal_id?: string | null;
    } | null;
  } | null;
  created_date?: string;
  date_created?: string;
  date_of_expiration?: string;
  expiration_date?: string;
  transactions?: {
    payments?: MercadoPagoOrderPayment[] | null;
  } | null;
  data?: {
    id?: string;
    external_reference?: string | null;
    status?: string;
    status_detail?: string;
    config?: {
      point?: {
        terminal_id?: string | null;
      } | null;
    } | null;
    transactions?: {
      payments?: MercadoPagoOrderPayment[] | null;
    } | null;
  } | null;
};

async function ensureValidPaymentContext({
  appointmentId,
  tenantId,
  amount,
}: {
  appointmentId: string;
  tenantId: string;
  amount: number;
}) {
  if (amount <= 0) {
    return fail(new AppError("Valor de pagamento inválido.", "VALIDATION_ERROR", 400));
  }
  if (amount < minimumTransactionAmount) {
    return fail(
      new AppError(
        "Valor mínimo para pagamento no Mercado Pago é R$ 1,00. Ajuste o valor para continuar.",
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
}

function extractOrder(payload: Record<string, unknown> | null) {
  if (!payload) return null;
  const direct = payload as MercadoPagoOrderResponse;
  if (direct?.id || direct?.transactions?.payments?.length) return direct;
  if (payload.data && typeof payload.data === "object") {
    const data = payload.data as MercadoPagoOrderResponse;
    return data;
  }
  return direct;
}

function resolveOrderPayment(order: MercadoPagoOrderResponse | null) {
  const orderId = order?.id ? String(order.id) : null;
  const externalReference =
    typeof order?.external_reference === "string"
      ? order.external_reference
      : typeof order?.data?.external_reference === "string"
        ? order.data.external_reference
        : null;
  const payments = order?.transactions?.payments ?? order?.data?.transactions?.payments ?? [];
  const firstPayment = payments?.[0] ?? null;
  const paymentId = firstPayment?.id ? String(firstPayment.id) : orderId;
  const providerStatus = firstPayment?.status ?? order?.status ?? order?.data?.status ?? "pending";
  const statusDetail =
    firstPayment?.status_detail ?? order?.status_detail ?? order?.data?.status_detail ?? null;
  const amount = parseNumericAmount(firstPayment?.amount ?? firstPayment?.paid_amount, 0);
  const pointTerminalId =
    (typeof order?.config?.point?.terminal_id === "string" && order.config.point.terminal_id.trim()) ||
    (typeof order?.data?.config?.point?.terminal_id === "string" && order.data.config.point.terminal_id.trim()) ||
    null;

  return {
    orderId,
    paymentId,
    externalReference,
    providerStatus,
    statusDetail,
    amount,
    pointTerminalId,
    paymentMethodId: firstPayment?.payment_method?.id ?? null,
    paymentTypeId: firstPayment?.payment_method?.type ?? null,
    installments:
      typeof firstPayment?.payment_method?.installments === "number"
        ? firstPayment.payment_method.installments
        : null,
    ticketUrl: firstPayment?.payment_method?.ticket_url ?? null,
    qrCode: firstPayment?.payment_method?.qr_code ?? null,
    qrCodeBase64: firstPayment?.payment_method?.qr_code_base64 ?? null,
    createdAt:
      parseIsoDate(firstPayment?.created_date) ??
      parseIsoDate(firstPayment?.date_created) ??
      parseIsoDate(order?.created_date) ??
      parseIsoDate(order?.date_created) ??
      new Date().toISOString(),
    expiresAt:
      parseIsoDate(firstPayment?.payment_method?.date_of_expiration) ??
      parseIsoDate(firstPayment?.payment_method?.expiration_date) ??
      parseIsoDate(firstPayment?.payment_method?.expiration_time) ??
      parseIsoDate(firstPayment?.date_of_expiration) ??
      parseIsoDate(firstPayment?.expiration_date) ??
      parseIsoDate(order?.date_of_expiration) ??
      parseIsoDate(order?.expiration_date) ??
      null,
  };
}

async function upsertAppointmentPayment(params: {
  appointmentId: string;
  tenantId: string;
  method: "pix" | "card";
  amount: number;
  status: InternalPaymentStatus;
  providerRef: string;
  providerOrderId: string | null;
  pointTerminalId?: string | null;
  cardMode?: string | null;
  paymentMethodId?: string | null;
  installments?: number | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  rawPayload?: Json | null;
}) {
  const supabase = createServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from("appointment_payments")
    .select(
      "provider_order_id, point_terminal_id, card_mode, payment_method_id, installments, card_last4, card_brand"
    )
    .eq("provider_ref", params.providerRef)
    .eq("tenant_id", params.tenantId)
    .maybeSingle();

  if (existingError) {
    return fail(new AppError("Não foi possível consultar o pagamento atual.", "SUPABASE_ERROR", 500, existingError));
  }

  const { error } = await supabase.from("appointment_payments").upsert(
    {
      appointment_id: params.appointmentId,
      tenant_id: params.tenantId,
      method: params.method,
      amount: params.amount,
      status: params.status,
      provider_ref: params.providerRef,
      provider_order_id: params.providerOrderId ?? existing?.provider_order_id ?? null,
      point_terminal_id: params.pointTerminalId ?? existing?.point_terminal_id ?? null,
      card_mode: params.cardMode ?? existing?.card_mode ?? null,
      paid_at: params.status === "paid" ? new Date().toISOString() : null,
      payment_method_id: params.paymentMethodId ?? existing?.payment_method_id ?? null,
      installments: params.installments ?? existing?.installments ?? null,
      card_last4: params.cardLast4 ?? existing?.card_last4 ?? null,
      card_brand: params.cardBrand ?? existing?.card_brand ?? null,
      raw_payload: params.rawPayload ?? null,
    },
    { onConflict: "provider_ref,tenant_id" }
  );

  if (error) {
    return fail(new AppError("Não foi possível registrar o pagamento.", "SUPABASE_ERROR", 500, error));
  }

  return ok(null);
}

export async function recalculateAppointmentPaymentStatus({
  appointmentId,
  tenantId,
}: {
  appointmentId: string;
  tenantId: string;
}) {
  const supabase = createServiceClient();
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id, tenant_id, status, payment_status, price, price_override")
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

  const { data: checkout, error: checkoutError } = await supabase
    .from("appointment_checkout")
    .select("total")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (checkoutError) {
    return fail(
      new AppError(
        "Não foi possível atualizar o status financeiro do agendamento.",
        "SUPABASE_ERROR",
        500,
        checkoutError
      )
    );
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

  const checkoutTotal =
    checkout && checkout.total !== null && checkout.total !== undefined
      ? Number(checkout.total)
      : null;
  const fallbackTotal = Number(appointment.price_override ?? appointment.price ?? 0);
  const total = Number.isFinite(checkoutTotal ?? Number.NaN) ? Number(checkoutTotal) : fallbackTotal;
  const paidTotal = (paidPayments ?? []).reduce((acc, item) => acc + Number(item.amount ?? 0), 0);
  const nextStatus = deriveAppointmentPaymentStatus({
    total,
    paidTotal,
    appointmentStatus: appointment.status ?? null,
    currentPaymentStatus: appointment.payment_status ?? null,
  });

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

  return ok({ nextStatus, paidTotal, total });
}

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

export async function getOrderById(orderId: string): Promise<ActionResult<PointOrderStatusResult>> {
  const tokenResult = resolveMercadoPagoAccessToken();
  if (!tokenResult.ok) return tokenResult;
  const accessToken = tokenResult.data;

  let response: Response;
  try {
    response = await fetch(`https://api.mercadopago.com/v1/orders/${orderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return fail(new AppError("Falha de rede ao consultar cobrança Point.", "UNKNOWN", 500, details));
  }

  const payloadText = await response.text();
  const payload = parseApiPayload(payloadText);
  if (!response.ok) {
    const payloadMessage = getPayloadMessage(payload, "Erro ao consultar status da cobrança Point.");
    return fail(new AppError(payloadMessage, "SUPABASE_ERROR", response.status, payload));
  }

  const order = extractOrder(payload);
  const orderData = resolveOrderPayment(order);
  if (!orderData.orderId || !orderData.paymentId) {
    return fail(new AppError("Resposta inválida ao consultar cobrança Point.", "SUPABASE_ERROR", 502, payload));
  }

  const paymentType = orderData.paymentTypeId?.toLowerCase() ?? "";
  const cardMode: PointCardMode | null = paymentType.includes("debit")
    ? "debit"
    : paymentType.includes("credit")
      ? "credit"
      : null;

  return ok({
    id: orderData.paymentId,
    order_id: orderData.orderId,
    status: orderData.providerStatus,
    internal_status: mapProviderStatusToInternal(orderData.providerStatus),
    status_detail: orderData.statusDetail,
    transaction_amount: parseNumericAmount(orderData.amount, 0),
    point_terminal_id: orderData.pointTerminalId,
    card_mode: cardMode,
    appointment_id: orderData.externalReference,
  });
}

export async function getPointOrderStatus({
  orderId,
  tenantId,
  expectedAppointmentId,
}: {
  orderId: string;
  tenantId: string;
  expectedAppointmentId?: string;
}): Promise<ActionResult<PointOrderStatusResult>> {
  const statusResult = await getOrderById(orderId);
  if (!statusResult.ok) return statusResult;

  const statusData = statusResult.data;
  const appointmentId = statusData.appointment_id;
  if (expectedAppointmentId && appointmentId && appointmentId !== expectedAppointmentId) {
    return fail(
      new AppError("A cobrança consultada pertence a outro atendimento.", "VALIDATION_ERROR", 409, {
        expectedAppointmentId,
        receivedAppointmentId: appointmentId,
        orderId,
      })
    );
  }

  if (appointmentId) {
    const upsertResult = await upsertAppointmentPayment({
      appointmentId,
      tenantId,
      method: "card",
      amount: statusData.transaction_amount,
      status: statusData.internal_status,
      providerRef: statusData.id,
      providerOrderId: statusData.order_id,
      pointTerminalId: statusData.point_terminal_id,
      cardMode: statusData.card_mode,
      rawPayload: null,
    });
    if (!upsertResult.ok) return upsertResult;

    if (statusData.internal_status === "paid") {
      const recalcResult = await recalculateAppointmentPaymentStatus({ appointmentId, tenantId });
      if (!recalcResult.ok) return recalcResult;
    }
  }

  return ok(statusData);
}

export async function getAppointmentPaymentStatusByMethod({
  appointmentId,
  tenantId,
  method,
  cardMode,
}: {
  appointmentId: string;
  tenantId: string;
  method: "card" | "pix";
  cardMode?: PointCardMode | null;
}): Promise<ActionResult<{ internal_status: InternalPaymentStatus }>> {
  const supabase = createServiceClient();
  const fetchPayments = async () => {
    let query = supabase
      .from("appointment_payments")
      .select("status, created_at, card_mode, provider_order_id, provider_ref")
      .eq("appointment_id", appointmentId)
      .eq("tenant_id", tenantId)
      .eq("method", method)
      .order("created_at", { ascending: false });

    if (cardMode) {
      query = query.eq("card_mode", cardMode);
    }

    return query;
  };

  const resolveInternalStatus = (
    payments:
      | {
          status: string | null;
          provider_order_id: string | null;
          provider_ref: string | null;
        }[]
      | null
      | undefined
  ): InternalPaymentStatus => {
    const statuses = (payments ?? [])
      .map((item) => (typeof item.status === "string" ? item.status : null))
      .filter((value): value is string => Boolean(value));

    if (statuses.includes("paid")) return "paid";
    if ((statuses[0] ?? null) === "failed") return "failed";
    return "pending";
  };

  const { data: payments, error } = await fetchPayments();
  if (error) {
    return fail(new AppError("Não foi possível consultar o status do pagamento.", "SUPABASE_ERROR", 500, error));
  }

  let internalStatus = resolveInternalStatus(payments);

  // Pix polling in the attendance screen should reflect successful payments even if the webhook
  // arrives late. We sync the latest pending order directly from Mercado Pago before responding.
  if (method === "pix" && internalStatus !== "paid") {
    const latestPayment = (payments ?? [])[0] ?? null;
    const providerOrderId =
      latestPayment && typeof latestPayment.provider_order_id === "string"
        ? latestPayment.provider_order_id.trim()
        : "";

    if (providerOrderId) {
      const statusResult = await getOrderById(providerOrderId);
      if (!statusResult.ok) return statusResult;

      const statusData = statusResult.data;
      const upsertResult = await upsertAppointmentPayment({
        appointmentId,
        tenantId,
        method: "pix",
        amount: statusData.transaction_amount,
        status: statusData.internal_status,
        providerRef: statusData.id,
        providerOrderId: statusData.order_id,
        rawPayload: null,
      });
      if (!upsertResult.ok) return upsertResult;

      if (statusData.internal_status === "paid") {
        const recalcResult = await recalculateAppointmentPaymentStatus({ appointmentId, tenantId });
        if (!recalcResult.ok) return recalcResult;
      }

      const { data: refreshedPayments, error: refreshedError } = await fetchPayments();
      if (refreshedError) {
        return fail(
          new AppError(
            "Não foi possível atualizar o status do pagamento.",
            "SUPABASE_ERROR",
            500,
            refreshedError
          )
        );
      }
      internalStatus = resolveInternalStatus(refreshedPayments);
    }
  }

  return ok({ internal_status: internalStatus });
}
