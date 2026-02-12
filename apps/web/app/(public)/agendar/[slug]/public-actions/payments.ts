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
}

interface CardPaymentResult {
  id: string;
  status: string;
  internal_status: "paid" | "pending" | "failed";
  status_detail: string | null;
  transaction_amount: number;
}

type InternalPaymentStatus = "paid" | "pending" | "failed";

const mapProviderStatusToInternal = (providerStatus: string | null | undefined): InternalPaymentStatus => {
  const normalized = (providerStatus ?? "").toLowerCase();
  if (normalized === "approved") return "paid";
  if (normalized === "rejected" || normalized === "cancelled" || normalized === "charged_back") {
    return "failed";
  }
  return "pending";
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
  description,
  token,
  paymentMethodId,
  issuerId,
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
  description: string;
  token: string;
  paymentMethodId: string;
  issuerId: string;
  installments: number;
  payerEmail: string;
  payerName: string;
  payerPhone: string;
  identificationType?: string;
  identificationNumber?: string;
}): Promise<ActionResult<CardPaymentResult>> {
  const contextResult = await ensureValidPaymentContext({ appointmentId, tenantId, amount });
  if (!contextResult.ok) return contextResult;

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return fail(
      new AppError(
        "MERCADOPAGO_ACCESS_TOKEN ausente: configure a chave no ambiente.",
        "CONFIG_ERROR",
        500
      )
    );
  }

  const { firstName, lastName } = splitName(payerName);
  const phoneDigits = normalizePhoneValue(payerPhone);

  const payer: Record<string, unknown> = {
    email: payerEmail || buildPayerEmail(phoneDigits),
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

  let response: Response;
  try {
    response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({
        transaction_amount: Number(amount.toFixed(2)),
        token,
        description,
        installments,
        payment_method_id: paymentMethodId,
        ...(issuerId ? { issuer_id: issuerId } : {}),
        payer,
        external_reference: appointmentId,
        ...(process.env.MERCADOPAGO_WEBHOOK_URL
          ? { notification_url: process.env.MERCADOPAGO_WEBHOOK_URL }
          : {}),
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
  let payload: Record<string, unknown> | null = null;
  if (payloadText) {
    try {
      payload = JSON.parse(payloadText) as Record<string, unknown>;
    } catch {
      payload = { message: payloadText };
    }
  }

  const payloadMessage =
    payload && typeof payload.message === "string"
      ? payload.message
      : "Erro ao processar pagamento com cartão.";

  if (!response.ok) {
    return fail(new AppError(payloadMessage, "SUPABASE_ERROR", response.status, payload));
  }

  if (!payload || typeof payload.id === "undefined") {
    return fail(
      new AppError(
        "Resposta inválida do Mercado Pago ao processar cartão.",
        "SUPABASE_ERROR",
        502,
        payload
      )
    );
  }

  const status = typeof payload.status === "string" ? payload.status : "pending";
  const internalStatus = mapProviderStatusToInternal(status);
  const statusDetail =
    payload && typeof payload.status_detail === "string" ? payload.status_detail : null;
  const transactionAmount =
    typeof payload.transaction_amount === "number" ? payload.transaction_amount : amount;
  const paymentMethod =
    payload && typeof payload.payment_method_id === "string" ? payload.payment_method_id : null;
  const installmentsValue =
    payload && typeof payload.installments === "number" ? payload.installments : installments || null;
  const card = payload?.card as { last_four_digits?: string; brand?: string } | undefined;
  const cardLast4 = typeof card?.last_four_digits === "string" ? card.last_four_digits : null;
  const cardBrand = typeof card?.brand === "string" ? card.brand : null;

  const result: CardPaymentResult = {
    id: String(payload.id),
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
  description,
  payerName,
  payerPhone,
}: {
  appointmentId: string;
  tenantId: string;
  amount: number;
  description: string;
  payerName: string;
  payerPhone: string;
}): Promise<ActionResult<PixPaymentResult>> {
  const contextResult = await ensureValidPaymentContext({ appointmentId, tenantId, amount });
  if (!contextResult.ok) return contextResult;

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return fail(
      new AppError(
        "MERCADOPAGO_ACCESS_TOKEN ausente: configure a chave no ambiente.",
        "CONFIG_ERROR",
        500
      )
    );
  }

  const { firstName, lastName } = splitName(payerName);
  const phoneDigits = normalizePhoneValue(payerPhone);
  const payer = {
    email: buildPayerEmail(phoneDigits),
    first_name: firstName,
    last_name: lastName,
    phone: splitPhone(phoneDigits),
  };

  const idempotencyKey = buildIdempotencyKey([
    "pix",
    appointmentId,
    Number(amount.toFixed(2)).toFixed(2),
  ]);

  let response: Response;
  try {
    response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({
        transaction_amount: Number(amount.toFixed(2)),
        description,
        payment_method_id: "pix",
        payer,
        external_reference: appointmentId,
        ...(process.env.MERCADOPAGO_WEBHOOK_URL
          ? { notification_url: process.env.MERCADOPAGO_WEBHOOK_URL }
          : {}),
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
  let payload: Record<string, unknown> | null = null;
  if (payloadText) {
    try {
      payload = JSON.parse(payloadText) as Record<string, unknown>;
    } catch {
      payload = { message: payloadText };
    }
  }

  const payloadMessage =
    payload && typeof payload.message === "string" ? payload.message : "Erro ao criar pagamento Pix.";

  if (!response.ok) {
    return fail(new AppError(payloadMessage, "SUPABASE_ERROR", response.status, payload));
  }

  if (!payload || typeof payload.id === "undefined") {
    return fail(
      new AppError(
        "Resposta inválida do Mercado Pago ao criar Pix.",
        "SUPABASE_ERROR",
        502,
        payload
      )
    );
  }

  const pointOfInteraction = payload.point_of_interaction as
    | { transaction_data?: Record<string, unknown> }
    | undefined;
  const transactionData = pointOfInteraction?.transaction_data;
  const status = typeof payload.status === "string" ? payload.status : "pending";
  const internalStatus = mapProviderStatusToInternal(status);
  const ticketUrl =
    transactionData && typeof transactionData.ticket_url === "string"
      ? transactionData.ticket_url
      : null;
  const qrCode =
    transactionData && typeof transactionData.qr_code === "string" ? transactionData.qr_code : null;
  const qrCodeBase64 =
    transactionData && typeof transactionData.qr_code_base64 === "string"
      ? transactionData.qr_code_base64
      : null;
  const transactionAmount =
    typeof payload.transaction_amount === "number" ? payload.transaction_amount : amount;

  const result: PixPaymentResult = {
    id: String(payload.id),
    status,
    ticket_url: ticketUrl,
    qr_code: qrCode,
    qr_code_base64: qrCodeBase64,
    transaction_amount: transactionAmount,
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
