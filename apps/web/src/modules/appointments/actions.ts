"use server";

import { addMinutes, parseISO } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { createServiceClient } from "../../../lib/supabase/service";
import { AppError } from "../../shared/errors/AppError";
import { mapSupabaseError } from "../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import { insertAttendanceEvent } from "../../../lib/attendance/attendance-repository";
import { computeTotals } from "../../../lib/attendance/attendance-domain";
import {
  cancelAppointmentSchema,
  createInternalAppointmentSchema,
  finishAppointmentSchema,
  startAppointmentSchema,
} from "../../shared/validation/appointments";
import { z } from "zod";
import {
  createClient as createClientRecord,
  findClientByCpf,
  findClientByNamePhone,
  updateClient,
} from "../clients/repository";
import { buildClientNameColumnsProfile } from "../clients/name-profile";
import { getTransactionByAppointmentId, insertTransaction } from "../finance/repository";
import {
  scheduleAppointmentCanceledNotification,
  scheduleAppointmentLifecycleNotifications,
} from "../notifications/whatsapp-automation";
import { BRAZIL_TZ_OFFSET } from "../../shared/timezone";
import { estimateDisplacementFromAddress } from "../../shared/displacement/service";
import {
  submitPublicAppointmentAction,
  type SubmitPublicAppointmentInput,
} from "./public-booking";
import {
  isValidEmailAddress,
  normalizeCheckoutDiscountType,
  normalizeCpfDigits,
  parseDecimalInput,
  parseInitialFinanceExtraItems,
  resolveBuffer,
  toBrazilDateTime,
} from "./actions.helpers";
import {
  listAppointmentsInRange,
  listAvailabilityBlocksInRange,
  updateAppointment,
  updateAppointmentReturning,
} from "./repository";
import {
  clearMonthBlocksOperation,
  createShiftBlocksOperation,
  finishAdminAppointmentOperation,
  type FinishAppointmentParams,
} from "./admin-operations";

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

