"use server";

import { endOfDay, format, getDaysInMonth, parseISO, setDate, startOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  listAppointmentsInRange,
  listAvailabilityBlocksInRange,
  updateAppointment,
  updateAppointmentReturning,
} from "./repository";

export async function startAppointment(id: string): Promise<ActionResult<{ id: string }>> {
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
      current_stage: "session",
      pre_status: "done",
      session_status: "in_progress",
      checkout_status: "locked",
      post_status: "locked",
      timer_status: "running",
      timer_started_at: timerStartedAt,
      timer_paused_at: null,
    },
    { onConflict: "appointment_id" }
  );

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
      pre_status: "done",
      session_status: "done",
      checkout_status: "done",
      post_status: "done",
      timer_status: "finished",
      actual_seconds: updatedAppointment.actual_duration_minutes
        ? updatedAppointment.actual_duration_minutes * 60
        : undefined,
      current_stage: "hub",
    })
    .eq("appointment_id", id);

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

  const supabase = createServiceClient();
  await supabase
    .from("appointment_attendances")
    .update({
      pre_status: "locked",
      session_status: "locked",
      checkout_status: "locked",
      post_status: "locked",
      stage_lock_reason: "cancelled",
      current_stage: "hub",
    })
    .eq("appointment_id", id);

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
  const clientPhone = (formData.get("clientPhone") as string | null) || null;
  const serviceId = formData.get("serviceId") as string | null;
  const date = formData.get("date") as string | null;
  const time = formData.get("time") as string | null;
  const isHomeVisit = formData.get("is_home_visit") === "on";
  const addressCep = (formData.get("address_cep") as string | null) || null;
  const addressLogradouro = (formData.get("address_logradouro") as string | null) || null;
  const addressNumero = (formData.get("address_numero") as string | null) || null;
  const addressComplemento = (formData.get("address_complemento") as string | null) || null;
  const addressBairro = (formData.get("address_bairro") as string | null) || null;
  const addressCidade = (formData.get("address_cidade") as string | null) || null;
  const addressEstado = (formData.get("address_estado") as string | null) || null;
  const internalNotes = (formData.get("internalNotes") as string | null) || null;

  const parsed = createInternalAppointmentSchema.safeParse({
    clientName,
    clientPhone,
    addressCep,
    addressLogradouro,
    addressNumero,
    addressComplemento,
    addressBairro,
    addressCidade,
    addressEstado,
    isHomeVisit,
    internalNotes,
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
    p_start_time: startDateTime.toISOString(),
    client_name: parsed.data.clientName,
    client_phone: parsed.data.clientPhone ?? undefined,
    p_address_cep: parsed.data.addressCep ?? undefined,
    p_address_logradouro: parsed.data.addressLogradouro ?? undefined,
    p_address_numero: parsed.data.addressNumero ?? undefined,
    p_address_complemento: parsed.data.addressComplemento ?? undefined,
    p_address_bairro: parsed.data.addressBairro ?? undefined,
    p_address_cidade: parsed.data.addressCidade ?? undefined,
    p_address_estado: parsed.data.addressEstado ?? undefined,
    is_home_visit: parsed.data.isHomeVisit ?? false,
    p_internal_notes: parsed.data.internalNotes ?? undefined,
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
  redirect(`/?date=${parsed.data.date}&created=1`);
}

export async function submitPublicAppointment(data: {
  tenantSlug: string;
  serviceId: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  isHomeVisit?: boolean;
  addressCep?: string;
  addressLogradouro?: string;
  addressNumero?: string;
  addressComplemento?: string;
  addressBairro?: string;
  addressCidade?: string;
  addressEstado?: string;
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
    p_start_time: startDateTime.toISOString(),
    client_name: parsed.data.clientName,
    client_phone: parsed.data.clientPhone,
    p_address_cep: parsed.data.addressCep || undefined,
    p_address_logradouro: parsed.data.addressLogradouro || undefined,
    p_address_numero: parsed.data.addressNumero || undefined,
    p_address_complemento: parsed.data.addressComplemento || undefined,
    p_address_bairro: parsed.data.addressBairro || undefined,
    p_address_cidade: parsed.data.addressCidade || undefined,
    p_address_estado: parsed.data.addressEstado || undefined,
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
  actualDurationMinutes?: number | null;
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
      pre_status: "done",
      session_status: "done",
      checkout_status: "done",
      post_status: "done",
      timer_status: "finished",
      actual_seconds: parsed.data.actualDurationMinutes
        ? parsed.data.actualDurationMinutes * 60
        : updatedAppointment.actual_duration_minutes
          ? updatedAppointment.actual_duration_minutes * 60
          : undefined,
      current_stage: "hub",
    })
    .eq("appointment_id", parsed.data.appointmentId);

  revalidatePath("/");
  revalidatePath("/caixa");

  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function createShiftBlocks(
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
  const existingBlockDays = new Set(
    (existingBlocks ?? []).map((block) => format(new Date(block.start_time), "yyyy-MM-dd"))
  );

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
      if (!existingBlockDays.has(dayKey)) {
        blocksToInsert.push({
          tenant_id: FIXED_TENANT_ID,
          title: "Bloqueio",
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          reason: "Bloqueio",
        });
      }
    }
  }

  const conflictingBlocks = selectedDays.filter((day) => existingBlockDays.has(day)).length;
  const conflictingAppointments = selectedDays.filter((day) => appointmentDays.has(day)).length;

  if ((conflictingBlocks > 0 || conflictingAppointments > 0) && !force) {
    return ok({
      count: 0,
      requiresConfirm: true,
      conflicts: { blocks: conflictingBlocks, appointments: conflictingAppointments },
    });
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
  const parsed = z.object({ monthStr: z.string().regex(/^\d{4}-\d{2}$/) }).safeParse({ monthStr });
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
