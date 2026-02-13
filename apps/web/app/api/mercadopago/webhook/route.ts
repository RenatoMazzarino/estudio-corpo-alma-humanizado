import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../lib/supabase/service";
import type { Json } from "../../../../lib/supabase/types";

type SignatureParts = {
  ts?: string;
  v1?: string;
};

type NotificationType = "payment" | "order" | "unknown";

type MercadoPagoOrderPaymentMethod = {
  id?: string;
  type?: string;
  installments?: number;
  ticket_url?: string;
  qr_code?: string;
  qr_code_base64?: string;
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

const logWebhookError = (message: string, details?: unknown) => {
  console.error("[mercadopago-webhook]", message, details ?? {});
};

const parseSignatureHeader = (value: string | null): SignatureParts => {
  if (!value) return {};
  return value.split(",").reduce<SignatureParts>((acc, part) => {
    const [rawKey, rawValue] = part.split("=", 2);
    if (!rawKey || !rawValue) return acc;
    const key = rawKey.trim();
    const val = rawValue.trim();
    if (key === "ts") acc.ts = val;
    if (key === "v1") acc.v1 = val;
    return acc;
  }, {});
};

const normalizeMercadoPagoToken = (value: string | undefined | null) => {
  if (!value) return "";
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  return trimmed.replace(/^Bearer\s+/i, "");
};

const buildSignatureManifest = (dataId: string, requestId: string, ts: string) => {
  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (requestId) parts.push(`request-id:${requestId}`);
  if (ts) parts.push(`ts:${ts}`);
  return parts.length ? `${parts.join(";")};` : "";
};

const safeEqual = (left: string, right: string) => {
  const normalizedLeft = left.trim().toLowerCase();
  const normalizedRight = right.trim().toLowerCase();
  const leftBuffer = Buffer.from(normalizedLeft, "utf8");
  const rightBuffer = Buffer.from(normalizedRight, "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifyWebhookSignature = (request: Request, secret: string) => {
  const signature = parseSignatureHeader(request.headers.get("x-signature"));
  const requestId = request.headers.get("x-request-id") ?? "";
  const url = new URL(request.url);
  const rawDataId =
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    "";
  const dataId = rawDataId ? rawDataId.toLowerCase() : "";

  if (!signature.ts || !signature.v1) {
    return { valid: false as const, reason: "missing_signature_fields" as const };
  }
  const manifests = new Set<string>();
  const rawManifest = buildSignatureManifest(rawDataId, requestId, signature.ts);
  const normalizedManifest = buildSignatureManifest(dataId, requestId, signature.ts);
  const normalizedWithoutRequestId = buildSignatureManifest(dataId, "", signature.ts);

  if (rawManifest) manifests.add(rawManifest);
  if (normalizedManifest) manifests.add(normalizedManifest);
  if (normalizedWithoutRequestId) manifests.add(normalizedWithoutRequestId);
  if (!manifests.size) {
    return { valid: false as const, reason: "missing_manifest" as const };
  }

  const normalizedSecret = secret.trim().replace(/^["']|["']$/g, "");
  for (const manifest of manifests) {
    const expected = crypto.createHmac("sha256", normalizedSecret).update(manifest).digest("hex");
    if (safeEqual(expected, signature.v1)) {
      return { valid: true as const, reason: "ok" as const };
    }
  }

  return { valid: false as const, reason: "signature_mismatch" as const };
};

const resolveNotificationType = (
  request: Request,
  body: Record<string, unknown> | null
): NotificationType => {
  const url = new URL(request.url);
  const urlType = url.searchParams.get("type") ?? url.searchParams.get("topic");
  const bodyType =
    typeof body?.type === "string"
      ? body.type
      : typeof body?.topic === "string"
        ? body.topic
        : null;
  const rawType = (urlType ?? bodyType ?? "").toLowerCase();
  if (rawType === "payment") return "payment";
  if (rawType === "order") return "order";
  return "unknown";
};

const mapProviderStatusToInternal = (providerStatus: string | null | undefined) => {
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

const parseNumericAmount = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

function getPaymentId(request: Request, body: Record<string, unknown> | null) {
  const url = new URL(request.url);
  const search = url.searchParams;

  const data = body?.data as { id?: string | number } | undefined;
  const bodyId = body?.id as string | number | undefined;

  return (
    data?.id?.toString() ||
    bodyId?.toString() ||
    search.get("data.id") ||
    search.get("id") ||
    null
  );
}

export async function POST(request: Request) {
  const accessToken = normalizeMercadoPagoToken(process.env.MERCADOPAGO_ACCESS_TOKEN);
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "Missing Mercado Pago token" }, { status: 500 });
  }
  if (!webhookSecret) {
    return NextResponse.json({ ok: false, error: "Missing Mercado Pago webhook secret" }, { status: 500 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const signatureCheck = verifyWebhookSignature(request, webhookSecret);
  if (!signatureCheck.valid) {
    const isLiveNotification = body?.live_mode === true;
    const isPreviewEnvironment = process.env.VERCEL_ENV === "preview";
    if (isPreviewEnvironment && !isLiveNotification) {
      console.warn("[mercadopago-webhook] bypassed invalid signature for test/sandbox notification", {
        reason: signatureCheck.reason,
        env: process.env.VERCEL_ENV ?? "unknown",
        liveMode: body?.live_mode ?? null,
      });
    } else {
      console.warn("[mercadopago-webhook] invalid signature", {
        reason: signatureCheck.reason,
        requestId: request.headers.get("x-request-id") ?? null,
        path: new URL(request.url).pathname,
        queryDataId: new URL(request.url).searchParams.get("data.id"),
        hasSignature: Boolean(request.headers.get("x-signature")),
      });
      return NextResponse.json(
        { ok: false, error: "Invalid webhook signature", reason: signatureCheck.reason },
        { status: 401 }
      );
    }
  }
  const notificationType = resolveNotificationType(request, body);
  const resourceId = getPaymentId(request, body);

  if (!resourceId) {
    return NextResponse.json({ ok: true });
  }

  if (notificationType === "unknown") {
    return NextResponse.json({ ok: true, skipped: "unsupported_notification_type" });
  }

  let providerRef: string | null = null;
  let providerStatus: string = "pending";
  let providerStatusDetail: string | null = null;
  let paymentMethodId: string | null = null;
  let paymentTypeId: string | null = null;
  let installments: number | null = null;
  let cardLast4: string | null = null;
  let cardBrand: string | null = null;
  let approvedAt: string | null = null;
  let transactionAmount: number = 0;
  let appointmentId: string | null = null;
  let orderIdFromPayment: string | null = null;

  const hydrateFromPayment = (payment: MercadoPagoPayment) => {
    providerRef = String(payment.id);
    providerStatus = payment.status ?? providerStatus;
    providerStatusDetail =
      typeof payment.status_detail === "string" ? payment.status_detail : providerStatusDetail;
    paymentMethodId =
      typeof payment.payment_method_id === "string" ? payment.payment_method_id : paymentMethodId;
    paymentTypeId =
      typeof payment.payment_type_id === "string" ? payment.payment_type_id : paymentTypeId;
    installments = typeof payment.installments === "number" ? payment.installments : installments;
    cardLast4 = payment.card?.last_four_digits ?? cardLast4;
    cardBrand = payment.card?.brand ?? cardBrand;
    approvedAt = payment.date_approved ?? approvedAt;
    transactionAmount = parseNumericAmount(payment.transaction_amount, transactionAmount);
    appointmentId = payment.external_reference ?? appointmentId;
    orderIdFromPayment = payment.order?.id ? String(payment.order.id) : orderIdFromPayment;
  };

  if (notificationType === "order") {
    const orderResponse = await fetch(`https://api.mercadopago.com/v1/orders/${resourceId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!orderResponse.ok) {
      return NextResponse.json({ ok: true, skipped: "order_lookup_failed" });
    }

    const order = (await orderResponse.json()) as MercadoPagoOrder;
    appointmentId = typeof order.external_reference === "string" ? order.external_reference : null;
    const firstPayment = order.transactions?.payments?.[0] ?? null;
    if (!firstPayment) {
      return NextResponse.json({ ok: true, skipped: "order_without_payment" });
    }
    if (!firstPayment.id) {
      return NextResponse.json({ ok: true, skipped: "order_without_payment_id" });
    }

    providerRef = String(firstPayment.id);
    providerStatus = firstPayment.status ?? order.status ?? "pending";
    providerStatusDetail =
      firstPayment.status_detail ?? order.status_detail ?? null;
    paymentMethodId = firstPayment.payment_method?.id ?? null;
    paymentTypeId = firstPayment.payment_method?.type ?? null;
    installments =
      typeof firstPayment.payment_method?.installments === "number"
        ? firstPayment.payment_method.installments
        : null;
    transactionAmount = parseNumericAmount(firstPayment.amount, 0);

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${firstPayment.id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    if (paymentResponse.ok) {
      const payment = (await paymentResponse.json()) as MercadoPagoPayment;
      hydrateFromPayment(payment);
    }
  } else {
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!paymentResponse.ok) {
      return NextResponse.json({ ok: true, skipped: "payment_lookup_failed" });
    }

    const payment = (await paymentResponse.json()) as MercadoPagoPayment;
    hydrateFromPayment(payment);
  }

  if (!providerRef) {
    return NextResponse.json({ ok: true, skipped: "missing_provider_ref" });
  }

  if (!appointmentId && orderIdFromPayment) {
    const orderLookup = await fetch(`https://api.mercadopago.com/v1/orders/${orderIdFromPayment}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    if (orderLookup.ok) {
      const order = (await orderLookup.json()) as MercadoPagoOrder;
      if (typeof order.external_reference === "string" && order.external_reference.length > 0) {
        appointmentId = order.external_reference;
      }
    }
  }

  const normalizedPaymentPayload = {
    source: notificationType,
    resource_id: resourceId,
    provider_ref: providerRef,
    status: providerStatus,
    status_detail: providerStatusDetail,
    payment_method_id: paymentMethodId,
    payment_type_id: paymentTypeId,
    installments,
    transaction_amount: transactionAmount || null,
    approved_at: approvedAt,
    card_last4: cardLast4,
    card_brand: cardBrand,
  };

  const status = mapProviderStatusToInternal(providerStatus);
  const method = paymentMethodId === "pix" || paymentTypeId === "bank_transfer" ? "pix" : "card";

  const supabase = createServiceClient();

  const { data: existing, error: existingError } = await supabase
    .from("appointment_payments")
    .select("appointment_id, tenant_id, amount")
    .eq("provider_ref", providerRef)
    .maybeSingle();
  if (existingError) {
    logWebhookError("failed to read existing payment", {
      error: existingError,
      resourceId,
      providerRef,
    });
    return NextResponse.json({ ok: false, error: "Failed to read existing payment" }, { status: 500 });
  }

  const resolvedAppointmentId = existing?.appointment_id ?? appointmentId;
  const amount =
    transactionAmount > 0 ? transactionAmount : Number(existing?.amount ?? 0);

  let appointment:
    | { id: string; tenant_id: string; price: number | null; price_override: number | null }
    | null = null;

  if (resolvedAppointmentId) {
    const { data } = await supabase
      .from("appointments")
      .select("id, tenant_id, price, price_override")
      .eq("id", resolvedAppointmentId)
      .maybeSingle();
    if (data) appointment = data;
  }

  const resolvedTenantId = appointment?.tenant_id ?? existing?.tenant_id ?? null;

  if (resolvedAppointmentId && resolvedTenantId) {
    const { error: paymentUpsertError } = await supabase.from("appointment_payments").upsert(
      {
        appointment_id: resolvedAppointmentId,
        tenant_id: resolvedTenantId,
        method,
        amount,
        status,
        provider_ref: providerRef,
        paid_at: status === "paid" ? approvedAt ?? new Date().toISOString() : null,
        payment_method_id: paymentMethodId,
        installments,
        card_last4: cardLast4,
        card_brand: cardBrand,
        raw_payload: normalizedPaymentPayload as Json,
      },
      { onConflict: "provider_ref,tenant_id" }
    );
    if (paymentUpsertError) {
      logWebhookError("failed to upsert payment", {
        error: paymentUpsertError,
        resourceId,
        providerRef,
        resolvedAppointmentId,
        resolvedTenantId,
      });
      return NextResponse.json({ ok: false, error: "Failed to upsert payment" }, { status: 500 });
    }
  } else {
    logWebhookError("skipped payment upsert because appointment mapping was not resolved", {
      notificationType,
      resourceId,
      providerRef,
      appointmentId,
      orderIdFromPayment,
      existingAppointmentId: existing?.appointment_id ?? null,
      existingTenantId: existing?.tenant_id ?? null,
    });
  }

  if (appointment) {
    const total = appointment.price_override ?? appointment.price ?? 0;
    const { data: paidPayments, error: paidPaymentsError } = await supabase
      .from("appointment_payments")
      .select("amount")
      .eq("tenant_id", appointment.tenant_id)
      .eq("appointment_id", appointment.id)
      .eq("status", "paid");
    if (paidPaymentsError) {
      logWebhookError("failed to recalc appointment status (read paid payments)", {
        error: paidPaymentsError,
        appointmentId: appointment.id,
        tenantId: appointment.tenant_id,
      });
      return NextResponse.json({ ok: false, error: "Failed to recalc appointment status" }, { status: 500 });
    }
    const paidTotal = (paidPayments ?? []).reduce(
      (acc, item) => acc + Number(item.amount ?? 0),
      0
    );
    const nextStatus =
      paidTotal >= total && total > 0 ? "paid" : paidTotal > 0 ? "partial" : "pending";
    const { error: updateAppointmentError } = await supabase
      .from("appointments")
      .update({ payment_status: nextStatus })
      .eq("id", appointment.id)
      .eq("tenant_id", appointment.tenant_id);
    if (updateAppointmentError) {
      logWebhookError("failed to update appointment payment status", {
        error: updateAppointmentError,
        appointmentId: appointment.id,
        tenantId: appointment.tenant_id,
        nextStatus,
      });
      return NextResponse.json({ ok: false, error: "Failed to update appointment payment status" }, { status: 500 });
    }
  }

  if (appointment) {
    const eventPayload = { webhook: body ?? null, payment: normalizedPaymentPayload } as unknown as Json;
    const { error: eventError } = await supabase.from("appointment_events").insert({
      appointment_id: appointment.id,
      tenant_id: appointment.tenant_id,
      event_type: "payment_webhook",
      payload: eventPayload,
    });
    if (eventError) {
      logWebhookError("failed to register payment event", {
        error: eventError,
        appointmentId: appointment.id,
        tenantId: appointment.tenant_id,
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  // Mercado Pago pode testar a URL com GET em alguns cenários.
  const paymentId = getPaymentId(request, null);
  return NextResponse.json({ ok: true, paymentId });
}
