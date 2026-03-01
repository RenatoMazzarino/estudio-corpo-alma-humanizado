"use server";

import { addMinutes, parseISO } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { FIXED_TENANT_ID } from "../../../../lib/tenant-context";
import { createServiceClient } from "../../../../lib/supabase/service";
import { AppError } from "../../../shared/errors/AppError";
import { mapSupabaseError } from "../../../shared/errors/mapSupabaseError";
import { createInternalAppointmentSchema } from "../../../shared/validation/appointments";
import { BRAZIL_TZ_OFFSET } from "../../../shared/timezone";
import { estimateDisplacementFromAddress } from "../../../shared/displacement/service";
import {
  createClient as createClientRecord,
  findClientByNamePhone,
  updateClient,
} from "../../clients/repository";
import {
  parseDecimalInput,
  resolveBuffer,
  toBrazilDateTime,
} from "../actions.helpers";
import {
  listAppointmentsInRange,
  listAvailabilityBlocksInRange,
  updateAppointment,
} from "../repository";


export async function updateInternalAppointmentImpl(formData: FormData): Promise<void> {
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
