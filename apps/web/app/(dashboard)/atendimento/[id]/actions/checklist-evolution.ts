"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FIXED_TENANT_ID } from "../../../../../lib/tenant-context";
import { createServiceClient } from "../../../../../lib/supabase/service";
import { AppError } from "../../../../../src/shared/errors/AppError";
import { mapSupabaseError } from "../../../../../src/shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../../../src/shared/errors/result";
import {
  checklistToggleSchema,
  checklistUpsertSchema,
  finishAttendanceSchema,
  internalNotesSchema,
  saveEvolutionSchema,
  savePostSchema,
} from "../../../../../src/shared/validation/attendance";
import { computeElapsedSeconds } from "../../../../../lib/attendance/attendance-domain";
import { insertAttendanceEvent } from "../../../../../lib/attendance/attendance-repository";
import { updateAppointment, updateAppointmentReturning } from "../../../../../src/modules/appointments/repository";
import { recalculateCheckoutPaymentStatus } from "../../../../../src/modules/attendance/checkout-service";
import { fallbackStructuredEvolution } from "../../../../../src/modules/attendance/evolution-format";
import { runFloraAudioTranscription, runFloraText } from "../../../../../src/shared/ai/flora";

export async function saveInternalNotesImpl(payload: { appointmentId: string; internalNotes?: string | null }): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = internalNotesSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await updateAppointment(FIXED_TENANT_ID, parsed.data.appointmentId, {
    internal_notes: parsed.data.internalNotes ?? null,
  });

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "internal_notes_updated",
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function toggleChecklistItemImpl(payload: { appointmentId: string; itemId: string; completed: boolean }): Promise<ActionResult<{ itemId: string }>> {
  const parsed = checklistToggleSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }
  const supabase = createServiceClient();
  const completedAt = parsed.data.completed ? new Date().toISOString() : null;
  const { error } = await supabase
    .from("appointment_checklist_items")
    .update({ completed_at: completedAt })
    .eq("appointment_id", parsed.data.appointmentId)
    .eq("id", parsed.data.itemId);

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ itemId: parsed.data.itemId });
}

export async function upsertChecklistImpl(payload: {
  appointmentId: string;
  items: Array<{ id?: string; label: string; sortOrder: number; completed?: boolean }>;
}): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = checklistUpsertSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const inserts = parsed.data.items.map((item) => ({
    id: item.id,
    appointment_id: parsed.data.appointmentId,
    tenant_id: FIXED_TENANT_ID,
    label: item.label,
    sort_order: item.sortOrder,
    completed_at: item.completed ? new Date().toISOString() : null,
  }));

  const { error } = await supabase.from("appointment_checklist_items").upsert(inserts);
  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function saveEvolutionImpl(payload: {
  appointmentId: string;
  payload: {
    text?: string | null;
  };
}): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = saveEvolutionSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const evolutionText = parsed.data.payload.text?.trim() ?? null;
  const { data: existingEntry, error: existingEntryError } = await supabase
    .from("appointment_evolution_entries")
    .select("id")
    .eq("appointment_id", parsed.data.appointmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const mappedExistingEntryError = mapSupabaseError(existingEntryError);
  if (mappedExistingEntryError) return fail(mappedExistingEntryError);

  if (existingEntry) {
    const { error } = await supabase
      .from("appointment_evolution_entries")
      .update({
        evolution_text: evolutionText,
      })
      .eq("id", existingEntry.id);

    const mapped = mapSupabaseError(error);
    if (mapped) return fail(mapped);
  } else {
    const insertPayload = {
      appointment_id: parsed.data.appointmentId,
      tenant_id: FIXED_TENANT_ID,
      evolution_text: evolutionText,
    };

    let { error } = await supabase.from("appointment_evolution_entries").insert(insertPayload as never);

    const insertErrorText = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
    const needsLegacyVersionFallback =
      !!error &&
      ["version", "appointment_evolution_entries_unique", "null value in column"].some((pattern) =>
        insertErrorText.includes(pattern)
      );

    if (needsLegacyVersionFallback) {
      const legacyInsert = await supabase.from("appointment_evolution_entries").insert({
        ...insertPayload,
        version: 1,
        status: "draft",
      } as never);
      error = legacyInsert.error;
    }

    const mapped = mapSupabaseError(error);
    if (mapped) return fail(mapped);
  }

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "evolution_saved",
    payload: { has_text: Boolean(evolutionText) },
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function structureEvolutionFromAudioImpl(payload: {
  appointmentId: string;
  transcript: string;
}): Promise<ActionResult<{ transcript: string; structuredText: string }>> {
  const parsed = z
    .object({
      appointmentId: z.string().uuid(),
      transcript: z.string().min(4),
    })
    .safeParse(payload);

  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const transcript = parsed.data.transcript.trim();
  if (!transcript) {
    return fail(new AppError("Áudio sem conteúdo para estruturar.", "VALIDATION_ERROR", 400));
  }

  const floraResponse = await runFloraText({
    systemPrompt:
      "Você é Flora, assistente clínica do Estúdio Corpo & Alma. Estruture uma evolução de atendimento em português, com texto objetivo, humanizado e profissional. Não invente dados.",
    userPrompt: [
      "Estruture a evolução abaixo no formato:",
      "Queixa principal:",
      "Conduta aplicada:",
      "Resposta do cliente:",
      "Recomendação:",
      "",
      "Transcrição do profissional:",
      transcript,
    ].join("\n"),
    temperature: 0.1,
    maxOutputTokens: 900,
  });

  const structuredText = floraResponse?.trim() || fallbackStructuredEvolution(transcript);

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "evolution_audio_structured",
    payload: { transcript_length: transcript.length, used_ai: Boolean(floraResponse) },
  });

  return ok({ transcript, structuredText });
}

