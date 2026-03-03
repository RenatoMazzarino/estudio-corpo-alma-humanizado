import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../lib/supabase/service";
import type { Json } from "../../../../lib/supabase/types";
import { recalculateAppointmentPaymentStatus } from "../../../../src/modules/payments/mercadopago-orders";
import {
  getPaymentId,
  logWebhookError,
  mapProviderStatusToInternal,
  normalizeMercadoPagoToken,
  parseMercadoPagoResourceId,
  resolveNotificationType,
  verifyWebhookSignature,
} from "./mercadopago-webhook.helpers";
import { resolveWebhookPaymentData } from "./mercadopago-webhook.provider";

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
  const signatureCheck = verifyWebhookSignature(request, webhookSecret, body);
  if (!signatureCheck.valid) {
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

  const notificationType = resolveNotificationType(request, body);
  const resourceId = parseMercadoPagoResourceId(getPaymentId(request, body));

  if (!resourceId) return NextResponse.json({ ok: true });
  if (notificationType === "unknown") {
    return NextResponse.json({ ok: true, skipped: "unsupported_notification_type" });
  }

  const resolved = await resolveWebhookPaymentData({
    accessToken,
    notificationType,
    resourceId,
  });
  if (resolved.kind === "skip") {
    return NextResponse.json({ ok: true, skipped: resolved.reason });
  }

  const {
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
  } = resolved.data;
  const resolvedProviderRef = providerRef ?? resourceId;

  const normalizedPaymentPayload = {
    source: notificationType,
    resource_id: resourceId,
    provider_ref: resolvedProviderRef,
    provider_order_id: orderIdFromPayment ?? (notificationType === "order" ? resourceId : null),
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
  const providerOrderId = orderIdFromPayment ?? (notificationType === "order" ? resourceId : null);
  const cardMode =
    method === "card"
      ? paymentTypeId?.toLowerCase().includes("debit")
        ? "debit"
        : paymentTypeId?.toLowerCase().includes("credit")
          ? "credit"
          : null
      : null;

  const supabase = createServiceClient();

  const { data: existing, error: existingError } = await supabase
    .from("appointment_payments")
    .select(
      "appointment_id, tenant_id, amount, provider_order_id, payment_method_id, point_terminal_id, card_mode, installments, card_last4, card_brand"
    )
    .eq("provider_ref", resolvedProviderRef)
    .maybeSingle();
  if (existingError) {
    logWebhookError("failed to read existing payment", {
      error: existingError,
      resourceId,
      providerRef: resolvedProviderRef,
    });
    return NextResponse.json({ ok: false, error: "Failed to read existing payment" }, { status: 500 });
  }

  const resolvedAppointmentId = existing?.appointment_id ?? appointmentId;
  const amount = transactionAmount > 0 ? transactionAmount : Number(existing?.amount ?? 0);

  let appointment: { id: string; tenant_id: string; price: number | null; price_override: number | null } | null =
    null;
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
    provider_ref: resolvedProviderRef,
        provider_order_id: providerOrderId ?? existing?.provider_order_id ?? null,
        paid_at: status === "paid" ? approvedAt ?? new Date().toISOString() : null,
        payment_method_id: paymentMethodId ?? existing?.payment_method_id ?? null,
        point_terminal_id: pointTerminalId ?? existing?.point_terminal_id ?? null,
        card_mode: cardMode ?? existing?.card_mode ?? null,
        installments: installments ?? existing?.installments ?? null,
        card_last4: cardLast4 ?? existing?.card_last4 ?? null,
        card_brand: cardBrand ?? existing?.card_brand ?? null,
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
    const recalcResult = await recalculateAppointmentPaymentStatus({
      appointmentId: appointment.id,
      tenantId: appointment.tenant_id,
    });
    if (!recalcResult.ok) {
      logWebhookError("failed to recalc appointment payment status", {
        error: recalcResult.error,
        appointmentId: appointment.id,
        tenantId: appointment.tenant_id,
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
  const paymentId = getPaymentId(request, null);
  return NextResponse.json({ ok: true, paymentId });
}
