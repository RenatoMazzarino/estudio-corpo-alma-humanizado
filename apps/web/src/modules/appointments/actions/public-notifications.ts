"use server";

import { z } from "zod";
import { FIXED_TENANT_ID } from "../../../../lib/tenant-context";
import { createServiceClient } from "../../../../lib/supabase/service";
import { AppError } from "../../../shared/errors/AppError";
import { mapSupabaseError } from "../../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../shared/errors/result";
import { scheduleAppointmentLifecycleNotifications } from "../../notifications/whatsapp-automation";
import {
  submitPublicAppointmentAction,
  type SubmitPublicAppointmentInput,
} from "../public-booking";

export async function triggerCreatedNotificationsForAppointmentImpl(payload: {
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

export async function submitPublicAppointmentImpl(
  data: SubmitPublicAppointmentInput
): Promise<ActionResult<{ appointmentId: string | null }>> {
  return submitPublicAppointmentAction(data);
}

export type { SubmitPublicAppointmentInput };
