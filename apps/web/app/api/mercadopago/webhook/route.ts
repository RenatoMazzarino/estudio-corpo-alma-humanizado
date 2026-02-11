import crypto from "crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../lib/supabase/service";

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
    transaction_amount?: number;
    date_approved?: string | null;
    external_reference?: string | null;
  };

  const providerRef = String(payment.id);
  const status = payment.status ?? "pending";
  const amount = typeof payment.transaction_amount === "number" ? payment.transaction_amount : null;
  const approvedAt = payment.date_approved ?? null;
  const appointmentId = payment.external_reference ?? null;

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("appointment_payments")
    .select("id, appointment_id, amount")
    .eq("provider_ref", providerRef)
    .maybeSingle();

  let resolvedAppointmentId = existing?.appointment_id ?? appointmentId;

  if (!existing && resolvedAppointmentId) {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id, tenant_id")
      .eq("id", resolvedAppointmentId)
      .single();

    if (appointment) {
      await supabase.from("appointment_payments").insert({
        appointment_id: appointment.id,
        tenant_id: appointment.tenant_id,
        method: "pix",
        amount: amount ?? 0,
        status,
        provider_ref: providerRef,
        paid_at: status === "approved" ? approvedAt ?? new Date().toISOString() : null,
      });
    }
  }

  if (existing) {
    await supabase
      .from("appointment_payments")
      .update({
        status,
        amount: amount ?? existing.amount ?? 0,
        paid_at: status === "approved" ? approvedAt ?? new Date().toISOString() : null,
      })
      .eq("id", existing.id);
  }

  if (resolvedAppointmentId && status === "approved") {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id, tenant_id, price, price_override")
      .eq("id", resolvedAppointmentId)
      .single();

    if (appointment) {
      const total = appointment.price_override ?? appointment.price ?? 0;
      const nextStatus = amount !== null && total > 0 && amount >= total ? "paid" : "partial";
      await supabase
        .from("appointments")
        .update({ payment_status: nextStatus })
        .eq("id", appointment.id)
        .eq("tenant_id", appointment.tenant_id);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  // Mercado Pago pode testar a URL com GET em alguns cenários.
  const paymentId = getPaymentId(request, null);
  return NextResponse.json({ ok: true, paymentId });
}
