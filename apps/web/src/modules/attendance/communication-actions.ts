import { revalidatePath } from "next/cache";
import { z } from "zod";

import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { insertAttendanceEvent } from "../../../lib/attendance/attendance-repository";
import { createServiceClient } from "../../../lib/supabase/service";
import type { Json } from "../../../lib/supabase/types";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import { AppError } from "../../shared/errors/AppError";
import { mapSupabaseError } from "../../shared/errors/mapSupabaseError";
import {
  appointmentIdSchema,
  confirmPreSchema,
  recordMessageStatusSchema,
  sendMessageSchema,
} from "../../shared/validation/attendance";
import { updateAppointment } from "../appointments/repository";

export async function insertMessageLogOperation(params: {
  appointmentId: string;
  type: "created_confirmation" | "reminder_24h" | "post_survey" | "payment_charge" | "payment_receipt";
  status: "drafted" | "sent_manual" | "sent_auto" | "delivered" | "failed";
  payload?: Json | null;
  sentAt?: string | null;
}) {
  const supabase = createServiceClient();
  return supabase.from("appointment_messages").insert({
    appointment_id: params.appointmentId,
    tenant_id: FIXED_TENANT_ID,
    type: params.type,
    status: params.status,
    payload: params.payload ?? null,
    sent_at: params.sentAt ?? null,
  });
}

export async function confirmPreOperation(payload: {
  appointmentId: string;
  channel?: string;
}): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = confirmPreSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("appointment_attendances")
    .update({
      confirmed_at: now,
    })
    .eq("appointment_id", parsed.data.appointmentId);

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  const { error: appointmentError } = await updateAppointment(FIXED_TENANT_ID, parsed.data.appointmentId, {
    status: "confirmed",
  });
  const mappedAppointmentError = mapSupabaseError(appointmentError);
  if (mappedAppointmentError) return fail(mappedAppointmentError);

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "pre_confirmed",
    payload: { channel: parsed.data.channel ?? "manual" },
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function cancelPreConfirmationOperation(payload: {
  appointmentId: string;
}): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = appointmentIdSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("appointment_attendances")
    .update({
      confirmed_at: null,
    })
    .eq("appointment_id", parsed.data.appointmentId);

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  const { error: appointmentError } = await updateAppointment(FIXED_TENANT_ID, parsed.data.appointmentId, {
    status: "pending",
  });
  const mappedAppointmentError = mapSupabaseError(appointmentError);
  if (mappedAppointmentError) return fail(mappedAppointmentError);

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "pre_confirmation_canceled",
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  revalidatePath("/");
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function sendReminder24hOperation(payload: {
  appointmentId: string;
  message?: string | null;
}): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = appointmentIdSchema.extend({ message: z.string().optional().nullable() }).safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  await insertMessageLogOperation({
    appointmentId: parsed.data.appointmentId,
    type: "reminder_24h",
    status: "sent_manual",
    sentAt: new Date().toISOString(),
    payload: parsed.data.message ? { message: parsed.data.message } : null,
  });

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "reminder_24h_sent",
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function sendMessageOperation(payload: {
  appointmentId: string;
  type: "created_confirmation" | "reminder_24h" | "post_survey" | "payment_charge" | "payment_receipt";
  channel?: string | null;
  payload?: Json | null;
}): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = sendMessageSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const messagePayload = (parsed.data.payload ??
    (parsed.data.channel ? { channel: parsed.data.channel } : null)) as Json | null;

  await insertMessageLogOperation({
    appointmentId: parsed.data.appointmentId,
    type: parsed.data.type,
    status: "sent_manual",
    sentAt: new Date().toISOString(),
    payload: messagePayload,
  });

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "message_sent",
    payload: { type: parsed.data.type, channel: parsed.data.channel ?? "manual" },
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function recordMessageStatusOperation(payload: {
  appointmentId: string;
  messageId: string;
  status: "drafted" | "sent_manual" | "sent_auto" | "delivered" | "failed";
}): Promise<ActionResult<{ messageId: string }>> {
  const parsed = recordMessageStatusSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const updatePayload: { status: string; sent_at?: string | null } = {
    status: parsed.data.status,
  };
  if (parsed.data.status === "sent_manual" || parsed.data.status === "sent_auto") {
    updatePayload.sent_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("appointment_messages")
    .update(updatePayload)
    .eq("id", parsed.data.messageId)
    .eq("appointment_id", parsed.data.appointmentId);

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "message_status_updated",
    payload: { status: parsed.data.status, messageId: parsed.data.messageId },
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ messageId: parsed.data.messageId });
}
