"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FIXED_TENANT_ID } from "../../../../../lib/tenant-context";
import { createServiceClient } from "../../../../../lib/supabase/service";
import type { Json } from "../../../../../lib/supabase/types";
import { AppError } from "../../../../../src/shared/errors/AppError";
import { mapSupabaseError } from "../../../../../src/shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../../../src/shared/errors/result";
import {
  appointmentIdSchema,
  recordPaymentSchema,
  setCheckoutItemsSchema,
  setDiscountSchema,
} from "../../../../../src/shared/validation/attendance";
import { insertAttendanceEvent } from "../../../../../lib/attendance/attendance-repository";
import { updateAppointment } from "../../../../../src/modules/appointments/repository";
import {
  getCheckoutChargeSnapshot,
  recalcCheckoutTotals,
  recalculateCheckoutPaymentStatus,
} from "../../../../../src/modules/attendance/checkout-service";
import { insertTransaction } from "../../../../../src/modules/finance/repository";

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function setCheckoutItemsImpl(payload: {
  appointmentId: string;
  items: Array<{ type: "service" | "fee" | "addon" | "adjustment"; label: string; qty?: number; amount: number; metadata?: Record<string, unknown> }>;
}): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = setCheckoutItemsSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const { error: deleteError } = await supabase
    .from("appointment_checkout_items")
    .delete()
    .eq("appointment_id", parsed.data.appointmentId);

  const mappedDeleteError = mapSupabaseError(deleteError);
  if (mappedDeleteError) return fail(mappedDeleteError);

  const items = parsed.data.items.map((item, index) => ({
    appointment_id: parsed.data.appointmentId,
    tenant_id: FIXED_TENANT_ID,
    type: item.type,
    label: item.label,
    qty: item.qty ?? 1,
    amount: item.amount,
    metadata: (item.metadata ?? null) as Json | null,
    sort_order: index + 1,
  }));

  const { error } = await supabase.from("appointment_checkout_items").insert(items);
  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  await recalcCheckoutTotals(parsed.data.appointmentId);
  try {
    await recalculateCheckoutPaymentStatus(parsed.data.appointmentId, FIXED_TENANT_ID);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    return fail(new AppError("Não foi possível recalcular o status financeiro.", "UNKNOWN", 500, error));
  }

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function setDiscountImpl(payload: {
  appointmentId: string;
  type: "value" | "pct" | null;
  value: number | null;
  reason?: string | null;
}): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = setDiscountSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("appointment_checkout")
    .update({
      discount_type: parsed.data.type,
      discount_value: parsed.data.value,
      discount_reason: parsed.data.reason ?? null,
    })
    .eq("appointment_id", parsed.data.appointmentId);

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  await recalcCheckoutTotals(parsed.data.appointmentId);
  try {
    await recalculateCheckoutPaymentStatus(parsed.data.appointmentId, FIXED_TENANT_ID);
  } catch (error) {
    if (error instanceof AppError) return fail(error);
    return fail(new AppError("Não foi possível recalcular o status financeiro.", "UNKNOWN", 500, error));
  }

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function recordPaymentImpl(payload: {
  appointmentId: string;
  method: "pix" | "card" | "cash" | "other";
  amount: number;
  transactionId?: string | null;
}): Promise<ActionResult<{ paymentId: string }>> {
  const parsed = recordPaymentSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const chargeSnapshot = await getCheckoutChargeSnapshot(parsed.data.appointmentId, FIXED_TENANT_ID);
  if (chargeSnapshot.paymentStatus === "waived") {
    return fail(
      new AppError("Este atendimento está liberado como cortesia. Remova a liberação antes de cobrar.", "VALIDATION_ERROR", 400)
    );
  }
  if (chargeSnapshot.remaining <= 0) {
    return fail(new AppError("Este atendimento já está com pagamento quitado.", "VALIDATION_ERROR", 400));
  }

  const requestedAmount = roundCurrency(parsed.data.amount);
  if (requestedAmount > chargeSnapshot.remaining + 0.01) {
    return fail(
      new AppError(
        "O valor informado é maior que o saldo atual do atendimento. Atualize o checkout e tente novamente.",
        "VALIDATION_ERROR",
        400
      )
    );
  }

  let transactionId = parsed.data.transactionId ?? null;

  if (!transactionId) {
    const description = `Pagamento Atendimento #${parsed.data.appointmentId.slice(0, 8)}`;
    const { data: transactionData, error: transactionError } = await insertTransaction({
      tenant_id: FIXED_TENANT_ID,
      appointment_id: parsed.data.appointmentId,
      type: "income",
      category: "Serviço",
      description,
      amount: requestedAmount,
      payment_method: parsed.data.method,
    });

    if (!transactionError && transactionData && Array.isArray(transactionData) && transactionData[0]) {
      transactionId = transactionData[0].id;
    }
  }

  const { data, error } = await supabase
    .from("appointment_payments")
    .insert({
      appointment_id: parsed.data.appointmentId,
      tenant_id: FIXED_TENANT_ID,
      method: parsed.data.method,
      amount: requestedAmount,
      status: "paid",
      paid_at: new Date().toISOString(),
      transaction_id: transactionId,
    })
    .select("id")
    .single();

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  await recalculateCheckoutPaymentStatus(parsed.data.appointmentId, FIXED_TENANT_ID);

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "payment_recorded",
    payload: { method: parsed.data.method, amount: requestedAmount },
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ paymentId: data?.id ?? parsed.data.appointmentId });
}

