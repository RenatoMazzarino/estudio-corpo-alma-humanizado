"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { FIXED_TENANT_ID } from "../../../../lib/tenant-context";
import { insertAttendanceEvent } from "../../../../lib/attendance/attendance-repository";
import { computeTotals } from "../../../../lib/attendance/attendance-domain";
import { createServiceClient } from "../../../../lib/supabase/service";
import { AppError } from "../../../shared/errors/AppError";
import { mapSupabaseError } from "../../../shared/errors/mapSupabaseError";
import { createInternalAppointmentSchema } from "../../../shared/validation/appointments";
import { estimateDisplacementFromAddress } from "../../../shared/displacement/service";
import {
  findClientByCpf,
  findClientByNamePhone,
  updateClient,
} from "../../clients/repository";
import { buildClientNameColumnsProfile } from "../../clients/name-profile";
import { scheduleAppointmentLifecycleNotifications } from "../../notifications/whatsapp-automation";
import {
  isValidEmailAddress,
  normalizeCheckoutDiscountType,
  normalizeCpfDigits,
  parseDecimalInput,
  parseInitialFinanceExtraItems,
  toBrazilDateTime,
} from "../actions.helpers";
import {
  updateAppointment,
} from "../repository";

export async function createAppointmentImpl(
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


