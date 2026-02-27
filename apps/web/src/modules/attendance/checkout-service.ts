import { createServiceClient } from "../../../lib/supabase/service";
import { computeTotals } from "../../../lib/attendance/attendance-domain";
import { recalculateAppointmentPaymentStatus } from "../payments/mercadopago-orders";

type RecalculatedPaymentStatus = {
  paid: number;
  total: number;
  paymentStatus: "paid" | "partial" | "pending" | "waived" | "refunded";
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function recalcCheckoutTotals(appointmentId: string) {
  const supabase = createServiceClient();
  const { data: items } = await supabase
    .from("appointment_checkout_items")
    .select("amount, qty")
    .eq("appointment_id", appointmentId);
  const { data: checkout } = await supabase
    .from("appointment_checkout")
    .select("discount_type, discount_value")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  const totals = computeTotals({
    items: (items ?? []).map((item) => ({
      amount: Number(item.amount ?? 0),
      qty: item.qty ?? 1,
    })),
    discountType: (checkout?.discount_type as "value" | "pct" | null) ?? null,
    discountValue: checkout?.discount_value ?? 0,
  });

  await supabase
    .from("appointment_checkout")
    .update({ subtotal: totals.subtotal, total: totals.total })
    .eq("appointment_id", appointmentId);

  return totals;
}

export async function recalculateCheckoutPaymentStatus(
  appointmentId: string,
  tenantId: string
): Promise<RecalculatedPaymentStatus> {
  const result = await recalculateAppointmentPaymentStatus({
    appointmentId,
    tenantId,
  });

  if (!result.ok) {
    throw result.error;
  }

  if (!result.data) {
    return { paid: 0, total: 0, paymentStatus: "pending" };
  }

  return {
    paid: Number(result.data.paidTotal ?? 0),
    total: Number(result.data.total ?? 0),
    paymentStatus: result.data.nextStatus,
  };
}

export async function getCheckoutChargeSnapshot(appointmentId: string, tenantId: string) {
  await recalcCheckoutTotals(appointmentId);
  const { paid, total, paymentStatus } = await recalculateCheckoutPaymentStatus(appointmentId, tenantId);
  return {
    paid: roundCurrency(paid),
    total: roundCurrency(total),
    remaining: roundCurrency(Math.max(total - paid, 0)),
    paymentStatus,
  };
}
