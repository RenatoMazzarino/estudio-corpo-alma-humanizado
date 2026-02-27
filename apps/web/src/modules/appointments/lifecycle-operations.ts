import { revalidatePath } from "next/cache";

import { insertTransaction, getTransactionByAppointmentId } from "../finance/repository";
import {
  scheduleAppointmentCanceledNotification,
} from "../notifications/whatsapp-automation";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { createServiceClient } from "../../../lib/supabase/service";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import { AppError } from "../../shared/errors/AppError";
import { mapSupabaseError } from "../../shared/errors/mapSupabaseError";
import {
  cancelAppointmentSchema,
  finishAppointmentSchema,
  startAppointmentSchema,
} from "../../shared/validation/appointments";
import { updateAppointment, updateAppointmentReturning } from "./repository";

export async function startAppointmentOperation(id: string): Promise<ActionResult<{ id: string }>> {
  const parsed = startAppointmentSchema.safeParse({ id });
  if (!parsed.success) {
    return fail(new AppError("ID inválido", "VALIDATION_ERROR", 400, parsed.error));
  }

  const startedAt = new Date().toISOString();
  const { error } = await updateAppointment(FIXED_TENANT_ID, id, {
    status: "in_progress",
    started_at: startedAt,
  });

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  const supabase = createServiceClient();
  const { data: attendance } = await supabase
    .from("appointment_attendances")
    .select("timer_started_at")
    .eq("appointment_id", id)
    .maybeSingle();

  const timerStartedAt = attendance?.timer_started_at ?? startedAt;
  await supabase.from("appointment_attendances").upsert(
    {
      appointment_id: id,
      tenant_id: FIXED_TENANT_ID,
      timer_status: "running",
      timer_started_at: timerStartedAt,
      timer_paused_at: null,
    },
    { onConflict: "appointment_id" }
  );

  revalidatePath("/");
  return ok({ id });
}

export async function finishAppointmentOperation(id: string): Promise<ActionResult<{ id: string }>> {
  const parsed = finishAppointmentSchema.safeParse({ id });
  if (!parsed.success) {
    return fail(new AppError("ID inválido", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { data: updatedAppointment, error } = await updateAppointmentReturning<{
    price: number | null;
    service_name: string | null;
    actual_duration_minutes: number | null;
  }>(FIXED_TENANT_ID, id, {
    status: "completed",
    finished_at: new Date().toISOString(),
  }, "price, service_name, actual_duration_minutes");

  const mappedError = mapSupabaseError(error);
  if (mappedError || !updatedAppointment) {
    return fail(mappedError ?? new AppError("Agendamento não atualizado", "UNKNOWN", 500));
  }

  const { data: existingTransaction, error: existingError } = await getTransactionByAppointmentId(
    FIXED_TENANT_ID,
    id
  );
  const mappedExistingError = mapSupabaseError(existingError);
  if (mappedExistingError) return fail(mappedExistingError);

  if (!existingTransaction) {
    const { error: transactionError } = await insertTransaction({
      tenant_id: FIXED_TENANT_ID,
      appointment_id: id,
      type: "income",
      category: "Serviço",
      description: `Recebimento Agendamento #${id.slice(0, 8)}`,
      amount: updatedAppointment.price ?? 0,
      payment_method: null,
    });

    const mappedTransactionError = mapSupabaseError(transactionError);
    if (mappedTransactionError) return fail(mappedTransactionError);
  }

  const supabase = createServiceClient();
  await supabase
    .from("appointment_attendances")
    .update({
      timer_status: "finished",
      actual_seconds: updatedAppointment.actual_duration_minutes
        ? updatedAppointment.actual_duration_minutes * 60
        : undefined,
    })
    .eq("appointment_id", id);

  revalidatePath("/");
  revalidatePath("/caixa");
  return ok({ id });
}

export async function cancelAppointmentOperation(
  id: string,
  options?: { notifyClient?: boolean }
): Promise<ActionResult<{ id: string }>> {
  const parsed = cancelAppointmentSchema.safeParse({ id });
  if (!parsed.success) {
    return fail(new AppError("ID inválido", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await updateAppointment(FIXED_TENANT_ID, id, {
    status: "canceled_by_studio",
  });

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  const supabase = createServiceClient();
  await supabase
    .from("appointment_attendances")
    .update({
      timer_status: "idle",
      timer_paused_at: null,
    })
    .eq("appointment_id", id);

  await scheduleAppointmentCanceledNotification({
    tenantId: FIXED_TENANT_ID,
    appointmentId: id,
    source: "admin_cancel",
    notifyClient: options?.notifyClient === true,
  });

  revalidatePath("/");
  revalidatePath("/caixa");
  return ok({ id });
}
