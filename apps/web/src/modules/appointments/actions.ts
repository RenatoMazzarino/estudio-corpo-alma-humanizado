"use server";

import { addMinutes, endOfDay, format, getDaysInMonth, parseISO, setDate, startOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";
import { AppError } from "../../shared/errors/AppError";
import { mapSupabaseError } from "../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import { insertAttendanceEvent } from "../../../lib/attendance/attendance-repository";
import {
  cancelAppointmentSchema,
  createInternalAppointmentSchema,
  finishAdminAppointmentSchema,
  finishAppointmentSchema,
  publicBookingSchema,
  startAppointmentSchema,
} from "../../shared/validation/appointments";
import { z } from "zod";
import {
  createClient as createClientRecord,
  findClientByNamePhone,
  getClientById,
  updateClient,
} from "../clients/repository";
import { getTransactionByAppointmentId, insertTransaction } from "../finance/repository";
import { insertNotificationJob } from "../notifications/repository";
import { getTenantBySlug } from "../settings/repository";
import { BRAZIL_TZ_OFFSET } from "../../shared/timezone";
import { estimateDisplacementFromAddress } from "../../shared/displacement/service";
import {
  deleteAvailabilityBlocksInRange,
  insertAvailabilityBlocks,
  listAppointmentsInRange,
  listAvailabilityBlocksInRange,
  updateAppointment,
  updateAppointmentReturning,
} from "./repository";

const toBrazilDateTime = (date: string, time: string) => new Date(`${date}T${time}:00${BRAZIL_TZ_OFFSET}`);

const resolveBuffer = (...values: Array<number | null | undefined>) => {
  const positive = values.find((value) => typeof value === "number" && value > 0);
  if (positive !== undefined) return positive;
  return 0;
};

const parseDecimalInput = (value: string | null) => {
  if (!value) return null;
  const cleaned = value.trim().replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;

  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

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
  const clientId = (formData.get("clientId") as string | null) || null;
  const clientName = formData.get("clientName") as string | null;
  const clientPhone = (formData.get("clientPhone") as string | null) || null;
  const serviceId = formData.get("serviceId") as string | null;
  const date = formData.get("date") as string | null;
  const time = formData.get("time") as string | null;
  const isHomeVisit = formData.get("is_home_visit") === "on";
  const clientAddressId = (formData.get("client_address_id") as string | null) || null;
  const addressCep = (formData.get("address_cep") as string | null) || null;
  const addressLogradouro = (formData.get("address_logradouro") as string | null) || null;
  const addressNumero = (formData.get("address_numero") as string | null) || null;
  const addressComplemento = (formData.get("address_complemento") as string | null) || null;
  const addressBairro = (formData.get("address_bairro") as string | null) || null;
  const addressCidade = (formData.get("address_cidade") as string | null) || null;
  const addressEstado = (formData.get("address_estado") as string | null) || null;
  const addressLabel = (formData.get("address_label") as string | null) || null;
  const internalNotes = (formData.get("internalNotes") as string | null) || null;
  const rawPriceOverride = (formData.get("price_override") as string | null) || null;
  const rawDisplacementFee = (formData.get("displacement_fee") as string | null) || null;
  const rawDisplacementDistanceKm =
    (formData.get("displacement_distance_km") as string | null) || null;
  const sendCreatedMessage = formData.get("send_created_message") === "1";
  const sendCreatedMessageText = (formData.get("send_created_message_text") as string | null) || null;

  const priceOverride = parseDecimalInput(rawPriceOverride);
  const displacementFee = parseDecimalInput(rawDisplacementFee);
  const displacementDistanceKm = parseDecimalInput(rawDisplacementDistanceKm);

  const parsed = createInternalAppointmentSchema.safeParse({
    clientId,
    clientName,
    clientPhone,
    addressCep,
    addressLogradouro,
    addressNumero,
    addressComplemento,
    addressBairro,
    addressCidade,
    addressEstado,
    addressLabel,
    clientAddressId,
    isHomeVisit,
    internalNotes,
    priceOverride,
    displacementFee,
    displacementDistanceKm,
    serviceId,
    date,
    time,
  });

  if (!parsed.success) {
    throw new AppError("Dados incompletos", "VALIDATION_ERROR", 400, parsed.error);
  }

  let resolvedClientId = parsed.data.clientId ?? null;
  if (!resolvedClientId && parsed.data.clientName && parsed.data.clientPhone) {
    const { data: existingClient } = await findClientByNamePhone(
      FIXED_TENANT_ID,
      parsed.data.clientName,
      parsed.data.clientPhone
    );
    resolvedClientId = existingClient?.id ?? null;
  }

  const startDateTime = toBrazilDateTime(parsed.data.date, parsed.data.time);
  const supabase = createServiceClient();

  let displacementFeeValue = Math.max(0, parsed.data.displacementFee ?? 0);
  let displacementDistanceKmValue = parsed.data.displacementDistanceKm ?? null;

  if (parsed.data.isHomeVisit) {
    let displacementAddress = {
      cep: parsed.data.addressCep,
      logradouro: parsed.data.addressLogradouro,
      numero: parsed.data.addressNumero,
      complemento: parsed.data.addressComplemento,
      bairro: parsed.data.addressBairro,
      cidade: parsed.data.addressCidade,
      estado: parsed.data.addressEstado,
    };

    if (parsed.data.clientAddressId) {
      const { data: addressData } = await supabase
        .from("client_addresses")
        .select(
          "address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado"
        )
        .eq("id", parsed.data.clientAddressId)
        .maybeSingle();

      if (addressData) {
        displacementAddress = {
          cep: addressData.address_cep,
          logradouro: addressData.address_logradouro,
          numero: addressData.address_numero,
          complemento: addressData.address_complemento,
          bairro: addressData.address_bairro,
          cidade: addressData.address_cidade,
          estado: addressData.address_estado,
        };
      }
    }

    try {
      const estimate = await estimateDisplacementFromAddress(displacementAddress);
      displacementDistanceKmValue = estimate.distanceKm;
      displacementFeeValue =
        parsed.data.displacementFee !== null && parsed.data.displacementFee !== undefined
          ? Math.max(0, parsed.data.displacementFee)
          : estimate.fee;
    } catch (error) {
      if (parsed.data.displacementFee === null || parsed.data.displacementFee === undefined) {
        throw new AppError(
          error instanceof Error
            ? error.message
            : "Não foi possível calcular a taxa de deslocamento para o endereço informado.",
          "VALIDATION_ERROR",
          422
        );
      }
      displacementFeeValue = Math.max(0, parsed.data.displacementFee);
      displacementDistanceKmValue = parsed.data.displacementDistanceKm ?? null;
    }
  } else {
    displacementFeeValue = 0;
    displacementDistanceKmValue = null;
  }

  const { data: appointmentId, error: appointmentError } = (await supabase.rpc(
    "create_internal_appointment",
    {
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
      p_address_label: parsed.data.addressLabel ?? undefined,
      is_home_visit: parsed.data.isHomeVisit ?? false,
      p_internal_notes: parsed.data.internalNotes ?? undefined,
      p_client_id: resolvedClientId ?? undefined,
      p_client_address_id: parsed.data.clientAddressId ?? undefined,
      p_price_override: parsed.data.priceOverride ?? undefined,
      p_displacement_fee: displacementFeeValue,
      p_displacement_distance_km: displacementDistanceKmValue ?? undefined,
    }
  )) as { data: string | null; error: PostgrestError | null };

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

    if (sendCreatedMessage) {
      const supabase = createServiceClient();
      await supabase.from("appointment_messages").insert({
        appointment_id: appointmentId,
        tenant_id: tenantId,
        type: "created_confirmation",
        status: "sent_manual",
        sent_at: new Date().toISOString(),
        payload: sendCreatedMessageText ? { message: sendCreatedMessageText } : null,
      });

      await insertAttendanceEvent({
        tenantId,
        appointmentId,
        eventType: "message_sent",
        payload: { type: "created_confirmation", channel: "manual" },
      });
    }
  }

  revalidatePath(`/?view=day&date=${parsed.data.date}`);
  redirect(`/?view=day&date=${parsed.data.date}&created=1`);
}

