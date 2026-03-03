import { parseMercadoPagoResourceId, parseNumericAmount, type NotificationType } from "./mercadopago-webhook.helpers";

type MercadoPagoOrderPaymentMethod = {
  id?: string;
  type?: string;
  installments?: number;
};

type MercadoPagoOrderPayment = {
  id?: string | number;
  amount?: string | number;
  status?: string;
  status_detail?: string;
  payment_method?: MercadoPagoOrderPaymentMethod | null;
};

type MercadoPagoOrder = {
  id?: string;
  status?: string;
  status_detail?: string;
  external_reference?: string | null;
  transactions?: {
    payments?: MercadoPagoOrderPayment[] | null;
  } | null;
  config?: {
    point?: {
      terminal_id?: string;
    } | null;
  } | null;
};

type MercadoPagoPayment = {
  id: string | number;
  status?: string;
  status_detail?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  installments?: number;
  order?: {
    id?: string | number;
    type?: string;
  };
  card?: {
    last_four_digits?: string;
    brand?: string;
  };
  transaction_amount?: number;
  date_approved?: string | null;
  external_reference?: string | null;
};

export type ResolvedWebhookPaymentData = {
  appointmentId: string | null;
  orderIdFromPayment: string | null;
  providerRef: string | null;
  providerStatus: string;
  providerStatusDetail: string | null;
  paymentMethodId: string | null;
  paymentTypeId: string | null;
  installments: number | null;
  cardLast4: string | null;
  cardBrand: string | null;
  approvedAt: string | null;
  transactionAmount: number;
  pointTerminalId: string | null;
};

export type ResolveWebhookPaymentResult =
  | { kind: "skip"; reason: string }
  | { kind: "ok"; data: ResolvedWebhookPaymentData };

const fetchMercadoPagoJson = async <T>(
  path: string,
  accessToken: string
): Promise<{ ok: true; data: T } | { ok: false }> => {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) return { ok: false };
  const data = (await response.json()) as T;
  return { ok: true, data };
};

export const resolveWebhookPaymentData = async (params: {
  accessToken: string;
  notificationType: NotificationType;
  resourceId: string;
}): Promise<ResolveWebhookPaymentResult> => {
  const { accessToken, notificationType, resourceId } = params;
  let providerRef: string | null = null;
  let providerStatus = "pending";
  let providerStatusDetail: string | null = null;
  let paymentMethodId: string | null = null;
  let paymentTypeId: string | null = null;
  let installments: number | null = null;
  let cardLast4: string | null = null;
  let cardBrand: string | null = null;
  let approvedAt: string | null = null;
  let transactionAmount = 0;
  let appointmentId: string | null = null;
  let orderIdFromPayment: string | null = null;
  let pointTerminalId: string | null = null;

  const hydrateFromPayment = (payment: MercadoPagoPayment) => {
    providerRef = String(payment.id);
    providerStatus = payment.status ?? providerStatus;
    providerStatusDetail =
      typeof payment.status_detail === "string" ? payment.status_detail : providerStatusDetail;
    paymentMethodId =
      typeof payment.payment_method_id === "string" ? payment.payment_method_id : paymentMethodId;
    paymentTypeId = typeof payment.payment_type_id === "string" ? payment.payment_type_id : paymentTypeId;
    installments = typeof payment.installments === "number" ? payment.installments : installments;
    cardLast4 = payment.card?.last_four_digits ?? cardLast4;
    cardBrand = payment.card?.brand ?? cardBrand;
    approvedAt = payment.date_approved ?? approvedAt;
    transactionAmount = parseNumericAmount(payment.transaction_amount, transactionAmount);
    appointmentId = payment.external_reference ?? appointmentId;
    orderIdFromPayment = payment.order?.id ? String(payment.order.id) : orderIdFromPayment;
  };

  if (notificationType === "order") {
    const orderLookup = await fetchMercadoPagoJson<MercadoPagoOrder>(`/v1/orders/${resourceId}`, accessToken);
    if (!orderLookup.ok) return { kind: "skip", reason: "order_lookup_failed" };

    const order = orderLookup.data;
    appointmentId = typeof order.external_reference === "string" ? order.external_reference : null;
    pointTerminalId = typeof order.config?.point?.terminal_id === "string" ? order.config.point.terminal_id : null;
    const firstPayment = order.transactions?.payments?.[0] ?? null;
    if (!firstPayment) return { kind: "skip", reason: "order_without_payment" };
    if (!firstPayment.id) return { kind: "skip", reason: "order_without_payment_id" };

    providerRef = String(firstPayment.id);
    providerStatus = firstPayment.status ?? order.status ?? "pending";
    providerStatusDetail = firstPayment.status_detail ?? order.status_detail ?? null;
    paymentMethodId = firstPayment.payment_method?.id ?? null;
    paymentTypeId = firstPayment.payment_method?.type ?? null;
    installments =
      typeof firstPayment.payment_method?.installments === "number"
        ? firstPayment.payment_method.installments
        : null;
    transactionAmount = parseNumericAmount(firstPayment.amount, 0);

    const firstPaymentId = parseMercadoPagoResourceId(firstPayment.id);
    if (!firstPaymentId) return { kind: "skip", reason: "order_with_invalid_payment_id" };

    const paymentLookup = await fetchMercadoPagoJson<MercadoPagoPayment>(
      `/v1/payments/${firstPaymentId}`,
      accessToken
    );
    if (paymentLookup.ok) hydrateFromPayment(paymentLookup.data);
  } else {
    const paymentLookup = await fetchMercadoPagoJson<MercadoPagoPayment>(
      `/v1/payments/${resourceId}`,
      accessToken
    );
    if (!paymentLookup.ok) return { kind: "skip", reason: "payment_lookup_failed" };
    hydrateFromPayment(paymentLookup.data);
  }

  if (!providerRef) return { kind: "skip", reason: "missing_provider_ref" };

  if (!appointmentId && orderIdFromPayment) {
    const orderLookup = await fetchMercadoPagoJson<MercadoPagoOrder>(
      `/v1/orders/${orderIdFromPayment}`,
      accessToken
    );
    if (orderLookup.ok) {
      const order = orderLookup.data;
      if (typeof order.external_reference === "string" && order.external_reference.length > 0) {
        appointmentId = order.external_reference;
      }
    }
  }

  return {
    kind: "ok",
    data: {
      appointmentId,
      orderIdFromPayment,
      providerRef,
      providerStatus,
      providerStatusDetail,
      paymentMethodId,
      paymentTypeId,
      installments,
      cardLast4,
      cardBrand,
      approvedAt,
      transactionAmount,
      pointTerminalId,
    },
  };
};
