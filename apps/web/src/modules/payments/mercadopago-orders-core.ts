import { createServiceClient } from "../../../lib/supabase/service";
import type { Json } from "../../../lib/supabase/types";
import { AppError } from "../../shared/errors/AppError";
import { fail, ok } from "../../shared/errors/result";
import {
  minimumTransactionAmount,
  parseIsoDate,
  parseNumericAmount,
} from "./mercadopago-orders.helpers";

export type InternalPaymentStatus = "paid" | "pending" | "failed";

export type MercadoPagoOrderPaymentMethod = {
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

export type MercadoPagoOrderPayment = {
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

export type MercadoPagoOrderResponse = {
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

export async function ensureValidPaymentContext({
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

export function extractOrder(payload: Record<string, unknown> | null) {
  if (!payload) return null;
  const direct = payload as MercadoPagoOrderResponse;
  if (direct?.id || direct?.transactions?.payments?.length) return direct;
  if (payload.data && typeof payload.data === "object") {
    const data = payload.data as MercadoPagoOrderResponse;
    return data;
  }
  return direct;
}

export function resolveOrderPayment(order: MercadoPagoOrderResponse | null) {
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

export async function upsertAppointmentPayment(params: {
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