export async function transcribeEvolutionFromAudioImpl(payload: {
  appointmentId: string;
  audioBase64: string;
  mimeType?: string | null;
}): Promise<ActionResult<{ transcript: string }>> {
  const parsed = z
    .object({
      appointmentId: z.string().uuid(),
      audioBase64: z.string().min(100),
      mimeType: z.string().optional().nullable(),
    })
    .safeParse(payload);

  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const mimeType = (parsed.data.mimeType ?? "audio/webm").trim() || "audio/webm";

  const transcriptRaw = await runFloraAudioTranscription({
    audioBase64: parsed.data.audioBase64,
    mimeType,
  });

  const transcript = transcriptRaw?.trim() ?? "";
  if (!transcript) {
    return fail(
      new AppError(
        "Não foi possível transcrever o áudio. Tente gravar novamente em ambiente mais silencioso.",
        "VALIDATION_ERROR",
        400
      )
    );
  }

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "evolution_audio_transcribed",
    payload: { transcript_length: transcript.length, mime_type: mimeType },
  });

  return ok({ transcript });
}

export async function savePostImpl(payload: {
  appointmentId: string;
  postNotes?: string | null;
  followUpDueAt?: string | null;
  followUpNote?: string | null;
  surveyStatus?: "not_sent" | "sent" | "answered";
  surveyScore?: number | null;
  kpiTotalSeconds?: number | null;
}): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = savePostSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("appointment_post")
    .update({
      post_notes: parsed.data.postNotes ?? undefined,
      follow_up_due_at: parsed.data.followUpDueAt ?? undefined,
      follow_up_note: parsed.data.followUpNote ?? undefined,
      survey_status: parsed.data.surveyStatus ?? undefined,
      survey_score: parsed.data.surveyScore ?? undefined,
      kpi_total_seconds: parsed.data.kpiTotalSeconds ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("appointment_id", parsed.data.appointmentId);

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function finishAttendanceImpl(payload: { appointmentId: string }): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = finishAttendanceSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const { data: attendance } = await supabase
    .from("appointment_attendances")
    .select("timer_started_at, timer_paused_at, paused_total_seconds, timer_status, planned_seconds")
    .eq("appointment_id", parsed.data.appointmentId)
    .maybeSingle();

  const actualSeconds = computeElapsedSeconds({
    startedAt: attendance?.timer_started_at ?? null,
    pausedAt: attendance?.timer_paused_at ?? null,
    pausedTotalSeconds: attendance?.paused_total_seconds ?? 0,
  });

  const { error } = await supabase
    .from("appointment_attendances")
    .update({
      timer_status: "finished",
      actual_seconds: actualSeconds,
    })
    .eq("appointment_id", parsed.data.appointmentId);

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  const actualDurationMinutes = actualSeconds > 0 ? Math.round(actualSeconds / 60) : null;
  const { error: postError } = await supabase
    .from("appointment_post")
    .update({ kpi_total_seconds: actualSeconds, updated_at: new Date().toISOString() })
    .eq("appointment_id", parsed.data.appointmentId);

  const mappedPostError = mapSupabaseError(postError);
  if (mappedPostError) return fail(mappedPostError);

  const { error: appointmentError } = await updateAppointmentReturning(
    FIXED_TENANT_ID,
    parsed.data.appointmentId,
    {
      status: "completed",
      finished_at: new Date().toISOString(),
      actual_duration_minutes: actualDurationMinutes ?? undefined,
    },
    "id"
  );

  const mappedAppointmentError = mapSupabaseError(appointmentError);
  if (mappedAppointmentError) return fail(mappedAppointmentError);

  await recalculateCheckoutPaymentStatus(parsed.data.appointmentId, FIXED_TENANT_ID);

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "attendance_finished",
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  revalidatePath("/");
  revalidatePath("/caixa");
  return ok({ appointmentId: parsed.data.appointmentId });
}
