"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FIXED_TENANT_ID } from "../../../../lib/tenant-context";
import { createServiceClient } from "../../../../lib/supabase/service";
import type { Json } from "../../../../lib/supabase/types";
import { AppError } from "../../../../src/shared/errors/AppError";
import { mapSupabaseError } from "../../../../src/shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../../src/shared/errors/result";
import {
  appointmentIdSchema,
  checklistToggleSchema,
  checklistUpsertSchema,
  confirmPreSchema,
  finishAttendanceSchema,
  internalNotesSchema,
  recordPaymentSchema,
  recordMessageStatusSchema,
  sendMessageSchema,
  saveEvolutionSchema,
  savePostSchema,
  setCheckoutItemsSchema,
  setDiscountSchema,
  timerPauseSchema,
  timerResumeSchema,
  timerStartSchema,
  timerSyncSchema,
} from "../../../../src/shared/validation/attendance";
import { computeElapsedSeconds, computeTotals } from "../../../../lib/attendance/attendance-domain";
import { getAttendanceOverview, insertAttendanceEvent } from "../../../../lib/attendance/attendance-repository";
import { updateAppointment, updateAppointmentReturning } from "../../../../src/modules/appointments/repository";
import { insertTransaction } from "../../../../src/modules/finance/repository";
import {
  createPixOrderForAppointment,
  createPointOrderForAppointment,
  getAppointmentPaymentStatusByMethod,
  getPointOrderStatus,
  type PointCardMode,
} from "../../../../src/modules/payments/mercadopago-orders";
import { getSettings } from "../../../../src/modules/settings/repository";
import { runFloraAudioTranscription, runFloraText } from "../../../../src/shared/ai/flora";
import { requireDashboardAccessForServerAction } from "../../../../src/modules/auth/dashboard-access";

