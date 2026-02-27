"use server";

import type { Json } from "../../../../lib/supabase/types";
import type { ActionResult } from "../../../../src/shared/errors/result";
import { requireDashboardAccessForServerAction } from "../../../../src/modules/auth/dashboard-access";
import type { PointCardMode } from "../../../../src/modules/payments/mercadopago-orders";
import {
  pauseTimerOperation,
  resumeTimerOperation,
  startTimerOperation,
  syncTimerOperation,
} from "../../../../src/modules/attendance/timer-actions";
import {
  cancelPreConfirmationImpl,
  confirmPreImpl,
  getAttendanceImpl,
  recordMessageStatusImpl,
  recordSurveyAnswerImpl,
  sendMessageImpl,
  sendReminder24hImpl,
  sendSurveyImpl,
} from "./actions/communication";
import {
  finishAttendanceImpl,
  saveEvolutionImpl,
  saveInternalNotesImpl,
  savePostImpl,
  structureEvolutionFromAudioImpl,
  toggleChecklistItemImpl,
  transcribeEvolutionFromAudioImpl,
  upsertChecklistImpl,
} from "./actions/checklist-evolution";
import {
  confirmCheckoutImpl,
  recordPaymentImpl,
  setCheckoutItemsImpl,
  setDiscountImpl,
  waiveCheckoutPaymentImpl,
} from "./actions/checkout-finance";
import {
  createAttendancePixPaymentImpl,
  createAttendancePointPaymentImpl,
  getAttendancePixPaymentStatusImpl,
  getAttendancePointPaymentStatusImpl,
} from "./actions/payment-provider";

export async function getAttendance(appointmentId: string) {
  await requireDashboardAccessForServerAction();
  return getAttendanceImpl(appointmentId);
}

export async function confirmPre(payload: { appointmentId: string; channel?: string }): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return confirmPreImpl(payload);
}

export async function cancelPreConfirmation(payload: { appointmentId: string }): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return cancelPreConfirmationImpl(payload);
}

export async function sendReminder24h(payload: { appointmentId: string; message?: string | null }): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return sendReminder24hImpl(payload);
}

export async function sendMessage(payload: {
  appointmentId: string;
  type: "created_confirmation" | "reminder_24h" | "post_survey" | "payment_charge" | "payment_receipt";
  channel?: string | null;
  payload?: Json | null;
}): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return sendMessageImpl(payload);
}

export async function recordMessageStatus(payload: {
  appointmentId: string;
  messageId: string;
  status: "drafted" | "sent_manual" | "sent_auto" | "delivered" | "failed";
}): Promise<ActionResult<{ messageId: string }>> {
  await requireDashboardAccessForServerAction();
  return recordMessageStatusImpl(payload);
}

export async function saveInternalNotes(payload: { appointmentId: string; internalNotes?: string | null }): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return saveInternalNotesImpl(payload);
}

export async function toggleChecklistItem(payload: { appointmentId: string; itemId: string; completed: boolean }): Promise<ActionResult<{ itemId: string }>> {
  await requireDashboardAccessForServerAction();
  return toggleChecklistItemImpl(payload);
}

export async function upsertChecklist(payload: {
  appointmentId: string;
  items: Array<{ id?: string; label: string; sortOrder: number; completed?: boolean }>;
}): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return upsertChecklistImpl(payload);
}

export async function saveEvolution(payload: {
  appointmentId: string;
  payload: {
    text?: string | null;
  };
}): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return saveEvolutionImpl(payload);
}

export async function structureEvolutionFromAudio(payload: {
  appointmentId: string;
  transcript: string;
}): Promise<ActionResult<{ transcript: string; structuredText: string }>> {
  await requireDashboardAccessForServerAction();
  return structureEvolutionFromAudioImpl(payload);
}

export async function transcribeEvolutionFromAudio(payload: {
  appointmentId: string;
  audioBase64: string;
  mimeType?: string | null;
}): Promise<ActionResult<{ transcript: string }>> {
  await requireDashboardAccessForServerAction();
  return transcribeEvolutionFromAudioImpl(payload);
}

export async function setCheckoutItems(payload: {
  appointmentId: string;
  items: Array<{ type: "service" | "fee" | "addon" | "adjustment"; label: string; qty?: number; amount: number; metadata?: Record<string, unknown> }>;
}): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return setCheckoutItemsImpl(payload);
}

export async function setDiscount(payload: {
  appointmentId: string;
  type: "value" | "pct" | null;
  value: number | null;
  reason?: string | null;
}): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return setDiscountImpl(payload);
}

export async function recordPayment(payload: {
  appointmentId: string;
  method: "pix" | "card" | "cash" | "other";
  amount: number;
  transactionId?: string | null;
}): Promise<ActionResult<{ paymentId: string }>> {
  await requireDashboardAccessForServerAction();
  return recordPaymentImpl(payload);
}

export async function waiveCheckoutPayment(payload: {
  appointmentId: string;
  reason?: string | null;
}): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return waiveCheckoutPaymentImpl(payload);
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
  return createAttendancePixPaymentImpl(payload);
}

export async function getAttendancePixPaymentStatus(payload: {
  appointmentId: string;
}): Promise<ActionResult<{ internal_status: "paid" | "pending" | "failed" }>> {
  await requireDashboardAccessForServerAction();
  return getAttendancePixPaymentStatusImpl(payload);
}

export async function createAttendancePointPayment(payload: {
  appointmentId: string;
  amount: number;
  cardMode: PointCardMode;
  terminalId?: string | null;
  attempt?: number;
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
  return createAttendancePointPaymentImpl(payload);
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
  return getAttendancePointPaymentStatusImpl(payload);
}

export async function confirmCheckout(payload: { appointmentId: string }): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return confirmCheckoutImpl(payload);
}

export async function startTimer(payload: { appointmentId: string; plannedSeconds?: number | null }): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return startTimerOperation(payload);
}

export async function pauseTimer(payload: { appointmentId: string }): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return pauseTimerOperation(payload);
}

export async function resumeTimer(payload: { appointmentId: string }): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return resumeTimerOperation(payload);
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
  return syncTimerOperation(payload);
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
  return savePostImpl(payload);
}

export async function finishAttendance(payload: { appointmentId: string }): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return finishAttendanceImpl(payload);
}

export async function sendSurvey(payload: { appointmentId: string; message?: string | null }): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return sendSurveyImpl(payload);
}

export async function recordSurveyAnswer(payload: { appointmentId: string; score: number }): Promise<ActionResult<{ appointmentId: string }>> {
  await requireDashboardAccessForServerAction();
  return recordSurveyAnswerImpl(payload);
}
