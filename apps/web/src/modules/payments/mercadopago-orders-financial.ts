import { createServiceClient } from "../../../lib/supabase/service";
import { AppError } from "../../shared/errors/AppError";
import { fail, ok } from "../../shared/errors/result";
import { deriveAppointmentPaymentStatus } from "./mercadopago-orders.helpers";

export async function recalculateAppointmentPaymentStatus({
  appointmentId,
  tenantId,
}: {
  appointmentId: string;
  tenantId: string;
}) {
  const supabase = createServiceClient();
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id, tenant_id, status, payment_status, price, price_override")
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (appointmentError) {
    return fail(
      new AppError(
        "Não foi possível atualizar o status financeiro do agendamento.",
        "SUPABASE_ERROR",
        500,
        appointmentError
      )
    );
  }

  if (!appointment) {
    return ok(null);
  }

  const { data: checkout, error: checkoutError } = await supabase
    .from("appointment_checkout")
    .select("total")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (checkoutError) {
    return fail(
      new AppError(
        "Não foi possível atualizar o status financeiro do agendamento.",
        "SUPABASE_ERROR",
        500,
        checkoutError
      )
    );
  }

  const { data: paidPayments, error: paidPaymentsError } = await supabase
    .from("appointment_payments")
    .select("amount")
    .eq("tenant_id", tenantId)
    .eq("appointment_id", appointmentId)
    .eq("status", "paid");

  if (paidPaymentsError) {
    return fail(
      new AppError(
        "Não foi possível atualizar o status financeiro do agendamento.",
        "SUPABASE_ERROR",
        500,
        paidPaymentsError
      )
    );
  }

  const checkoutTotal =
    checkout && checkout.total !== null && checkout.total !== undefined
      ? Number(checkout.total)
      : null;
  const fallbackTotal = Number(appointment.price_override ?? appointment.price ?? 0);
  const total = Number.isFinite(checkoutTotal ?? Number.NaN) ? Number(checkoutTotal) : fallbackTotal;
  const paidTotal = (paidPayments ?? []).reduce((acc, item) => acc + Number(item.amount ?? 0), 0);
  const nextStatus = deriveAppointmentPaymentStatus({
    total,
    paidTotal,
    appointmentStatus: appointment.status ?? null,
    currentPaymentStatus: appointment.payment_status ?? null,
  });

  const { error: updateError } = await supabase
    .from("appointments")
    .update({ payment_status: nextStatus })
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId);

  if (updateError) {
    return fail(
      new AppError(
        "Não foi possível atualizar o status financeiro do agendamento.",
        "SUPABASE_ERROR",
        500,
        updateError
      )
    );
  }

  return ok({ nextStatus, paidTotal, total });
}
