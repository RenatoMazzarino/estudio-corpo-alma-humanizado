"use server";

import { createServiceClient } from "../../../../../lib/supabase/service";
import type { ActionResult } from "../../../../../src/shared/errors/result";
import { AppError } from "../../../../../src/shared/errors/AppError";
import { fail } from "../../../../../src/shared/errors/result";
import {
  createOnlineCardOrderForAppointment,
  createPixOrderForAppointment,
  getAppointmentPaymentStatusByMethod,
  type CardOrderResult,
  type PixOrderResult,
} from "../../../../../src/modules/payments/mercadopago-orders";

type CardPaymentResult = CardOrderResult;
type PixPaymentResult = PixOrderResult;

type PaymentStatusResult = {
  internal_status: "paid" | "pending" | "failed";
};

const DEFAULT_SIGNAL_PERCENTAGE = 30;

async function resolveOnlineSignalAmount({
  appointmentId,
  tenantId,
  fallbackAmount,
}: {
  appointmentId: string;
  tenantId: string;
  fallbackAmount: number;
}) {
  const supabase = createServiceClient();
  const [{ data: appointment }, { data: checkout }, { data: settings }] = await Promise.all([
    supabase
      .from("appointments")
      .select("price, price_override")
      .eq("id", appointmentId)
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("appointment_checkout")
      .select("total")
      .eq("appointment_id", appointmentId)
      .maybeSingle(),
    supabase
      .from("settings")
      .select("signal_percentage")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
  ]);

  const checkoutTotal = Number(checkout?.total ?? Number.NaN);
  const baseTotal = Number(appointment?.price_override ?? appointment?.price ?? Number.NaN);
  const total = Number.isFinite(checkoutTotal)
    ? checkoutTotal
    : Number.isFinite(baseTotal)
      ? baseTotal
      : fallbackAmount;

  const configuredPercentage = Number(settings?.signal_percentage ?? Number.NaN);
  const signalPercentage =
    Number.isFinite(configuredPercentage) && configuredPercentage > 0
      ? Math.min(configuredPercentage, 100)
      : DEFAULT_SIGNAL_PERCENTAGE;

  const computedSignal = Number(((total * signalPercentage) / 100).toFixed(2));
  const normalizedSignal = Number.isFinite(computedSignal) ? computedSignal : fallbackAmount;
  const roundedSignal = Number(normalizedSignal.toFixed(2));
  return Number.isFinite(roundedSignal) ? roundedSignal : 0;
}

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
  const resolvedAmount = await resolveOnlineSignalAmount({
    appointmentId,
    tenantId,
    fallbackAmount: amount,
  });
  if (!Number.isFinite(resolvedAmount) || resolvedAmount <= 0) {
    return fail(new AppError("Valor de sinal inválido para pagamento online.", "VALIDATION_ERROR", 400));
  }

  return createOnlineCardOrderForAppointment({
    appointmentId,
    tenantId,
    amount: resolvedAmount,
    token,
    paymentMethodId,
    installments,
    payerEmail,
    payerName,
    payerPhone,
    identificationType,
    identificationNumber,
  });
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
  const resolvedAmount = await resolveOnlineSignalAmount({
    appointmentId,
    tenantId,
    fallbackAmount: amount,
  });
  if (!Number.isFinite(resolvedAmount) || resolvedAmount <= 0) {
    return fail(new AppError("Valor de sinal inválido para pagamento online.", "VALIDATION_ERROR", 400));
  }

  return createPixOrderForAppointment({
    appointmentId,
    tenantId,
    amount: resolvedAmount,
    payerEmail,
    payerName,
    payerPhone,
    attempt,
  });
}

export async function getCardPaymentStatus({
  appointmentId,
  tenantId,
}: {
  appointmentId: string;
  tenantId: string;
}): Promise<ActionResult<PaymentStatusResult>> {
  return getAppointmentPaymentStatusByMethod({
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
  return getAppointmentPaymentStatusByMethod({
    appointmentId,
    tenantId,
    method: "pix",
  });
}
