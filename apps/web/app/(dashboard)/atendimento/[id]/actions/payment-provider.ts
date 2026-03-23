"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "../../../../../lib/supabase/service";
import { AppError } from "../../../../../src/shared/errors/AppError";
import { mapSupabaseError } from "../../../../../src/shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../../../src/shared/errors/result";
import { appointmentIdSchema } from "../../../../../src/shared/validation/attendance";
import { insertAttendanceEvent } from "../../../../../lib/attendance/attendance-repository";
import { getCheckoutChargeSnapshot } from "../../../../../src/modules/attendance/checkout-service";
import {
  createPixOrderForAppointment,
  createPointOrderForAppointment,
  getAppointmentPaymentStatusByMethod,
  getPointOrderStatus,
  type PointCardMode,
} from "../../../../../src/modules/payments/mercadopago-orders";
import { getSettings } from "../../../../../src/modules/settings/repository";

type PaymentProviderActionOptions = {
  skipRevalidate?: boolean;
};

export async function createAttendancePixPaymentImpl(payload: {
  appointmentId: string;
  amount: number;
  payerName: string;
  payerPhone: string;
  payerEmail?: string | null;
  attempt?: number;
}, tenantId: string, options?: PaymentProviderActionOptions): Promise<ActionResult<{
  id: string;
  order_id: string;
  internal_status: "paid" | "pending" | "failed";
  status: string;
  ticket_url: string | null;
  qr_code: string | null;
  qr_code_base64: string | null;
  transaction_amount: number;
  created_at: string;
  expires_at: string;
}>> {
  const parsed = z
    .object({
      appointmentId: z.string().uuid(),
      amount: z.number().positive(),
      payerName: z.string().min(2),
      payerPhone: z.string().min(8),
      payerEmail: z.string().email().optional().nullable(),
      attempt: z.number().int().min(0).optional(),
    })
    .safeParse(payload);

  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const chargeSnapshot = await getCheckoutChargeSnapshot(parsed.data.appointmentId, tenantId);
  if (chargeSnapshot.paymentStatus === "waived") {
    return fail(
      new AppError("Este atendimento está liberado como cortesia. Remova a liberação antes de cobrar.", "VALIDATION_ERROR", 400)
    );
  }
  if (chargeSnapshot.remaining <= 0) {
    return fail(new AppError("Este atendimento já está com pagamento quitado.", "VALIDATION_ERROR", 400));
  }
  const chargeAmount = chargeSnapshot.remaining;

  const result = await createPixOrderForAppointment({
    appointmentId: parsed.data.appointmentId,
    tenantId,
    amount: chargeAmount,
    payerName: parsed.data.payerName,
    payerPhone: parsed.data.payerPhone,
    payerEmail: parsed.data.payerEmail,
    attempt: parsed.data.attempt,
  });
  if (!result.ok) return result;

  await insertAttendanceEvent({
    tenantId,
    appointmentId: parsed.data.appointmentId,
    eventType: "payment_pix_created",
    payload: {
      payment_id: result.data.id,
      order_id: result.data.order_id,
      amount: result.data.transaction_amount,
      status: result.data.internal_status,
    },
  });

  if (!options?.skipRevalidate) {
    revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  }
  return ok(result.data);
}

export async function getAttendancePixPaymentStatusImpl(payload: {
  appointmentId: string;
}, tenantId: string): Promise<ActionResult<{ internal_status: "paid" | "pending" | "failed" }>> {
  const parsed = appointmentIdSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  return getAppointmentPaymentStatusByMethod({
    appointmentId: parsed.data.appointmentId,
    tenantId,
    method: "pix",
  });
}

