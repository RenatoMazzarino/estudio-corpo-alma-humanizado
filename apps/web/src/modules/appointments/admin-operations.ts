import { endOfDay, format, getDaysInMonth, parseISO, setDate, startOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { createServiceClient } from "../../../lib/supabase/service";
import { AppError } from "../../shared/errors/AppError";
import { mapSupabaseError } from "../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import { finishAdminAppointmentSchema } from "../../shared/validation/appointments";
import { getClientById, updateClient } from "../clients/repository";
import { getTransactionByAppointmentId, insertTransaction } from "../finance/repository";
import {
  deleteAvailabilityBlocksInRange,
  insertAvailabilityBlocks,
  listAppointmentsInRange,
  listAvailabilityBlocksInRange,
  updateAppointmentReturning,
} from "./repository";

export interface FinishAppointmentParams {
  appointmentId: string;
  paymentMethod: "pix" | "cash" | "card";
  finalAmount: number;
  notes: string;
  actualDurationMinutes?: number | null;
}

export async function finishAdminAppointmentOperation(
  payload: FinishAppointmentParams
): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = finishAdminAppointmentSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos para finalização", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { data: updatedAppointment, error: appError } = await updateAppointmentReturning<{
    client_id: string | null;
    service_name: string | null;
    started_at: string | null;
    actual_duration_minutes: number | null;
  }>(
    FIXED_TENANT_ID,
    parsed.data.appointmentId,
    {
      status: "completed",
      payment_status: "paid",
      finished_at: new Date().toISOString(),
      price: parsed.data.finalAmount,
      actual_duration_minutes: parsed.data.actualDurationMinutes ?? undefined,
    },
    "client_id, service_name, started_at, actual_duration_minutes"
  );

  const mappedAppError = mapSupabaseError(appError);
  if (mappedAppError || !updatedAppointment) {
    return fail(mappedAppError ?? new AppError("Agendamento não atualizado", "UNKNOWN", 500));
  }

  const { client_id, service_name } = updatedAppointment;

  if (client_id && parsed.data.notes?.trim()) {
    const { data: clientData, error: clientFetchError } = await getClientById(FIXED_TENANT_ID, client_id);
    const mappedClientFetchError = mapSupabaseError(clientFetchError);
    if (mappedClientFetchError) return fail(mappedClientFetchError);

    const currentNotes = clientData?.observacoes_gerais || "";
    const dateStr = format(new Date(), "dd/MM/yyyy");
    const newEntry = `\n[${dateStr} - ${service_name ?? "Atendimento"}]: ${parsed.data.notes}`;

    const { error: notesError } = await updateClient(FIXED_TENANT_ID, client_id, {
      observacoes_gerais: currentNotes + newEntry,
    });

    const mappedNotesError = mapSupabaseError(notesError);
    if (mappedNotesError) return fail(mappedNotesError);
  }

  const { data: existingTransaction, error: existingError } = await getTransactionByAppointmentId(
    FIXED_TENANT_ID,
    parsed.data.appointmentId
  );
  const mappedExistingError = mapSupabaseError(existingError);
  if (mappedExistingError) return fail(mappedExistingError);

  if (!existingTransaction) {
    const { error: transactionError } = await insertTransaction({
      tenant_id: FIXED_TENANT_ID,
      appointment_id: parsed.data.appointmentId,
      type: "income",
      category: "Serviço",
      description: `Recebimento Agendamento #${parsed.data.appointmentId.slice(0, 8)}`,
      amount: parsed.data.finalAmount,
      payment_method: parsed.data.paymentMethod,
    });

    if (transactionError) {
      console.error("Erro ao salvar transação:", transactionError);
    }
  }

  const supabase = createServiceClient();
  await supabase
    .from("appointment_attendances")
    .update({
      timer_status: "finished",
      actual_seconds: parsed.data.actualDurationMinutes
        ? parsed.data.actualDurationMinutes * 60
        : updatedAppointment.actual_duration_minutes
          ? updatedAppointment.actual_duration_minutes * 60
          : undefined,
    })
    .eq("appointment_id", parsed.data.appointmentId);

  revalidatePath("/");
  revalidatePath("/caixa");

  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function createShiftBlocksOperation(
  type: "even" | "odd",
  monthStr: string,
  force?: boolean
): Promise<ActionResult<{ count: number; requiresConfirm?: boolean; conflicts?: { blocks: number; appointments: number } }>> {
  const parsed = z
    .object({
      type: z.enum(["even", "odd"]),
      monthStr: z.string().regex(/^\d{4}-\d{2}$/),
    })
    .safeParse({ type, monthStr });

  if (!parsed.success) {
    return fail(new AppError("Parâmetros inválidos para escala", "VALIDATION_ERROR", 400, parsed.error));
  }

  const baseDate = parseISO(`${monthStr}-01`);
  const totalDays = getDaysInMonth(baseDate);
  const blocksToInsert = [];
  const selectedDays: string[] = [];
  const monthStart = startOfDay(setDate(baseDate, 1)).toISOString();
  const monthEnd = endOfDay(setDate(baseDate, totalDays)).toISOString();

  const { data: existingBlocks } = await listAvailabilityBlocksInRange(FIXED_TENANT_ID, monthStart, monthEnd);
  const shiftBlocks = (existingBlocks ?? []).filter((block) => (block as { block_type?: string | null }).block_type === "shift");

  const { data: existingAppointments } = await listAppointmentsInRange(FIXED_TENANT_ID, monthStart, monthEnd);
  const appointmentDays = new Set(
    (existingAppointments ?? []).map((appt) => format(new Date(appt.start_time), "yyyy-MM-dd"))
  );

  for (let day = 1; day <= totalDays; day++) {
    const isEven = day % 2 === 0;
    const isOdd = !isEven;

    if ((type === "even" && isEven) || (type === "odd" && isOdd)) {
      const currentDay = setDate(baseDate, day);
      const start = startOfDay(currentDay);
      const end = endOfDay(currentDay);

      const dayKey = format(currentDay, "yyyy-MM-dd");
      selectedDays.push(dayKey);
      if (!shiftBlocks.some((block) => format(new Date(block.start_time), "yyyy-MM-dd") === dayKey)) {
        blocksToInsert.push({
          tenant_id: FIXED_TENANT_ID,
          title: "Plantão",
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          reason: "Plantão",
          block_type: "shift",
          is_full_day: true,
        });
      }
    }
  }
  const conflictingAppointments = selectedDays.filter((day) => appointmentDays.has(day)).length;

  if (conflictingAppointments > 0 && !force) {
    return ok({
      count: 0,
      requiresConfirm: true,
      conflicts: { blocks: 0, appointments: conflictingAppointments },
    });
  }

  if (selectedDays.length > 0) {
    const { error: clearError } = await deleteAvailabilityBlocksInRange(FIXED_TENANT_ID, monthStart, monthEnd, "shift");
    const mappedClearError = mapSupabaseError(clearError);
    if (mappedClearError) return fail(mappedClearError);
  }

  if (blocksToInsert.length > 0) {
    const { error } = await insertAvailabilityBlocks(blocksToInsert);
    const mappedError = mapSupabaseError(error);
    if (mappedError) return fail(mappedError);
  }

  try {
    revalidatePath("/");
  } catch (error) {
    console.error("[CreateShift] Revalidate Error:", error);
  }

  return ok({ count: blocksToInsert.length });
}

export async function clearMonthBlocksOperation(monthStr: string): Promise<ActionResult<{ month: string }>> {
  const parsed = z.object({ monthStr: z.string().regex(/^\d{4}-\d{2}$/) }).safeParse({ monthStr });
  if (!parsed.success) {
    return fail(new AppError("Parâmetros inválidos para limpeza de escala", "VALIDATION_ERROR", 400, parsed.error));
  }

  const baseDate = parseISO(`${monthStr}-01`);
  const startOfMonth = startOfDay(setDate(baseDate, 1)).toISOString();
  const lastDay = getDaysInMonth(baseDate);
  const endOfMonth = endOfDay(setDate(baseDate, lastDay)).toISOString();

  const { error } = await deleteAvailabilityBlocksInRange(FIXED_TENANT_ID, startOfMonth, endOfMonth, "shift");
  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath("/");
  return ok({ month: monthStr });
}
