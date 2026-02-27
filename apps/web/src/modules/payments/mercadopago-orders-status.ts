import { createServiceClient } from "../../../lib/supabase/service";
import { AppError } from "../../shared/errors/AppError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import {
  getPayloadMessage,
  mapProviderStatusToInternal,
  parseApiPayload,
  parseNumericAmount,
} from "./mercadopago-orders.helpers";
import { resolveMercadoPagoAccessToken } from "./mercadopago-access-token";
import { extractOrder, resolveOrderPayment, upsertAppointmentPayment } from "./mercadopago-orders-core";
import { recalculateAppointmentPaymentStatus } from "./mercadopago-orders-financial";
import type { InternalPaymentStatus, PointCardMode, PointOrderStatusResult } from "./mercadopago-orders.types";

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
