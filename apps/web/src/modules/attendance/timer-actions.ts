import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { createServiceClient } from "../../../lib/supabase/service";
import { insertAttendanceEvent } from "../../../lib/attendance/attendance-repository";
import { updateAppointment } from "../appointments/repository";
import { AppError } from "../../shared/errors/AppError";
import { mapSupabaseError } from "../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import {
  timerPauseSchema,
  timerResumeSchema,
  timerStartSchema,
  timerSyncSchema,
} from "../../shared/validation/attendance";

export async function startTimerOperation(payload: {
  appointmentId: string;
  plannedSeconds?: number | null;
}): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = timerStartSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const { data: attendance } = await supabase
    .from("appointment_attendances")
    .select("timer_status, timer_started_at")
    .eq("appointment_id", parsed.data.appointmentId)
    .maybeSingle();

  if (attendance?.timer_status === "running") {
    return ok({ appointmentId: parsed.data.appointmentId });
  }

  const startedAt = attendance?.timer_started_at ?? new Date().toISOString();
  const { error } = await supabase.from("appointment_attendances").upsert(
    {
      appointment_id: parsed.data.appointmentId,
      tenant_id: FIXED_TENANT_ID,
      timer_status: "running",
      timer_started_at: startedAt,
      timer_paused_at: null,
      planned_seconds: parsed.data.plannedSeconds ?? undefined,
    },
    { onConflict: "appointment_id" }
  );

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  await updateAppointment(FIXED_TENANT_ID, parsed.data.appointmentId, {
    status: "in_progress",
    started_at: startedAt,
  });

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "timer_started",
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function pauseTimerOperation(payload: {
  appointmentId: string;
}): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = timerPauseSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("appointment_attendances")
    .update({ timer_status: "paused", timer_paused_at: now })
    .eq("appointment_id", parsed.data.appointmentId);

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "timer_paused",
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function resumeTimerOperation(payload: {
  appointmentId: string;
}): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = timerResumeSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const { data: attendance } = await supabase
    .from("appointment_attendances")
    .select("timer_started_at, timer_paused_at, paused_total_seconds")
    .eq("appointment_id", parsed.data.appointmentId)
    .maybeSingle();

  if (!attendance?.timer_paused_at) {
    return ok({ appointmentId: parsed.data.appointmentId });
  }

  const pausedAt = new Date(attendance.timer_paused_at).getTime();
  const now = Date.now();
  const pausedSeconds = Math.floor((now - pausedAt) / 1000);
  const nextPausedTotal = (attendance.paused_total_seconds ?? 0) + Math.max(0, pausedSeconds);

  const { error } = await supabase
    .from("appointment_attendances")
    .update({
      timer_status: "running",
      timer_paused_at: null,
      paused_total_seconds: nextPausedTotal,
    })
    .eq("appointment_id", parsed.data.appointmentId);

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "timer_resumed",
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function syncTimerOperation(payload: {
  appointmentId: string;
  timerStatus: "idle" | "running" | "paused" | "finished";
  timerStartedAt: string | null;
  timerPausedAt: string | null;
  pausedTotalSeconds: number;
  plannedSeconds: number | null;
  actualSeconds?: number | null;
}): Promise<ActionResult<{ appointmentId: string }>> {
  const parsed = timerSyncSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("appointment_attendances")
    .update({
      timer_status: parsed.data.timerStatus,
      timer_started_at: parsed.data.timerStartedAt,
      timer_paused_at: parsed.data.timerPausedAt,
      paused_total_seconds: parsed.data.pausedTotalSeconds,
      planned_seconds: parsed.data.plannedSeconds ?? undefined,
      actual_seconds: parsed.data.actualSeconds ?? undefined,
    })
    .eq("appointment_id", parsed.data.appointmentId);

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  return ok({ appointmentId: parsed.data.appointmentId });
}
