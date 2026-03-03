"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "../../../../../lib/supabase/service";
import type { Json } from "../../../../../lib/supabase/types";
import { AppError } from "../../../../../src/shared/errors/AppError";
import { mapSupabaseError } from "../../../../../src/shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../../../src/shared/errors/result";
import { appointmentIdSchema, savePostSchema } from "../../../../../src/shared/validation/attendance";
import { getAttendanceOverview, insertAttendanceEvent } from "../../../../../lib/attendance/attendance-repository";
import {
  cancelPreConfirmationOperation,
  confirmPreOperation,
  insertMessageLogOperation,
  recordMessageStatusOperation,
  sendMessageOperation,
  sendReminder24hOperation,
} from "../../../../../src/modules/attendance/communication-actions";

export async function getAttendanceImpl(appointmentId: string, tenantId: string) {
  return getAttendanceOverview(tenantId, appointmentId);
}

export async function confirmPreImpl(
  payload: { appointmentId: string; channel?: string },
  tenantId: string
): Promise<ActionResult<{ appointmentId: string }>> {
  return confirmPreOperation(payload, tenantId);
}

export async function cancelPreConfirmationImpl(
  payload: { appointmentId: string },
  tenantId: string
): Promise<ActionResult<{ appointmentId: string }>> {
  return cancelPreConfirmationOperation(payload, tenantId);
}

export async function sendReminder24hImpl(
  payload: { appointmentId: string; message?: string | null },
  tenantId: string
): Promise<ActionResult<{ appointmentId: string }>> {
  return sendReminder24hOperation(payload, tenantId);
}

export async function sendMessageImpl(payload: {
  appointmentId: string;
  type: "created_confirmation" | "reminder_24h" | "post_survey" | "payment_charge" | "payment_receipt";
  channel?: string | null;
  payload?: Json | null;
}, tenantId: string): Promise<ActionResult<{ appointmentId: string }>> {
  return sendMessageOperation(payload, tenantId);
}

export async function recordMessageStatusImpl(payload: {
  appointmentId: string;
  messageId: string;
  status: "drafted" | "sent_manual" | "sent_auto" | "delivered" | "failed";
}, tenantId: string): Promise<ActionResult<{ messageId: string }>> {
  return recordMessageStatusOperation(payload, tenantId);
}

export async function sendSurveyImpl(
  payload: { appointmentId: string; message?: string | null },
  tenantId: string
): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = appointmentIdSchema.extend({ message: z.string().optional().nullable() }).safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("appointment_post")
    .update({ survey_status: "sent", updated_at: new Date().toISOString() })
    .eq("appointment_id", parsed.data.appointmentId);
  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);
  await insertMessageLogOperation({
    appointmentId: parsed.data.appointmentId,
    type: "post_survey",
    status: "sent_manual",
    sentAt: new Date().toISOString(),
    payload: parsed.data.message ? { message: parsed.data.message } : null,
    tenantId,
  });
  await insertAttendanceEvent({
    tenantId,
    appointmentId: parsed.data.appointmentId,
    eventType: "survey_sent",
  });
  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function recordSurveyAnswerImpl(
  payload: { appointmentId: string; score: number },
  tenantId: string
): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = appointmentIdSchema.extend({ score: savePostSchema.shape.surveyScore }).safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("appointment_post")
    .update({ survey_status: "answered", survey_score: parsed.data.score ?? null, updated_at: new Date().toISOString() })
    .eq("appointment_id", parsed.data.appointmentId);

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  await insertAttendanceEvent({
    tenantId,
    appointmentId: parsed.data.appointmentId,
    eventType: "survey_answered",
    payload: { score: parsed.data.score },
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}
