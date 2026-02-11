import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../lib/supabase/service";
import type { Json } from "../../../../lib/supabase/types";

type SignatureParts = {
  ts?: string;
  v1?: string;
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

const buildSignatureManifest = (dataId: string, requestId: string, ts: string) => {
  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (requestId) parts.push(`request-id:${requestId}`);
  if (ts) parts.push(`ts:${ts}`);
  return parts.length ? `${parts.join(";")};` : "";
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

  if (!signature.ts || !signature.v1) return false;
  const manifest = buildSignatureManifest(dataId, requestId, signature.ts);
  if (!manifest) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return expected === signature.v1;
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
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "Missing Mercado Pago token" }, { status: 500 });
  }
  if (!webhookSecret) {
    return NextResponse.json({ ok: false, error: "Missing Mercado Pago webhook secret" }, { status: 500 });
  }
  if (!verifyWebhookSignature(request, webhookSecret)) {
    return NextResponse.json({ ok: false, error: "Invalid webhook signature" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const paymentId = getPaymentId(request, body);

  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!paymentResponse.ok) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payment = (await paymentResponse.json()) as {
    id: string | number;
    status?: string;
    status_detail?: string;
    payment_method_id?: string;
    payment_type_id?: string;
    installments?: number;
    card?: {
      last_four_digits?: string;
      brand?: string;
    };
    transaction_amount?: number;
    date_approved?: string | null;
    external_reference?: string | null;
  };

  const providerRef = String(payment.id);
  const status = payment.status ?? "pending";
  const paymentMethodId =
    typeof payment.payment_method_id === "string" ? payment.payment_method_id : null;
  const paymentTypeId =
    typeof payment.payment_type_id === "string" ? payment.payment_type_id : null;
  const installments = typeof payment.installments === "number" ? payment.installments : null;
  const cardLast4 = payment.card?.last_four_digits ?? null;
  const cardBrand = payment.card?.brand ?? null;
  const approvedAt = payment.date_approved ?? null;
  const appointmentId = payment.external_reference ?? null;
  const method = paymentMethodId === "pix" || paymentTypeId === "bank_transfer" ? "pix" : "card";

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("appointment_payments")
    .select("appointment_id, tenant_id, amount")
    .eq("provider_ref", providerRef)
    .maybeSingle();

  const resolvedAppointmentId = existing?.appointment_id ?? appointmentId;
  const amount =
    typeof payment.transaction_amount === "number" ? payment.transaction_amount : existing?.amount ?? 0;

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
    await supabase.from("appointment_payments").upsert(
      {
        appointment_id: resolvedAppointmentId,
        tenant_id: resolvedTenantId,
        method,
        amount,
        status,
        provider_ref: providerRef,
        paid_at: status === "approved" ? approvedAt ?? new Date().toISOString() : null,
        payment_method_id: paymentMethodId,
        installments,
        card_last4: cardLast4,
        card_brand: cardBrand,
        raw_payload: payment,
      },
      { onConflict: "provider_ref,tenant_id" }
    );
  }

  if (appointment && status === "approved") {
    const total = appointment.price_override ?? appointment.price ?? 0;
    const nextStatus = amount >= total && total > 0 ? "paid" : "partial";
    await supabase
      .from("appointments")
      .update({ payment_status: nextStatus })
      .eq("id", appointment.id)
      .eq("tenant_id", appointment.tenant_id);
  }

  if (appointment) {
    const eventPayload = { webhook: body ?? null, payment } as unknown as Json;
    await supabase.from("appointment_events").insert({
      appointment_id: appointment.id,
      tenant_id: appointment.tenant_id,
      event_type: "payment_webhook",
      payload: eventPayload,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  // Mercado Pago pode testar a URL com GET em alguns cenários.
  const paymentId = getPaymentId(request, null);
  return NextResponse.json({ ok: true, paymentId });
}