async function insertMessageLog(params: {
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

async function recalcCheckoutTotals(appointmentId: string) {
  const supabase = createServiceClient();
  const { data: items } = await supabase
    .from("appointment_checkout_items")
    .select("amount, qty")
    .eq("appointment_id", appointmentId);
  const { data: checkout } = await supabase
    .from("appointment_checkout")
    .select("discount_type, discount_value")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  const totals = computeTotals({
    items: (items ?? []).map((item) => ({
      amount: Number(item.amount ?? 0),
      qty: item.qty ?? 1,
    })),
    discountType: (checkout?.discount_type as "value" | "pct" | null) ?? null,
    discountValue: checkout?.discount_value ?? 0,
  });

  await supabase
    .from("appointment_checkout")
    .update({ subtotal: totals.subtotal, total: totals.total })
    .eq("appointment_id", appointmentId);

  return totals;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function getCheckoutChargeSnapshot(appointmentId: string) {
  await recalcCheckoutTotals(appointmentId);
  const { paid, total, paymentStatus } = await updatePaymentStatus(appointmentId);
  return {
    paid: roundCurrency(paid),
    total: roundCurrency(total),
    remaining: roundCurrency(Math.max(total - paid, 0)),
    paymentStatus,
  };
}

function fallbackStructuredEvolution(rawText: string) {
  const normalized = rawText.trim();
  if (!normalized) return "";

  return [
    "Queixa principal:",
    normalized,
    "",
    "Conduta aplicada:",
    "Descrever técnicas e abordagem realizada na sessão.",
    "",
    "Resposta do cliente:",
    "Descrever resposta durante e após a sessão.",
    "",
    "Recomendação:",
    "Descrever orientação de autocuidado e próximo passo.",
  ].join("\n");
}

async function updatePaymentStatus(appointmentId: string) {
  const supabase = createServiceClient();
  const { data: checkout } = await supabase
    .from("appointment_checkout")
    .select("total")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  const total = Number(checkout?.total ?? 0);

  const { data: payments } = await supabase
    .from("appointment_payments")
    .select("amount, status")
    .eq("appointment_id", appointmentId);

  const paid = (payments ?? [])
    .filter((payment) => payment.status === "paid")
    .reduce((acc, item) => acc + Number(item.amount ?? 0), 0);

  const paymentStatus = paid >= total && total > 0 ? "paid" : paid > 0 ? "partial" : "pending";

  await updateAppointment(FIXED_TENANT_ID, appointmentId, {
    payment_status: paymentStatus,
  });

  return { paid, total, paymentStatus };
}

export async function getAttendance(appointmentId: string) {

  await requireDashboardAccessForServerAction();
  return getAttendanceOverview(FIXED_TENANT_ID, appointmentId);
}

export async function confirmPre(payload: { appointmentId: string; channel?: string }): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
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

export async function cancelPreConfirmation(payload: { appointmentId: string }): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
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

export async function sendReminder24h(payload: { appointmentId: string; message?: string | null }): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
  const parsed = appointmentIdSchema.extend({ message: z.string().optional().nullable() }).safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  await insertMessageLog({
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

export async function sendMessage(payload: {
  appointmentId: string;
  type: "created_confirmation" | "reminder_24h" | "post_survey" | "payment_charge" | "payment_receipt";
  channel?: string | null;
  payload?: Json | null;
}): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
  const parsed = sendMessageSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const messagePayload = (parsed.data.payload ??
    (parsed.data.channel ? { channel: parsed.data.channel } : null)) as Json | null;

  await insertMessageLog({
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

export async function recordMessageStatus(payload: {
  appointmentId: string;
  messageId: string;
  status: "drafted" | "sent_manual" | "sent_auto" | "delivered" | "failed";
}): Promise<ActionResult<{ messageId: string }>> {

  await requireDashboardAccessForServerAction();
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

export async function saveInternalNotes(payload: { appointmentId: string; internalNotes?: string | null }): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
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

export async function toggleChecklistItem(payload: { appointmentId: string; itemId: string; completed: boolean }): Promise<ActionResult<{ itemId: string }>> {

  await requireDashboardAccessForServerAction();
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

export async function upsertChecklist(payload: {
  appointmentId: string;
  items: Array<{ id?: string; label: string; sortOrder: number; completed?: boolean }>;
}): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
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

export async function saveEvolution(payload: {
  appointmentId: string;
  payload: {
    text?: string | null;
  };
}): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
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

export async function structureEvolutionFromAudio(payload: {
  appointmentId: string;
  transcript: string;
}): Promise<ActionResult<{ transcript: string; structuredText: string }>> {

  await requireDashboardAccessForServerAction();
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

export async function transcribeEvolutionFromAudio(payload: {
  appointmentId: string;
  audioBase64: string;
  mimeType?: string | null;
}): Promise<ActionResult<{ transcript: string }>> {

  await requireDashboardAccessForServerAction();
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

export async function setCheckoutItems(payload: {
  appointmentId: string;
  items: Array<{ type: "service" | "fee" | "addon" | "adjustment"; label: string; qty?: number; amount: number; metadata?: Record<string, unknown> }>;
}): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
  const parsed = setCheckoutItemsSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const { error: deleteError } = await supabase
    .from("appointment_checkout_items")
    .delete()
    .eq("appointment_id", parsed.data.appointmentId);

  const mappedDeleteError = mapSupabaseError(deleteError);
  if (mappedDeleteError) return fail(mappedDeleteError);

  const items = parsed.data.items.map((item, index) => ({
    appointment_id: parsed.data.appointmentId,
    tenant_id: FIXED_TENANT_ID,
    type: item.type,
    label: item.label,
    qty: item.qty ?? 1,
    amount: item.amount,
    metadata: (item.metadata ?? null) as Json | null,
    sort_order: index + 1,
  }));

  const { error } = await supabase.from("appointment_checkout_items").insert(items);
  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  await recalcCheckoutTotals(parsed.data.appointmentId);

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function setDiscount(payload: {
  appointmentId: string;
  type: "value" | "pct" | null;
  value: number | null;
  reason?: string | null;
}): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
  const parsed = setDiscountSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("appointment_checkout")
    .update({
      discount_type: parsed.data.type,
      discount_value: parsed.data.value,
      discount_reason: parsed.data.reason ?? null,
    })
    .eq("appointment_id", parsed.data.appointmentId);

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  await recalcCheckoutTotals(parsed.data.appointmentId);

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function recordPayment(payload: {
  appointmentId: string;
  method: "pix" | "card" | "cash" | "other";
  amount: number;
  transactionId?: string | null;
}): Promise<ActionResult<{ paymentId: string }>> {

  await requireDashboardAccessForServerAction();
  const parsed = recordPaymentSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const chargeSnapshot = await getCheckoutChargeSnapshot(parsed.data.appointmentId);
  if (chargeSnapshot.remaining <= 0) {
    return fail(new AppError("Este atendimento já está com pagamento quitado.", "VALIDATION_ERROR", 400));
  }

  const requestedAmount = roundCurrency(parsed.data.amount);
  if (requestedAmount > chargeSnapshot.remaining + 0.01) {
    return fail(
      new AppError(
        "O valor informado é maior que o saldo atual do atendimento. Atualize o checkout e tente novamente.",
        "VALIDATION_ERROR",
        400
      )
    );
  }

  let transactionId = parsed.data.transactionId ?? null;

  if (!transactionId) {
    const description = `Pagamento Atendimento #${parsed.data.appointmentId.slice(0, 8)}`;
    const { data: transactionData, error: transactionError } = await insertTransaction({
      tenant_id: FIXED_TENANT_ID,
      appointment_id: parsed.data.appointmentId,
      type: "income",
      category: "Serviço",
      description,
      amount: requestedAmount,
      payment_method: parsed.data.method,
    });

    if (!transactionError && transactionData && Array.isArray(transactionData) && transactionData[0]) {
      transactionId = transactionData[0].id;
    }
  }

  const { data, error } = await supabase
    .from("appointment_payments")
    .insert({
      appointment_id: parsed.data.appointmentId,
      tenant_id: FIXED_TENANT_ID,
      method: parsed.data.method,
      amount: requestedAmount,
      status: "paid",
      paid_at: new Date().toISOString(),
      transaction_id: transactionId,
    })
    .select("id")
    .single();

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  await updatePaymentStatus(parsed.data.appointmentId);

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "payment_recorded",
    payload: { method: parsed.data.method, amount: requestedAmount },
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ paymentId: data?.id ?? parsed.data.appointmentId });
}

export async function createAttendancePixPayment(payload: {
  appointmentId: string;
  amount: number;
  payerName: string;
  payerPhone: string;
  payerEmail?: string | null;
  attempt?: number;
}): Promise<ActionResult<{
  id: string;
  order_id: string;
  internal_status: "paid" | "pending" | "failed";
  status: string;
  ticket_url: string | null;
  qr_code: string | null;
  qr_code_base64: string | null;
  transaction_amount: number;
  created_at: string;
  expires_at: string;
}>> {
  await requireDashboardAccessForServerAction();
  const parsed = z
    .object({
      appointmentId: z.string().uuid(),
      amount: z.number().positive(),
      payerName: z.string().min(2),
      payerPhone: z.string().min(8),
      payerEmail: z.string().email().optional().nullable(),
      attempt: z.number().int().min(0).optional(),
    })
    .safeParse(payload);

  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const chargeSnapshot = await getCheckoutChargeSnapshot(parsed.data.appointmentId);
  if (chargeSnapshot.remaining <= 0) {
    return fail(new AppError("Este atendimento já está com pagamento quitado.", "VALIDATION_ERROR", 400));
  }
  const chargeAmount = chargeSnapshot.remaining;

  const result = await createPixOrderForAppointment({
    appointmentId: parsed.data.appointmentId,
    tenantId: FIXED_TENANT_ID,
    amount: chargeAmount,
    payerName: parsed.data.payerName,
    payerPhone: parsed.data.payerPhone,
    payerEmail: parsed.data.payerEmail,
    attempt: parsed.data.attempt,
  });
  if (!result.ok) return result;

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "payment_pix_created",
    payload: {
      payment_id: result.data.id,
      order_id: result.data.order_id,
      amount: result.data.transaction_amount,
      status: result.data.internal_status,
    },
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok(result.data);
}

export async function getAttendancePixPaymentStatus(payload: {
  appointmentId: string;
}): Promise<ActionResult<{ internal_status: "paid" | "pending" | "failed" }>> {

  await requireDashboardAccessForServerAction();
  const parsed = appointmentIdSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  return getAppointmentPaymentStatusByMethod({
    appointmentId: parsed.data.appointmentId,
    tenantId: FIXED_TENANT_ID,
    method: "pix",
  });
}

export async function createAttendancePointPayment(payload: {
  appointmentId: string;
  amount: number;
  cardMode: PointCardMode;
  terminalId?: string | null;
}): Promise<ActionResult<{
  id: string;
  order_id: string;
  internal_status: "paid" | "pending" | "failed";
  status: string;
  status_detail: string | null;
  transaction_amount: number;
  point_terminal_id: string;
  card_mode: PointCardMode;
}>> {
  await requireDashboardAccessForServerAction();
  const parsed = z
    .object({
      appointmentId: z.string().uuid(),
      amount: z.number().positive(),
      cardMode: z.enum(["debit", "credit"]),
      terminalId: z.string().optional().nullable(),
    })
    .safeParse(payload);

  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  let terminalId = parsed.data.terminalId?.trim() ?? "";
  if (!terminalId) {
    const { data: settings, error } = await getSettings(FIXED_TENANT_ID);
    const mapped = mapSupabaseError(error);
    if (mapped) return fail(mapped);
    terminalId = settings?.mp_point_terminal_id?.trim() ?? "";
  }

  if (!terminalId) {
    return fail(
      new AppError(
        "Nenhuma maquininha Point configurada. Ajuste em Configurações antes de cobrar.",
        "VALIDATION_ERROR",
        400
      )
    );
  }

  const chargeSnapshot = await getCheckoutChargeSnapshot(parsed.data.appointmentId);
  if (chargeSnapshot.remaining <= 0) {
    return fail(new AppError("Este atendimento já está com pagamento quitado.", "VALIDATION_ERROR", 400));
  }
  const chargeAmount = chargeSnapshot.remaining;

  const result = await createPointOrderForAppointment({
    appointmentId: parsed.data.appointmentId,
    tenantId: FIXED_TENANT_ID,
    amount: chargeAmount,
    terminalId,
    cardMode: parsed.data.cardMode,
  });
  if (!result.ok) return result;

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "payment_point_charge_started",
    payload: {
      payment_id: result.data.id,
      order_id: result.data.order_id,
      amount: result.data.transaction_amount,
      card_mode: result.data.card_mode,
      point_terminal_id: result.data.point_terminal_id,
      status: result.data.internal_status,
    },
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok(result.data);
}

export async function getAttendancePointPaymentStatus(payload: {
  appointmentId: string;
  orderId: string;
}): Promise<ActionResult<{
  id: string;
  order_id: string;
  internal_status: "paid" | "pending" | "failed";
  status: string;
  status_detail: string | null;
  transaction_amount: number;
  point_terminal_id: string | null;
  card_mode: PointCardMode | null;
  appointment_id: string | null;
}>> {
  await requireDashboardAccessForServerAction();
  const parsed = z
    .object({
      appointmentId: z.string().uuid(),
      orderId: z.string().min(4),
    })
    .safeParse(payload);

  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const result = await getPointOrderStatus({
    orderId: parsed.data.orderId,
    tenantId: FIXED_TENANT_ID,
  });
  if (!result.ok) return result;

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "payment_point_charge_status",
    payload: {
      payment_id: result.data.id,
      order_id: result.data.order_id,
      status: result.data.internal_status,
      status_detail: result.data.status_detail,
      amount: result.data.transaction_amount,
    },
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok(result.data);
}

export async function confirmCheckout(payload: { appointmentId: string }): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
  const parsed = appointmentIdSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos", "VALIDATION_ERROR", 400, parsed.error));
  }

  const supabase = createServiceClient();
  const { paid, total } = await updatePaymentStatus(parsed.data.appointmentId);
  if (paid < total) {
    return fail(new AppError("Pagamento insuficiente", "VALIDATION_ERROR", 400));
  }

  const { error } = await supabase
    .from("appointment_checkout")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("appointment_id", parsed.data.appointmentId);

  const mapped = mapSupabaseError(error);
  if (mapped) return fail(mapped);

  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "checkout_confirmed",
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function startTimer(payload: { appointmentId: string; plannedSeconds?: number | null }): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
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

export async function pauseTimer(payload: { appointmentId: string }): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
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

export async function resumeTimer(payload: { appointmentId: string }): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
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

export async function syncTimer(payload: {
  appointmentId: string;
  timerStatus: "idle" | "running" | "paused" | "finished";
  timerStartedAt: string | null;
  timerPausedAt: string | null;
  pausedTotalSeconds: number;
  plannedSeconds: number | null;
  actualSeconds?: number | null;
}): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
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

export async function savePost(payload: {
  appointmentId: string;
  postNotes?: string | null;
  followUpDueAt?: string | null;
  followUpNote?: string | null;
  surveyStatus?: "not_sent" | "sent" | "answered";
  surveyScore?: number | null;
  kpiTotalSeconds?: number | null;
}): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
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

export async function finishAttendance(payload: { appointmentId: string }): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
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

export async function sendSurvey(payload: { appointmentId: string; message?: string | null }): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
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
  await insertMessageLog({
    appointmentId: parsed.data.appointmentId,
    type: "post_survey",
    status: "sent_manual",
    sentAt: new Date().toISOString(),
    payload: parsed.data.message ? { message: parsed.data.message } : null,
  });
  await insertAttendanceEvent({
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "survey_sent",
  });
  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}

export async function recordSurveyAnswer(payload: { appointmentId: string; score: number }): Promise<ActionResult<{ appointmentId: string }>> {

  await requireDashboardAccessForServerAction();
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
    tenantId: FIXED_TENANT_ID,
    appointmentId: parsed.data.appointmentId,
    eventType: "survey_answered",
    payload: { score: parsed.data.score },
  });

  revalidatePath(`/atendimento/${parsed.data.appointmentId}`);
  return ok({ appointmentId: parsed.data.appointmentId });
}