export async function updateInternalAppointment(formData: FormData): Promise<void> {
  const appointmentId = (formData.get("appointmentId") as string | null) || null;
  const clientId = (formData.get("clientId") as string | null) || null;
  const clientName = formData.get("clientName") as string | null;
  const clientPhone = (formData.get("clientPhone") as string | null) || null;
  const serviceId = formData.get("serviceId") as string | null;
  const date = formData.get("date") as string | null;
  const time = formData.get("time") as string | null;
  const isHomeVisit = formData.get("is_home_visit") === "on";
  const clientAddressId = (formData.get("client_address_id") as string | null) || null;
  const addressCep = (formData.get("address_cep") as string | null) || null;
  const addressLogradouro = (formData.get("address_logradouro") as string | null) || null;
  const addressNumero = (formData.get("address_numero") as string | null) || null;
  const addressComplemento = (formData.get("address_complemento") as string | null) || null;
  const addressBairro = (formData.get("address_bairro") as string | null) || null;
  const addressCidade = (formData.get("address_cidade") as string | null) || null;
  const addressEstado = (formData.get("address_estado") as string | null) || null;
  const addressLabel = (formData.get("address_label") as string | null) || null;
  const internalNotes = (formData.get("internalNotes") as string | null) || null;
  const rawPriceOverride = (formData.get("price_override") as string | null) || null;
  const rawDisplacementFee = (formData.get("displacement_fee") as string | null) || null;
  const rawDisplacementDistanceKm =
    (formData.get("displacement_distance_km") as string | null) || null;
  const returnTo = (formData.get("returnTo") as string | null) || null;

  const priceOverride = parseDecimalInput(rawPriceOverride);
  const displacementFee = parseDecimalInput(rawDisplacementFee);
  const displacementDistanceKm = parseDecimalInput(rawDisplacementDistanceKm);

  const parsed = createInternalAppointmentSchema
    .extend({ appointmentId: z.string().uuid() })
    .safeParse({
      appointmentId,
      clientId,
      clientName,
      clientPhone,
      addressCep,
      addressLogradouro,
      addressNumero,
      addressComplemento,
      addressBairro,
      addressCidade,
      addressEstado,
      addressLabel,
      clientAddressId,
      isHomeVisit,
      internalNotes,
      priceOverride,
      displacementFee,
      displacementDistanceKm,
      serviceId,
      date,
      time,
    });

  if (!parsed.success) {
    throw new AppError("Dados incompletos", "VALIDATION_ERROR", 400, parsed.error);
  }

  const tenantId = FIXED_TENANT_ID;
  const startDateTime = toBrazilDateTime(parsed.data.date, parsed.data.time);
  const supabase = createServiceClient();

  const [{ data: service, error: serviceError }, { data: settings, error: settingsError }] = await Promise.all([
    supabase
      .from("services")
      .select(
        "id, name, price, duration_minutes, buffer_before_minutes, buffer_after_minutes, custom_buffer_minutes"
      )
      .eq("tenant_id", tenantId)
      .eq("id", parsed.data.serviceId)
      .single(),
    supabase
      .from("settings")
      .select("default_studio_buffer, default_home_buffer, buffer_before_minutes, buffer_after_minutes")
      .eq("tenant_id", tenantId)
      .single(),
  ]);

  const mappedServiceError = mapSupabaseError(serviceError);
  if (mappedServiceError || !service) {
    throw mappedServiceError ?? new AppError("Serviço inválido", "VALIDATION_ERROR", 400);
  }
  if (settingsError && settingsError.code !== "PGRST116") {
    throw mapSupabaseError(settingsError) ?? new AppError("Erro ao carregar configurações", "SUPABASE_ERROR");
  }

  const durationMinutes = service.duration_minutes ?? 30;
  const bufferBefore = parsed.data.isHomeVisit
    ? resolveBuffer(
        service.buffer_before_minutes,
        settings?.buffer_before_minutes,
        settings?.default_home_buffer,
        service.custom_buffer_minutes,
        settings?.default_studio_buffer,
        30
      )
    : resolveBuffer(
        service.buffer_before_minutes,
        settings?.buffer_before_minutes,
        service.custom_buffer_minutes,
        settings?.default_studio_buffer,
        30
      );
  const bufferAfter = parsed.data.isHomeVisit
    ? resolveBuffer(
        service.buffer_after_minutes,
        settings?.buffer_after_minutes,
        settings?.default_home_buffer,
        service.custom_buffer_minutes,
        settings?.default_studio_buffer,
        30
      )
    : resolveBuffer(
        service.buffer_after_minutes,
        settings?.buffer_after_minutes,
        service.custom_buffer_minutes,
        settings?.default_studio_buffer,
        30
      );
  const safeBufferBefore = bufferBefore ?? 0;
  const safeBufferAfter = bufferAfter ?? 0;

  const finishedAt = addMinutes(startDateTime, durationMinutes);
  const blockStart = addMinutes(startDateTime, -safeBufferBefore);
  const blockEnd = addMinutes(startDateTime, durationMinutes + safeBufferAfter);

  let resolvedClientId = parsed.data.clientId;
  if (!resolvedClientId && parsed.data.clientPhone) {
    const { data: existingClient } = await findClientByNamePhone(
      tenantId,
      parsed.data.clientName,
      parsed.data.clientPhone
    );
    resolvedClientId = existingClient?.id ?? null;
  }

  if (!resolvedClientId) {
    const { data: createdClient, error: createClientError } = await createClientRecord({
      tenant_id: tenantId,
      name: parsed.data.clientName,
      phone: parsed.data.clientPhone ?? null,
      initials: parsed.data.clientName.trim().slice(0, 2).toUpperCase(),
    });
    const mappedClientError = mapSupabaseError(createClientError);
    if (mappedClientError || !createdClient) {
      throw mappedClientError ?? new AppError("Erro ao criar cliente", "SUPABASE_ERROR");
    }
    resolvedClientId = createdClient.id;
  }

  const hasAddressPayload =
    !!addressCep ||
    !!addressLogradouro ||
    !!addressNumero ||
    !!addressComplemento ||
    !!addressBairro ||
    !!addressCidade ||
    !!addressEstado;

  let resolvedAddressId = parsed.data.clientAddressId;
  let resolvedAddress = {
    address_cep: parsed.data.addressCep ?? null,
    address_logradouro: parsed.data.addressLogradouro ?? null,
    address_numero: parsed.data.addressNumero ?? null,
    address_complemento: parsed.data.addressComplemento ?? null,
    address_bairro: parsed.data.addressBairro ?? null,
    address_cidade: parsed.data.addressCidade ?? null,
    address_estado: parsed.data.addressEstado ?? null,
  };

  if (resolvedAddressId) {
    const { data: addressData, error: addressError } = await supabase
      .from("client_addresses")
      .select(
        "id, address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado"
      )
      .eq("id", resolvedAddressId)
      .eq("client_id", resolvedClientId)
      .single();
    const mappedAddressError = mapSupabaseError(addressError);
    if (mappedAddressError || !addressData) {
      throw mappedAddressError ?? new AppError("Endereço inválido para cliente", "VALIDATION_ERROR", 400);
    }
    resolvedAddress = {
      address_cep: addressData.address_cep,
      address_logradouro: addressData.address_logradouro,
      address_numero: addressData.address_numero,
      address_complemento: addressData.address_complemento,
      address_bairro: addressData.address_bairro,
      address_cidade: addressData.address_cidade,
      address_estado: addressData.address_estado,
    };
  } else if (parsed.data.isHomeVisit && hasAddressPayload) {
    const { data: insertedAddress, error: addressInsertError } = await supabase
      .from("client_addresses")
      .insert({
        tenant_id: tenantId,
        client_id: resolvedClientId,
        label: addressLabel ?? "Novo endereço",
        is_primary: false,
        address_cep: resolvedAddress.address_cep,
        address_logradouro: resolvedAddress.address_logradouro,
        address_numero: resolvedAddress.address_numero,
        address_complemento: resolvedAddress.address_complemento,
        address_bairro: resolvedAddress.address_bairro,
        address_cidade: resolvedAddress.address_cidade,
        address_estado: resolvedAddress.address_estado,
      })
      .select("id")
      .single();
    const mappedInsertError = mapSupabaseError(addressInsertError);
    if (mappedInsertError) {
      throw mappedInsertError;
    }
    resolvedAddressId = insertedAddress?.id ?? null;
  }

  if (resolvedClientId && hasAddressPayload) {
    const { error: updateClientError } = await updateClient(tenantId, resolvedClientId, {
      address_cep: resolvedAddress.address_cep,
      address_logradouro: resolvedAddress.address_logradouro,
      address_numero: resolvedAddress.address_numero,
      address_complemento: resolvedAddress.address_complemento,
      address_bairro: resolvedAddress.address_bairro,
      address_cidade: resolvedAddress.address_cidade,
      address_estado: resolvedAddress.address_estado,
    });
    const mappedUpdateError = mapSupabaseError(updateClientError);
    if (mappedUpdateError) throw mappedUpdateError;
  }

  const rangeStart = new Date(`${parsed.data.date}T00:00:00${BRAZIL_TZ_OFFSET}`).toISOString();
  const rangeEnd = new Date(`${parsed.data.date}T23:59:59${BRAZIL_TZ_OFFSET}`).toISOString();
  const [{ data: appointmentsInRange, error: appointmentsError }, { data: blocksInRange, error: blocksError }] =
    await Promise.all([
      listAppointmentsInRange(tenantId, rangeStart, rangeEnd),
      listAvailabilityBlocksInRange(tenantId, rangeStart, rangeEnd),
    ]);
  const mappedAppointmentsError = mapSupabaseError(appointmentsError);
  if (mappedAppointmentsError) throw mappedAppointmentsError;
  const mappedBlocksError = mapSupabaseError(blocksError);
  if (mappedBlocksError) throw mappedBlocksError;

  const overlappingAppointment = (appointmentsInRange ?? [])
    .filter((appt) => appt.id !== parsed.data.appointmentId)
    .filter((appt) => !["canceled_by_client", "canceled_by_studio", "no_show"].includes(appt.status ?? ""))
    .some((appt) => {
      const apptStart = parseISO(appt.start_time);
      const serviceData = Array.isArray(appt.services) ? appt.services[0] ?? null : appt.services;
      const apptDuration =
        serviceData?.duration_minutes ?? appt.total_duration_minutes ?? durationMinutes ?? 30;
      const apptBufferBefore = appt.is_home_visit
        ? resolveBuffer(
            serviceData?.buffer_before_minutes,
            settings?.buffer_before_minutes,
            settings?.default_home_buffer,
            serviceData?.custom_buffer_minutes,
            settings?.default_studio_buffer,
            30
          )
        : resolveBuffer(
            serviceData?.buffer_before_minutes,
            settings?.buffer_before_minutes,
            serviceData?.custom_buffer_minutes,
            settings?.default_studio_buffer,
            30
          );
      const apptBufferAfter = appt.is_home_visit
        ? resolveBuffer(
            serviceData?.buffer_after_minutes,
            settings?.buffer_after_minutes,
            settings?.default_home_buffer,
            serviceData?.custom_buffer_minutes,
            settings?.default_studio_buffer,
            30
          )
        : resolveBuffer(
            serviceData?.buffer_after_minutes,
            settings?.buffer_after_minutes,
            serviceData?.custom_buffer_minutes,
            settings?.default_studio_buffer,
            30
          );
      const apptBlockStart = addMinutes(apptStart, -(apptBufferBefore ?? 0));
      const apptBlockEnd = addMinutes(apptStart, apptDuration + (apptBufferAfter ?? 0));
      return apptBlockStart < blockEnd && apptBlockEnd > blockStart;
    });

  if (overlappingAppointment) {
    throw new AppError("Horário indisponível para este agendamento", "CONFLICT", 409);
  }

  const overlappingBlock = (blocksInRange ?? []).some((block) => {
    const blockStartTime = parseISO(block.start_time);
    const blockEndTime = parseISO(block.end_time);
    return blockStartTime < blockEnd && blockEndTime > blockStart;
  });

  if (overlappingBlock) {
    throw new AppError("Horário bloqueado para este agendamento", "CONFLICT", 409);
  }

  let displacementFeeValue = Math.max(0, parsed.data.displacementFee ?? 0);
  let displacementDistanceKmValue = parsed.data.displacementDistanceKm ?? null;

  if (parsed.data.isHomeVisit) {
    const canEstimateDisplacement =
      !!resolvedAddress.address_logradouro &&
      !!resolvedAddress.address_cidade &&
      !!resolvedAddress.address_estado;

    if (canEstimateDisplacement) {
      try {
        const estimate = await estimateDisplacementFromAddress({
          cep: resolvedAddress.address_cep,
          logradouro: resolvedAddress.address_logradouro,
          numero: resolvedAddress.address_numero,
          complemento: resolvedAddress.address_complemento,
          bairro: resolvedAddress.address_bairro,
          cidade: resolvedAddress.address_cidade,
          estado: resolvedAddress.address_estado,
        });
        displacementDistanceKmValue = estimate.distanceKm;
        displacementFeeValue =
          parsed.data.displacementFee !== null && parsed.data.displacementFee !== undefined
            ? Math.max(0, parsed.data.displacementFee)
            : estimate.fee;
      } catch (error) {
        if (parsed.data.displacementFee === null || parsed.data.displacementFee === undefined) {
          throw new AppError(
            error instanceof Error
              ? error.message
              : "Não foi possível calcular a taxa de deslocamento para o endereço informado.",
            "VALIDATION_ERROR",
            422
          );
        }
        displacementFeeValue = Math.max(0, parsed.data.displacementFee);
        displacementDistanceKmValue = parsed.data.displacementDistanceKm ?? null;
      }
    } else if (parsed.data.displacementFee === null || parsed.data.displacementFee === undefined) {
      throw new AppError(
        "Endereço incompleto para calcular taxa de deslocamento.",
        "VALIDATION_ERROR",
        422
      );
    }
  } else {
    displacementFeeValue = 0;
    displacementDistanceKmValue = null;
  }

  const basePrice = (service.price ?? 0) + (parsed.data.isHomeVisit ? displacementFeeValue : 0);
  const finalPrice = parsed.data.priceOverride ?? basePrice;

  const { error: updateError } = await updateAppointment(tenantId, parsed.data.appointmentId, {
    client_id: resolvedClientId,
    client_address_id: resolvedAddressId,
    service_id: service.id,
    service_name: service.name,
    start_time: startDateTime.toISOString(),
    finished_at: finishedAt.toISOString(),
    price: finalPrice,
    price_override: parsed.data.priceOverride ?? null,
    is_home_visit: parsed.data.isHomeVisit ?? false,
    displacement_fee: parsed.data.isHomeVisit ? displacementFeeValue : 0,
    displacement_distance_km: parsed.data.isHomeVisit ? displacementDistanceKmValue : null,
    total_duration_minutes: durationMinutes + safeBufferBefore + safeBufferAfter,
    address_cep: resolvedAddress.address_cep,
    address_logradouro: resolvedAddress.address_logradouro,
    address_numero: resolvedAddress.address_numero,
    address_complemento: resolvedAddress.address_complemento,
    address_bairro: resolvedAddress.address_bairro,
    address_cidade: resolvedAddress.address_cidade,
    address_estado: resolvedAddress.address_estado,
    internal_notes: parsed.data.internalNotes ?? null,
  });

  const mappedUpdateError = mapSupabaseError(updateError);
  if (mappedUpdateError) throw mappedUpdateError;

  revalidatePath(`/?view=day&date=${parsed.data.date}`);
  if (returnTo) {
    redirect(returnTo);
  }
  redirect(`/?view=day&date=${parsed.data.date}`);
}