export async function cancelAttendancePendingChargesImpl(payload: {
  appointmentId: string;
  methods?: Array<"pix" | "card">;
}, tenantId: string, options?: PaymentProviderActionOptions): Promise<ActionResult<{ cancelledCount: number }>> {
  const parsed = appointmentIdSchema
    .extend({
      methods: z.array(z.enum(["pix", "card"])).min(1).optional(),
    })
    .safeParse(payload);

  if (!parsed.success) {
    return fail(new AppError("Dados invÃ¡lidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const methods = parsed.data.methods?.length ? parsed.data.methods : ["pix", "card"];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("appointment_payments")
    .update({
      status: "failed",
      paid_at: null,
    })
    .eq("appointment_id", parsed.data.appointmentId)
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .in("method", methods)
    .select("id, method, provider_order_id");

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  const cancelledRows = Array.isArray(data) ? data : [];
  const cancelledCount = cancelledRows.length;
  if (cancelledCount > 0) {
    await insertAttendanceEvent({
      tenantId,
      appointmentId: parsed.data.appointmentId,
      eventType: "payment_charge_cancelled",
      payload: {
        methods,
        cancelled_count: cancelledCount,
        payments: cancelledRows.map((item) => ({
          id: item.id,
          method: item.method,
          provider_order_id: item.provider_order_id,
        })),
      },
    });
  }

  if (!options?.skipRevalidate) {
    revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  }

  return ok({ cancelledCount });
}

export async function createAttendancePointPaymentImpl(payload: {
  appointmentId: string;
  amount: number;
  cardMode: PointCardMode;
  terminalId?: string | null;
  attempt?: number;
}, tenantId: string, options?: PaymentProviderActionOptions): Promise<ActionResult<{
  id: string;
  order_id: string;
  internal_status: "paid" | "pending" | "failed";
  status: string;
  status_detail: string | null;
  transaction_amount: number;
  point_terminal_id: string;
  card_mode: PointCardMode;
}>> {
  const parsed = z
    .object({
      appointmentId: z.string().uuid(),
      amount: z.number().positive(),
      cardMode: z.enum(["debit", "credit"]),
      terminalId: z.string().optional().nullable(),
      attempt: z.number().int().min(0).optional(),
    })
    .safeParse(payload);

  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  let terminalId = parsed.data.terminalId?.trim() ?? "";
  if (!terminalId) {
    const { data: settings, error } = await getSettings(tenantId);
    const mapped = mapSupabaseError(error);
    if (mapped) return fail(mapped);
    terminalId = settings?.mp_point_terminal_id?.trim() ?? "";
  }

  if (!terminalId) {
    return fail(
      new AppError(
        "Nenhuma maquininha Point configurada. Ajuste em Configurações antes de cobrar.",
        "VALIDATION_ERROR",
        400
      )
    );
  }

  const chargeSnapshot = await getCheckoutChargeSnapshot(parsed.data.appointmentId, tenantId);
  if (chargeSnapshot.paymentStatus === "waived") {
    return fail(
      new AppError("Este atendimento está liberado como cortesia. Remova a liberação antes de cobrar.", "VALIDATION_ERROR", 400)
    );
  }
  if (chargeSnapshot.remaining <= 0) {
    return fail(new AppError("Este atendimento já está com pagamento quitado.", "VALIDATION_ERROR", 400));
  }
  const chargeAmount = chargeSnapshot.remaining;

  const result = await createPointOrderForAppointment({
    appointmentId: parsed.data.appointmentId,
    tenantId,
    amount: chargeAmount,
    terminalId,
    cardMode: parsed.data.cardMode,
    attempt: parsed.data.attempt,
  });
  if (!result.ok) return result;

  await insertAttendanceEvent({
    tenantId,
    appointmentId: parsed.data.appointmentId,
    eventType: "payment_point_charge_started",
    payload: {
      payment_id: result.data.id,
      order_id: result.data.order_id,
      amount: result.data.transaction_amount,
      card_mode: result.data.card_mode,
      point_terminal_id: result.data.point_terminal_id,
      status: result.data.internal_status,
    },
  });

  if (!options?.skipRevalidate) {
    revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  }
  return ok(result.data);
}

export async function getAttendancePointPaymentStatusImpl(payload: {
  appointmentId: string;
  orderId: string;
}, tenantId: string, options?: PaymentProviderActionOptions): Promise<ActionResult<{
  id: string;
  order_id: string;
  internal_status: "paid" | "pending" | "failed";
  status: string;
  status_detail: string | null;
  transaction_amount: number;
  point_terminal_id: string | null;
  card_mode: PointCardMode | null;
  appointment_id: string | null;
}>> {
  const parsed = z
    .object({
      appointmentId: z.string().uuid(),
      orderId: z.string().min(4),
    })
    .safeParse(payload);

  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const result = await getPointOrderStatus({
    orderId: parsed.data.orderId,
    tenantId,
    expectedAppointmentId: parsed.data.appointmentId,
  });
  if (!result.ok) return result;

  const resolvedAppointmentId = result.data.appointment_id ?? parsed.data.appointmentId;
  if (resolvedAppointmentId !== parsed.data.appointmentId) {
    return fail(
      new AppError(
        "Esta cobrança da maquininha pertence a outro atendimento.",
        "VALIDATION_ERROR",
        409,
        {
          expectedAppointmentId: parsed.data.appointmentId,
          receivedAppointmentId: resolvedAppointmentId,
          orderId: parsed.data.orderId,
        }
      )
    );
  }

  await insertAttendanceEvent({
    tenantId,
    appointmentId: resolvedAppointmentId,
    eventType: "payment_point_charge_status",
    payload: {
      payment_id: result.data.id,
      order_id: result.data.order_id,
      status: result.data.internal_status,
      status_detail: result.data.status_detail,
      amount: result.data.transaction_amount,
    },
  });

  if (!options?.skipRevalidate) {
    revalidatePath(`/atendimento/${resolvedAppointmentId}`);
  }
  return ok(result.data);
}