export async function waiveCheckoutPaymentImpl(payload: {
  appointmentId: string;
  reason?: string | null;
}): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = appointmentIdSchema
    .extend({
      reason: z.string().max(240).optional().nullable(),
    })
    .safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();

  const { data: appointment, error: appointmentReadError } = await supabase
    .from("appointments")
    .select("id, payment_status")
    .eq("id", parsed.data.appointmentId)
    .eq("tenant_id", FIXED_TENANT_ID)
    .maybeSingle();

  const mappedReadError = mapSupabaseError(appointmentReadError);
  if (mappedReadError) return fail(mappedReadError);
  if (!appointment) {
    return fail(new AppError("Atendimento não encontrado", "NOT_FOUND", 404));
  }

  if (appointment.payment_status === "paid") {
    return fail(
      new AppError(
        "Este atendimento já está quitado. Use a liberação apenas quando houver saldo em aberto.",
        "VALIDATION_ERROR",
        400
      )
    );
  }

  const now = new Date().toISOString();
  const { error: checkoutError } = await supabase
    .from("appointment_checkout")
    .update({ confirmed_at: now })
    .eq("appointment_id", parsed.data.appointmentId);
  const mappedCheckoutError = mapSupabaseError(checkoutError);
  if (mappedCheckoutError) return fail(mappedCheckoutError);

  const { error: appointmentUpdateError } = await updateAppointment(FIXED_TENANT_ID, parsed.data.appointmentId, {
    payment_status: "waived",
  });
  const mappedAppointmentError = mapSupabaseError(appointmentUpdateError);
  if (mappedAppointmentError) return fail(mappedAppointmentError);

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "payment_waived",
    payload: {
      reason: parsed.data.reason?.trim() || null,
      label: "Cortesia",
    },
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  revalidatePath("/");
  revalidatePath("/caixa");
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function confirmCheckoutImpl(payload: { appointmentId: string }): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = appointmentIdSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const { paid, total, paymentStatus } = await recalculateCheckoutPaymentStatus(
    parsed.data.appointmentId,
    FIXED_TENANT_ID
  );
  if (paymentStatus !== "waived" && paid < total) {
    return fail(new AppError("Pagamento insuficiente", "VALIDATION_ERROR", 400));
  }

  const { error } = await supabase
    .from("appointment_checkout")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("appointment_id", parsed.data.appointmentId);

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "checkout_confirmed",
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}