export async function cancelAppointment(
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

export async function createAppointment(
  formData: FormData
): Promise<void | { appointmentId: string; date: string; startTimeIso: string }> {
  const responseMode = ((formData.get("response_mode") as string | null) || "").trim() === "json" ? "json" : "redirect";
  const deferLifecycleNotifications = formData.get("defer_lifecycle_notifications") === "1";
  const skipManualCreatedMessage = formData.get("skip_manual_created_message") === "1";
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
  const rawCheckoutServiceAmount = (formData.get("checkout_service_amount") as string | null) || null;
  const rawInitialCheckoutDiscountValue =
    (formData.get("initial_checkout_discount_value") as string | null) || null;
  const initialCheckoutDiscountType = normalizeCheckoutDiscountType(
    (formData.get("initial_checkout_discount_type") as string | null) || null
  );
  const initialCheckoutDiscountReason =
    ((formData.get("initial_checkout_discount_reason") as string | null) || "").trim() || null;
  const financeExtraItems = parseInitialFinanceExtraItems(
    (formData.get("finance_extra_items_json") as string | null) || null
  );
  const sendCreatedMessage = !skipManualCreatedMessage && formData.get("send_created_message") === "1";
  const sendCreatedMessageText = (formData.get("send_created_message_text") as string | null) || null;
  const isCourtesyAppointment = formData.get("is_courtesy") === "on";
  const rawClientCpf = ((formData.get("client_cpf") as string | null) || "").trim() || null;
  const clientCpf = normalizeCpfDigits(rawClientCpf);
  const clientFirstName = ((formData.get("client_first_name") as string | null) || "").trim();
  const clientLastName = ((formData.get("client_last_name") as string | null) || "").trim();
  const clientReference = ((formData.get("client_reference") as string | null) || "").trim();
  const rawClientEmail = ((formData.get("client_email") as string | null) || "").trim();
  const clientEmail = rawClientEmail ? rawClientEmail.toLowerCase() : null;
  if (rawClientCpf && (!clientCpf || clientCpf.length !== 11)) {
    throw new AppError("CPF inválido. Informe os 11 números do CPF.", "VALIDATION_ERROR", 400);
  }
  if (clientEmail && !isValidEmailAddress(clientEmail)) {
    throw new AppError("Email inválido. Verifique e tente novamente.", "VALIDATION_ERROR", 400);
  }

  const priceOverride = parseDecimalInput(rawPriceOverride);
  const displacementFee = parseDecimalInput(rawDisplacementFee);
  const displacementDistanceKm = parseDecimalInput(rawDisplacementDistanceKm);
  const checkoutServiceAmount = parseDecimalInput(rawCheckoutServiceAmount);
  const initialCheckoutDiscountValue = parseDecimalInput(rawInitialCheckoutDiscountValue);
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

  const newClientNameColumns =
    clientFirstName && clientLastName
      ? buildClientNameColumnsProfile({
          publicFirstName: clientFirstName,
          publicLastName: clientLastName,
          reference: clientReference || null,
        })
      : undefined;

  if (clientCpf) {
    const { data: cpfClient, error: cpfClientLookupError } = await findClientByCpf(FIXED_TENANT_ID, clientCpf);
    const mappedCpfLookupError = mapSupabaseError(cpfClientLookupError);
    if (mappedCpfLookupError) throw mappedCpfLookupError;

    if (cpfClient?.id) {
      if (!resolvedClientId) {
        resolvedClientId = cpfClient.id;
      } else if (resolvedClientId !== cpfClient.id) {
        throw new AppError(
          `CPF já cadastrado para o cliente ${cpfClient.name}. Vincule o agendamento ao cliente existente ou informe outro CPF.`,
          "CONFLICT",
          409
        );
      }
    }
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
    let appointmentClientId: string | null = null;
    let appointmentServiceName: string | null = null;
    let appointmentStoredPrice = 0;
    let appointmentStoredDisplacementFee = 0;
    let appointmentIsHomeVisit = false;

    if (
      clientCpf ||
      clientEmail ||
      newClientNameColumns ||
      checkoutServiceAmount !== null ||
      initialCheckoutDiscountValue !== null ||
      financeExtraItems.length > 0
    ) {
      const { data: appointmentClientRow } = await supabase
        .from("appointments")
        .select("client_id, service_name, price, displacement_fee, is_home_visit")
        .eq("tenant_id", tenantId)
        .eq("id", appointmentId)
        .maybeSingle();
      appointmentClientId = appointmentClientRow?.client_id ?? null;
      appointmentServiceName = appointmentClientRow?.service_name ?? null;
      appointmentStoredPrice = Number(appointmentClientRow?.price ?? 0);
      appointmentStoredDisplacementFee = Number(appointmentClientRow?.displacement_fee ?? 0);
      appointmentIsHomeVisit = Boolean(appointmentClientRow?.is_home_visit);
    }

    const checkoutFeeAmount = appointmentIsHomeVisit ? Math.max(0, appointmentStoredDisplacementFee) : 0;
    const checkoutServiceBaseAmount = Math.max(
      0,
      checkoutServiceAmount ?? Math.max(appointmentStoredPrice - checkoutFeeAmount, 0)
    );
    const normalizedInitialDiscount = Math.max(0, initialCheckoutDiscountValue ?? 0);
    const normalizedInitialDiscountType =
      normalizedInitialDiscount > 0 ? (initialCheckoutDiscountType ?? "value") : null;
    const checkoutTotals = computeTotals({
      items: [
        { amount: checkoutServiceBaseAmount, qty: 1 },
        ...(checkoutFeeAmount > 0 ? [{ amount: checkoutFeeAmount, qty: 1 }] : []),
        ...financeExtraItems.map((item) => ({ amount: item.amount, qty: item.qty })),
      ],
      discountType: normalizedInitialDiscountType,
      discountValue: normalizedInitialDiscount > 0 ? normalizedInitialDiscount : null,
    });

    const { error: checkoutUpsertError } = await supabase.from("appointment_checkout").upsert(
      {
        appointment_id: appointmentId,
        tenant_id: tenantId,
        discount_type: normalizedInitialDiscountType,
        discount_value: normalizedInitialDiscount > 0 ? normalizedInitialDiscount : null,
        discount_reason: normalizedInitialDiscount > 0 ? initialCheckoutDiscountReason : null,
        subtotal: checkoutTotals.subtotal,
        total: checkoutTotals.total,
      },
      { onConflict: "appointment_id" }
    );
    const mappedCheckoutUpsertError = mapSupabaseError(checkoutUpsertError);
    if (mappedCheckoutUpsertError) throw mappedCheckoutUpsertError;

    const { error: checkoutItemsDeleteError } = await supabase
      .from("appointment_checkout_items")
      .delete()
      .eq("appointment_id", appointmentId);
    const mappedCheckoutItemsDeleteError = mapSupabaseError(checkoutItemsDeleteError);
    if (mappedCheckoutItemsDeleteError) throw mappedCheckoutItemsDeleteError;

    const checkoutItems = [
      {
        appointment_id: appointmentId,
        tenant_id: tenantId,
        type: "service",
        label: appointmentServiceName || "Serviço",
        qty: 1,
        amount: checkoutServiceBaseAmount,
        sort_order: 1,
        metadata: null,
      },
      ...(checkoutFeeAmount > 0
        ? [
            {
              appointment_id: appointmentId,
              tenant_id: tenantId,
              type: "fee",
              label: "Taxa deslocamento",
              qty: 1,
              amount: checkoutFeeAmount,
              sort_order: 2,
              metadata: null,
            },
          ]
        : []),
      ...financeExtraItems.map((item, index) => ({
        appointment_id: appointmentId,
        tenant_id: tenantId,
        type: item.type,
        label: item.label,
        qty: item.qty,
        amount: item.amount,
        sort_order: (checkoutFeeAmount > 0 ? 3 : 2) + index,
        metadata: null,
      })),
    ];

    const { error: checkoutItemsError } = await supabase.from("appointment_checkout_items").insert(checkoutItems);
    const mappedCheckoutItemsError = mapSupabaseError(checkoutItemsError);
    if (mappedCheckoutItemsError) throw mappedCheckoutItemsError;

    if (appointmentClientId && (clientCpf || clientEmail || newClientNameColumns)) {
      const { data: clientRow } = await supabase
        .from("clients")
        .select("cpf, email, public_first_name, public_last_name, internal_reference")
        .eq("tenant_id", tenantId)
        .eq("id", appointmentClientId)
        .maybeSingle();

      const { error: clientMetaError } = await updateClient(tenantId, appointmentClientId, {
        cpf: clientCpf ?? clientRow?.cpf ?? null,
        email: clientEmail ?? clientRow?.email ?? null,
        public_first_name: newClientNameColumns?.public_first_name ?? clientRow?.public_first_name ?? null,
        public_last_name: newClientNameColumns?.public_last_name ?? clientRow?.public_last_name ?? null,
        internal_reference: newClientNameColumns?.internal_reference ?? clientRow?.internal_reference ?? null,
      });
      const mappedClientMetaError = mapSupabaseError(clientMetaError);
      if (mappedClientMetaError) throw mappedClientMetaError;
    }

    if (isCourtesyAppointment) {
      const { error: courtesyUpdateError } = await updateAppointment(tenantId, appointmentId, {
        payment_status: "waived",
      });
      const mappedCourtesyUpdateError = mapSupabaseError(courtesyUpdateError);
      if (mappedCourtesyUpdateError) throw mappedCourtesyUpdateError;
    }

    if (!deferLifecycleNotifications) {
      await scheduleAppointmentLifecycleNotifications({
        tenantId,
        appointmentId,
        startTimeIso: startDateTime.toISOString(),
        source: "admin_create",
      });
    }

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
  if (responseMode === "json" && appointmentId) {
    return {
      appointmentId,
      date: parsed.data.date,
      startTimeIso: startDateTime.toISOString(),
    };
  }
  redirect(`/?view=day&date=${parsed.data.date}&created=1`);
}

export async function triggerCreatedNotificationsForAppointment(payload: {
  appointmentId: string;
  startTimeIso: string;
  source?: string | null;
}): Promise<ActionResult<{ appointmentId: string; scheduled: boolean }>> {
  const parsed = z
    .object({
      appointmentId: z.string().uuid(),
      startTimeIso: z.string().datetime(),
      source: z.string().trim().min(1).max(80).optional().nullable(),
    })
    .safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .select("id, client_id, clients ( phone )")
    .eq("tenant_id", FIXED_TENANT_ID)
    .eq("id", parsed.data.appointmentId)
    .maybeSingle();

  const mappedAppointmentError = mapSupabaseError(appointmentError);
  if (mappedAppointmentError) return fail(mappedAppointmentError);
  if (!appointment) {
    return fail(new AppError("Agendamento não encontrado", "NOT_FOUND", 404));
  }

  const clientRelation =
    appointment && typeof appointment === "object" && "clients" in appointment
      ? (appointment.clients as { phone?: string | null } | Array<{ phone?: string | null }> | null | undefined)
      : null;
  const clientPhone = Array.isArray(clientRelation)
    ? (clientRelation[0]?.phone ?? null)
    : (clientRelation?.phone ?? null);
  const hasPhone = Boolean((clientPhone ?? "").replace(/\D/g, ""));

  if (!hasPhone) {
    await supabase.from("appointment_messages").insert({
      appointment_id: parsed.data.appointmentId,
      tenant_id: FIXED_TENANT_ID,
      type: "created_confirmation",
      status: "failed",
      payload: {
        automation: {
          skipped_reason: "missing_phone",
          skipped_reason_label: "Cliente sem WhatsApp/telefone cadastrado para automação.",
          checked_at: new Date().toISOString(),
        },
      },
    });

    return ok({ appointmentId: parsed.data.appointmentId, scheduled: false });
  }

  await scheduleAppointmentLifecycleNotifications({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    startTimeIso: parsed.data.startTimeIso,
    source: "admin_create",
  });

  return ok({ appointmentId: parsed.data.appointmentId, scheduled: true });
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

export async function submitPublicAppointment(
  data: SubmitPublicAppointmentInput
): Promise<ActionResult<{ appointmentId: string | null }>> {
  return submitPublicAppointmentAction(data);
}

export async function finishAdminAppointment(
  payload: FinishAppointmentParams
): Promise<ActionResult<{ appointmentId: string }>> {
  return finishAdminAppointmentOperation(payload);
}

export async function createShiftBlocks(
  type: "even" | "odd",
  monthStr: string,
  force?: boolean
): Promise<ActionResult<{ count: number; requiresConfirm?: boolean; conflicts?: { blocks: number; appointments: number } }>> {
  return createShiftBlocksOperation(type, monthStr, force);
}

export async function clearMonthBlocks(monthStr: string): Promise<ActionResult<{ month: string }>> {
  return clearMonthBlocksOperation(monthStr);
}
