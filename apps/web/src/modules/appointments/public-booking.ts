"use server";

import { getDay, parseISO } from "date-fns";
import { createClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";
import { AppError } from "../../shared/errors/AppError";
import { mapSupabaseError } from "../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import { BRAZIL_TZ_OFFSET } from "../../shared/timezone";
import { publicBookingSchema } from "../../shared/validation/appointments";
import { estimateDisplacementFromAddress } from "../../shared/displacement/service";
import { scheduleAppointmentLifecycleNotifications } from "../notifications/whatsapp-automation";
import { getTenantBySlug } from "../settings/repository";
import {
  buildClientNameColumnsProfile,
  composeInternalClientName,
  composePublicClientFullName,
} from "../clients/name-profile";

export interface SubmitPublicAppointmentInput {
  tenantSlug: string;
  serviceId: string;
  date: string;
  time: string;
  clientName: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientEmail: string;
  clientPhone: string;
  clientCpf?: string;
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
}

const toBrazilDateTime = (date: string, time: string) =>
  new Date(`${date}T${time}:00${BRAZIL_TZ_OFFSET}`);

const DEFAULT_PUBLIC_BOOKING_CUTOFF_BEFORE_CLOSE_MINUTES = 60;
const DEFAULT_PUBLIC_BOOKING_LAST_SLOT_BEFORE_CLOSE_MINUTES = 30;

function splitPublicNameParts(fullName: string) {
  const cleaned = fullName.trim().replace(/\s+/g, " ");
  if (!cleaned) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = cleaned.split(" ");
  return {
    firstName: firstName ?? "",
    lastName: rest.join(" "),
  };
}

function parseTimeToMinutes(time: string) {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw ?? "0");
  const minute = Number(minuteRaw ?? "0");
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
}

function getBrazilDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function getBrazilMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export async function submitPublicAppointmentAction(
  data: SubmitPublicAppointmentInput
): Promise<ActionResult<{ appointmentId: string | null }>> {
  const parsed = publicBookingSchema.safeParse(data);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos para agendamento", "VALIDATION_ERROR", 400, parsed.error));
  }

  const normalizedCpf = (parsed.data.clientCpf ?? "").replace(/\D/g, "").slice(0, 11);
  const normalizedClientName = parsed.data.clientName.trim();
  const derivedParts = splitPublicNameParts(normalizedClientName);
  const publicFirstName = (parsed.data.clientFirstName ?? "").trim() || derivedParts.firstName;
  const publicLastName = (parsed.data.clientLastName ?? "").trim() || derivedParts.lastName;
  const publicFullName =
    composePublicClientFullName(publicFirstName, publicLastName) || normalizedClientName;

  const { data: tenant } = await getTenantBySlug(parsed.data.tenantSlug);
  if (!tenant) {
    return fail(new AppError("Estúdio não encontrado para esse link.", "NOT_FOUND", 404));
  }
  const tenantId = tenant.id;
  const serviceSupabase = createServiceClient();

  const dayOfWeek = getDay(parseISO(`${parsed.data.date}T12:00:00${BRAZIL_TZ_OFFSET}`));
  const [{ data: settings, error: settingsError }, { data: businessHour, error: businessHourError }] =
    await Promise.all([
      serviceSupabase
        .from("settings")
        .select(
          "public_booking_cutoff_before_close_minutes, public_booking_last_slot_before_close_minutes"
        )
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      serviceSupabase
        .from("business_hours")
        .select("open_time, close_time, is_closed")
        .eq("tenant_id", tenantId)
        .eq("day_of_week", dayOfWeek)
        .maybeSingle(),
    ]);

  const mappedSettingsError = mapSupabaseError(settingsError);
  if (mappedSettingsError) return fail(mappedSettingsError);
  const mappedBusinessHourError = mapSupabaseError(businessHourError);
  if (mappedBusinessHourError) return fail(mappedBusinessHourError);

  if (!businessHour || businessHour.is_closed) {
    return fail(
      new AppError(
        "Este dia não está disponível para agendamento online.",
        "VALIDATION_ERROR",
        422
      )
    );
  }

  const closeMinutes = parseTimeToMinutes(businessHour.close_time.slice(0, 5));
  const appointmentMinutes = parseTimeToMinutes(parsed.data.time);
  const cutoffBeforeCloseMinutes = Number.isFinite(
    Number(settings?.public_booking_cutoff_before_close_minutes)
  )
    ? Math.max(0, Number(settings?.public_booking_cutoff_before_close_minutes))
    : DEFAULT_PUBLIC_BOOKING_CUTOFF_BEFORE_CLOSE_MINUTES;
  const lastSlotBeforeCloseMinutes = Number.isFinite(
    Number(settings?.public_booking_last_slot_before_close_minutes)
  )
    ? Math.max(0, Number(settings?.public_booking_last_slot_before_close_minutes))
    : DEFAULT_PUBLIC_BOOKING_LAST_SLOT_BEFORE_CLOSE_MINUTES;
  const latestAllowedSlotMinutes = closeMinutes - lastSlotBeforeCloseMinutes;

  if (appointmentMinutes > latestAllowedSlotMinutes) {
    return fail(
      new AppError(
        `O último horário online deste dia é até ${Math.max(lastSlotBeforeCloseMinutes, 0)} min antes do fechamento.`,
        "VALIDATION_ERROR",
        422
      )
    );
  }

  if (parsed.data.date === getBrazilDateKey(new Date())) {
    const nowMinutes = getBrazilMinutes(new Date());
    const sameDayCutoffMinutes = closeMinutes - cutoffBeforeCloseMinutes;
    if (nowMinutes > sameDayCutoffMinutes) {
      return fail(
        new AppError(
          `Agendamentos online para hoje aceitam novas marcações até ${Math.max(cutoffBeforeCloseMinutes, 0)} min antes do fechamento.`,
          "VALIDATION_ERROR",
          422
        )
      );
    }
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
    client_name: publicFullName,
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
    const { data: appointment } = await serviceSupabase
      .from("appointments")
      .select("client_id")
      .eq("tenant_id", tenantId)
      .eq("id", appointmentId)
      .maybeSingle();

    if (appointment?.client_id) {
      const { data: clientRow } = await serviceSupabase
        .from("clients")
        .select("name, email, cpf, public_first_name, public_last_name, internal_reference")
        .eq("tenant_id", tenantId)
        .eq("id", appointment.client_id)
        .maybeSingle();
      const newProfile: ReturnType<typeof buildClientNameColumnsProfile> | null =
        publicFirstName && publicLastName
          ? buildClientNameColumnsProfile({
              publicFirstName,
              publicLastName,
            })
          : null;
      const targetPublicFirstName = newProfile?.public_first_name ?? clientRow?.public_first_name ?? null;
      const targetPublicLastName = newProfile?.public_last_name ?? clientRow?.public_last_name ?? null;
      const targetInternalReference =
        newProfile?.internal_reference ?? clientRow?.internal_reference ?? null;
      const restoredInternalName =
        composeInternalClientName(
          targetPublicFirstName ?? "",
          targetPublicLastName,
          targetInternalReference
        ) || clientRow?.name || null;

      await serviceSupabase
        .from("clients")
        .update({
          name: restoredInternalName ?? undefined,
          email: parsed.data.clientEmail || clientRow?.email || null,
          cpf: normalizedCpf || clientRow?.cpf || null,
          public_first_name: targetPublicFirstName,
          public_last_name: targetPublicLastName,
          internal_reference: targetInternalReference,
        })
        .eq("tenant_id", tenantId)
        .eq("id", appointment.client_id);
    }

    await scheduleAppointmentLifecycleNotifications({
      tenantId,
      appointmentId,
      startTimeIso: startDateTime.toISOString(),
      source: "public_booking",
    });
  }

  return ok({ appointmentId });
}
