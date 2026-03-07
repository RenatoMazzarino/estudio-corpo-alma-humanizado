"use server";

import { AppError } from "../../../src/shared/errors/AppError";
import { fail, type ActionResult } from "../../../src/shared/errors/result";
import {
  createOnlineCardOrderForAppointment,
  createPixOrderForAppointment,
  getAppointmentPaymentStatusByMethod,
  type CardOrderResult,
  type PixOrderResult,
} from "../../../src/modules/payments/mercadopago-orders";
import { getPublicPaymentLinkContext } from "../../../src/modules/payments/public-payment-link";

type PaymentStatusResult = {
  internal_status: "paid" | "pending" | "failed";
};

async function resolvePublicPaymentContext(publicId: string) {
  const context = await getPublicPaymentLinkContext(publicId);
  if (!context) {
    return fail(new AppError("Link de pagamento não encontrado.", "NOT_FOUND", 404));
  }

  if (context.remainingAmount <= 0) {
    return fail(new AppError("Este agendamento já está quitado.", "VALIDATION_ERROR", 400));
  }

  if (!context.payerPhone.trim()) {
    return fail(
      new AppError(
        "Telefone do cliente não encontrado para criar a cobrança online.",
        "VALIDATION_ERROR",
        400
      )
    );
  }

  return { ok: true as const, data: context };
}

export async function createPaymentLinkPix({
  publicId,
  attempt,
}: {
  publicId: string;
  attempt?: number;
}): Promise<ActionResult<PixOrderResult>> {
  const contextResult = await resolvePublicPaymentContext(publicId);
  if (!contextResult.ok) return contextResult;

  const context = contextResult.data;
  return createPixOrderForAppointment({
    appointmentId: context.appointmentId,
    tenantId: context.tenantId,
    amount: context.remainingAmount,
    payerEmail: context.payerEmail,
    payerName: context.clientName,
    payerPhone: context.payerPhone,
    attempt,
  });
}

export async function createPaymentLinkCard({
  publicId,
  token,
  paymentMethodId,
  installments,
  identificationType,
  identificationNumber,
}: {
  publicId: string;
  token: string;
  paymentMethodId: string;
  installments: number;
  identificationType?: string;
  identificationNumber?: string;
}): Promise<ActionResult<CardOrderResult>> {
  const contextResult = await resolvePublicPaymentContext(publicId);
  if (!contextResult.ok) return contextResult;

  const context = contextResult.data;
  return createOnlineCardOrderForAppointment({
    appointmentId: context.appointmentId,
    tenantId: context.tenantId,
    amount: context.remainingAmount,
    token,
    paymentMethodId,
    installments,
    payerEmail: context.payerEmail,
    payerName: context.clientName,
    payerPhone: context.payerPhone,
    identificationType,
    identificationNumber,
  });
}

export async function getPaymentLinkPixStatus({
  publicId,
}: {
  publicId: string;
}): Promise<ActionResult<PaymentStatusResult>> {
  const context = await getPublicPaymentLinkContext(publicId);
  if (!context) {
    return fail(new AppError("Link de pagamento não encontrado.", "NOT_FOUND", 404));
  }

  return getAppointmentPaymentStatusByMethod({
    appointmentId: context.appointmentId,
    tenantId: context.tenantId,
    method: "pix",
  });
}

export async function getPaymentLinkCardStatus({
  publicId,
}: {
  publicId: string;
}): Promise<ActionResult<PaymentStatusResult>> {
  const context = await getPublicPaymentLinkContext(publicId);
  if (!context) {
    return fail(new AppError("Link de pagamento não encontrado.", "NOT_FOUND", 404));
  }

  return getAppointmentPaymentStatusByMethod({
    appointmentId: context.appointmentId,
    tenantId: context.tenantId,
    method: "card",
  });
}