export async function submitPublicAppointment(data: {
  tenantSlug: string;
  serviceId: string;
  date: string;
  time: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  isHomeVisit?: boolean;
  addressCep?: string;
  addressLogradouro?: string;
  addressNumero?: string;
  addressComplemento?: string;
  addressBairro?: string;
  addressCidade?: string;
  addressEstado?: string;
  displacementFee?: number | null;
  displacementDistanceKm?: number | null;
}): Promise<ActionResult<{ appointmentId: string | null }>> {
  const parsed = publicBookingSchema.safeParse(data);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos para agendamento", "VALIDATION_ERROR", 400, parsed.error));
  }

  const startDateTime = toBrazilDateTime(parsed.data.date, parsed.data.time);
  let displacementFee = 0;
  let displacementDistanceKm: number | null = null;

  if (parsed.data.isHomeVisit) {
    try {
      const estimate = await estimateDisplacementFromAddress({
        cep: parsed.data.addressCep,
        logradouro: parsed.data.addressLogradouro,
        numero: parsed.data.addressNumero,
        complemento: parsed.data.addressComplemento,
        bairro: parsed.data.addressBairro,
        cidade: parsed.data.addressCidade,
        estado: parsed.data.addressEstado,
      });
      displacementFee = estimate.fee;
      displacementDistanceKm = estimate.distanceKm;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível calcular a taxa de deslocamento para esse endereço.";
      return fail(new AppError(message, "VALIDATION_ERROR", 422));
    }
  }

  const supabase = await createClient();
  const { data: appointmentId, error } = await supabase.rpc("create_public_appointment", {
    tenant_slug: parsed.data.tenantSlug,
    service_id: parsed.data.serviceId,
    p_start_time: startDateTime.toISOString(),
    client_name: parsed.data.clientName,
    client_phone: parsed.data.clientPhone,
    p_client_email: parsed.data.clientEmail || undefined,
    p_address_cep: parsed.data.addressCep || undefined,
    p_address_logradouro: parsed.data.addressLogradouro || undefined,
    p_address_numero: parsed.data.addressNumero || undefined,
    p_address_complemento: parsed.data.addressComplemento || undefined,
    p_address_bairro: parsed.data.addressBairro || undefined,
    p_address_cidade: parsed.data.addressCidade || undefined,
    p_address_estado: parsed.data.addressEstado || undefined,
    is_home_visit: parsed.data.isHomeVisit || false,
    p_displacement_fee: displacementFee,
    p_displacement_distance_km: displacementDistanceKm ?? undefined,
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

export async function clearMonthBlocks(monthStr: string): Promise<ActionResult<{ month: string }>> {
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
