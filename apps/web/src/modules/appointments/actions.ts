"use server";

import { endOfDay, format, getDaysInMonth, parseISO, setDate, startOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";
import { AppError } from "../../shared/errors/AppError";
import { mapSupabaseError } from "../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import {
  cancelAppointmentSchema,
  createInternalAppointmentSchema,
  finishAdminAppointmentSchema,
  finishAppointmentSchema,
  publicBookingSchema,
  startAppointmentSchema,
} from "../../shared/validation/appointments";
import { z } from "zod";
import { getClientById, updateClient } from "../clients/repository";
import { getTransactionByAppointmentId, insertTransaction } from "../finance/repository";
import { insertNotificationJob } from "../notifications/repository";
import { getTenantBySlug } from "../settings/repository";
import {
  deleteAvailabilityBlocksInRange,
  insertAvailabilityBlocks,
  updateAppointment,
  updateAppointmentReturning,
} from "./repository";

export async function startAppointment(id: string): Promise<ActionResult<{ id: string }>> {
  const parsed = startAppointmentSchema.safeParse({ id });
  if (!parsed.success) {
    return fail(new AppError("ID inválido", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await updateAppointment(FIXED_TENANT_ID, id, {
    status: "in_progress",
    started_at: new Date().toISOString(),
  });

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath("/");
  return ok({ id });
}

export async function finishAppointment(id: string): Promise<ActionResult<{ id: string }>> {
  const parsed = finishAppointmentSchema.safeParse({ id });
  if (!parsed.success) {
    return fail(new AppError("ID inválido", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { data: updatedAppointment, error } = await updateAppointmentReturning<{
    price: number | null;
    service_name: string | null;
  }>(FIXED_TENANT_ID, id, {
    status: "completed",
    finished_at: new Date().toISOString(),
  }, "price, service_name");

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

  revalidatePath("/");
  revalidatePath("/caixa");
  return ok({ id });
}

export async function cancelAppointment(id: string): Promise<ActionResult<{ id: string }>> {
  const parsed = cancelAppointmentSchema.safeParse({ id });
  if (!parsed.success) {
    return fail(new AppError("ID inválido", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await updateAppointment(FIXED_TENANT_ID, id, {
    status: "canceled_by_studio",
  });

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  await enqueueNotificationJob({
    tenant_id: FIXED_TENANT_ID,
    appointment_id: id,
    type: "appointment_canceled",
    channel: "whatsapp",
    payload: { appointment_id: id },
    status: "pending",
    scheduled_for: new Date().toISOString(),
  });

  revalidatePath("/");
  revalidatePath("/caixa");
  return ok({ id });
}

export async function createAppointment(formData: FormData): Promise<void> {
  const clientName = formData.get("clientName") as string | null;
  const serviceId = formData.get("serviceId") as string | null;
  const date = formData.get("date") as string | null;
  const time = formData.get("time") as string | null;

  const parsed = createInternalAppointmentSchema.safeParse({
    clientName,
    serviceId,
    date,
    time,
  });

  if (!parsed.success) {
    throw new AppError("Dados incompletos", "VALIDATION_ERROR", 400, parsed.error);
  }

  const startDateTime = new Date(`${parsed.data.date}T${parsed.data.time}:00`);
  const supabase = createServiceClient();
  const { data: appointmentId, error: appointmentError } = await supabase.rpc("create_internal_appointment", {
    p_tenant_id: FIXED_TENANT_ID,
    service_id: parsed.data.serviceId,
    start_time: startDateTime.toISOString(),
    client_name: parsed.data.clientName,
    is_home_visit: false,
  });

  const mappedAppointmentError = mapSupabaseError(appointmentError);
  if (mappedAppointmentError) throw mappedAppointmentError;

  if (appointmentId) {
    const tenantId = FIXED_TENANT_ID;

    await enqueueNotificationJob({
      tenant_id: tenantId,
      appointment_id: appointmentId,
      type: "appointment_created",
      channel: "whatsapp",
      payload: {
        appointment_id: appointmentId,
        start_time: startDateTime.toISOString(),
      },
      status: "pending",
      scheduled_for: new Date().toISOString(),
    });

    await enqueueNotificationJob({
      tenant_id: tenantId,
      appointment_id: appointmentId,
      type: "appointment_reminder",
      channel: "whatsapp",
      payload: {
        appointment_id: appointmentId,
        start_time: startDateTime.toISOString(),
      },
      status: "pending",
      scheduled_for: new Date(startDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  revalidatePath(`/?date=${parsed.data.date}`);
}

export async function submitPublicAppointment(data: {
  tenantSlug: string;
  serviceId: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  isHomeVisit?: boolean;
}): Promise<ActionResult<{ appointmentId: string | null }>> {
  const parsed = publicBookingSchema.safeParse(data);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos para agendamento", "VALIDATION_ERROR", 400, parsed.error));
  }

  const startDateTime = new Date(`${parsed.data.date}T${parsed.data.time}:00`);

  const supabase = await createClient();
  const { data: appointmentId, error } = await supabase.rpc("create_public_appointment", {
    tenant_slug: parsed.data.tenantSlug,
    service_id: parsed.data.serviceId,
    start_time: startDateTime.toISOString(),
    client_name: parsed.data.clientName,
    client_phone: parsed.data.clientPhone,
    is_home_visit: parsed.data.isHomeVisit || false,
  });

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  if (appointmentId) {
    const { data: tenant } = await getTenantBySlug(parsed.data.tenantSlug);
    const tenantId = tenant?.id ?? FIXED_TENANT_ID;

    await enqueueNotificationJob({
      tenant_id: tenantId,
      appointment_id: appointmentId,
      type: "appointment_created",
      channel: "whatsapp",
      payload: {
        appointment_id: appointmentId,
        start_time: startDateTime.toISOString(),
      },
      status: "pending",
      scheduled_for: new Date().toISOString(),
    });

    await enqueueNotificationJob({
      tenant_id: tenantId,
      appointment_id: appointmentId,
      type: "appointment_reminder",
      channel: "whatsapp",
      payload: {
        appointment_id: appointmentId,
        start_time: startDateTime.toISOString(),
      },
      status: "pending",
      scheduled_for: new Date(startDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return ok({ appointmentId });
}

async function enqueueNotificationJob(payload: Parameters<typeof insertNotificationJob>[0]) {
  const { error } = await insertNotificationJob(payload);
  if (error) {
    console.error("Erro ao criar job de notificação:", error);
  }
}

interface FinishAppointmentParams {
  appointmentId: string;
  paymentMethod: "pix" | "cash" | "card";
  finalAmount: number;
  notes: string;
}

export async function finishAdminAppointment(
  payload: FinishAppointmentParams
): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = finishAdminAppointmentSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos para finalização", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { data: updatedAppointment, error: appError } = await updateAppointmentReturning<{
    client_id: string | null;
    service_name: string | null;
  }>(
    FIXED_TENANT_ID,
    parsed.data.appointmentId,
    {
      status: "completed",
      payment_status: "paid",
      finished_at: new Date().toISOString(),
      price: parsed.data.finalAmount,
    },
    "client_id, service_name"
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

  revalidatePath("/");
  revalidatePath("/caixa");

  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function createShiftBlocks(
  type: "even" | "odd",
  monthStr: string
): Promise<ActionResult<{ count: number }>> {
  const parsed = z
    .object({
      type: z.enum(["even", "odd"]),
      monthStr: z.string().regex(/^\\d{4}-\\d{2}$/),
    })
    .safeParse({ type, monthStr });

  if (!parsed.success) {
    return fail(new AppError("Parâmetros inválidos para escala", "VALIDATION_ERROR", 400, parsed.error));
  }

  const baseDate = parseISO(`${monthStr}-01`);
  const totalDays = getDaysInMonth(baseDate);
  const blocksToInsert = [];

  for (let day = 1; day <= totalDays; day++) {
    const isEven = day % 2 === 0;
    const isOdd = !isEven;

    if ((type === "even" && isEven) || (type === "odd" && isOdd)) {
      const currentDay = setDate(baseDate, day);
      const start = startOfDay(currentDay);
      const end = endOfDay(currentDay);

      blocksToInsert.push({
        tenant_id: FIXED_TENANT_ID,
        title: "Plantão",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        reason: "Plantão",
      });
    }
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

export async function clearMonthBlocks(monthStr: string): Promise<ActionResult<{ month: string }>> {
  const parsed = z.object({ monthStr: z.string().regex(/^\\d{4}-\\d{2}$/) }).safeParse({ monthStr });
  if (!parsed.success) {
    return fail(new AppError("Parâmetros inválidos para limpeza de escala", "VALIDATION_ERROR", 400, parsed.error));
  }

  const baseDate = parseISO(`${monthStr}-01`);
  const startOfMonth = startOfDay(setDate(baseDate, 1)).toISOString();
  const lastDay = getDaysInMonth(baseDate);
  const endOfMonth = endOfDay(setDate(baseDate, lastDay)).toISOString();

  const { error } = await deleteAvailabilityBlocksInRange(FIXED_TENANT_ID, startOfMonth, endOfMonth);
  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath("/");
  return ok({ month: monthStr });
}
