"use server";

import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { createClient } from "../../../lib/supabase/server";
import { AppError } from "../../shared/errors/AppError";
import { mapSupabaseError } from "../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import { BRAZIL_TZ_OFFSET } from "../../shared/timezone";
import { publicBookingSchema } from "../../shared/validation/appointments";
import { estimateDisplacementFromAddress } from "../../shared/displacement/service";
import { insertNotificationJob } from "../notifications/repository";
import { getTenantBySlug } from "../settings/repository";

export interface SubmitPublicAppointmentInput {
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
}

const toBrazilDateTime = (date: string, time: string) =>
  new Date(`${date}T${time}:00${BRAZIL_TZ_OFFSET}`);

async function enqueueNotificationJob(payload: Parameters<typeof insertNotificationJob>[0]) {
  const { error } = await insertNotificationJob(payload);
  if (error) {
    console.error("Erro ao criar job de notificação:", error);
  }
}

export async function submitPublicAppointmentAction(
  data: SubmitPublicAppointmentInput
): Promise<ActionResult<{ appointmentId: string | null }>> {
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
