"use server";

import type { ActionResult } from "../../../../../src/shared/errors/result";
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
  return createOnlineCardOrderForAppointment({
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
  return createPixOrderForAppointment({
    appointmentId,
    tenantId,
    amount,
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
