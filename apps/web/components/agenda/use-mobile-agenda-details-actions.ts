import { format } from "date-fns";
import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { cancelAppointment } from "../../app/actions";
import {
  confirmPre,
  recordPayment,
  saveEvolution,
  sendMessage,
  sendReminder24h,
  structureEvolutionFromAudio,
} from "../../app/(dashboard)/atendimento/[id]/actions";
import { buildAppointmentReceiptPath } from "../../src/shared/public-links";
import { feedbackById, feedbackFromError } from "../../src/shared/feedback/user-feedback";
import type { AttendanceOverview, MessageType } from "../../lib/attendance/attendance-types";
import { buildAgendaMessage, resolvePublicBaseUrl, toWhatsappLink } from "./mobile-agenda-messages";

interface UseMobileAgendaDetailsActionsParams {
  detailsData: AttendanceOverview | null;
  publicBaseUrl: string;
  view: "day" | "week" | "month";
  selectedDate: Date;
  router: AppRouterInstance;
  closeDetails: () => void;
  showToast: (input: { title?: string; message: string; tone?: "success" | "error" | "warning" | "info"; durationMs?: number } | string) => void;
  refreshAttendanceDetails: (appointmentId: string) => Promise<void>;
  setDetailsActionPending: Dispatch<SetStateAction<boolean>>;
}

export function useMobileAgendaDetailsActions({
  detailsData,
  publicBaseUrl,
  view,
  selectedDate,
  router,
  closeDetails,
  showToast,
  refreshAttendanceDetails,
  setDetailsActionPending,
}: UseMobileAgendaDetailsActionsParams) {
  const openWhatsapp = useCallback((phone: string | null | undefined, message: string) => {
    const link = toWhatsappLink(phone);
    if (!link) return false;
    const url = `${link}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    return true;
  }, []);

  const handleSendMessage = useCallback(
    async (type: MessageType) => {
      if (!detailsData) return;
      const phone = detailsData.appointment.clients?.phone ?? null;
      if (!phone) {
        showToast(feedbackById("whatsapp_missing_phone"));
        return;
      }
      setDetailsActionPending(true);
      const message = buildAgendaMessage(type, detailsData.appointment, publicBaseUrl);
      openWhatsapp(phone, message);
      const result = await sendMessage({
        appointmentId: detailsData.appointment.id,
        type,
        channel: "whatsapp",
        payload: { message },
      });
      if (!result?.ok) {
        showToast(feedbackFromError(result?.error, "whatsapp"));
        setDetailsActionPending(false);
        return;
      }
      showToast(feedbackById("message_recorded"));
      await refreshAttendanceDetails(detailsData.appointment.id);
      router.refresh();
      setDetailsActionPending(false);
    },
    [detailsData, openWhatsapp, publicBaseUrl, refreshAttendanceDetails, router, setDetailsActionPending, showToast]
  );

  const handleSendPaymentCharge = useCallback(async () => {
    if (!detailsData) return;
    const phone = detailsData.appointment.clients?.phone ?? null;
    if (!phone) {
      showToast(feedbackById("whatsapp_missing_phone"));
      return;
    }

    const totalAmount = Number(detailsData.checkout?.total ?? detailsData.appointment.price ?? 0);
    const paidAmount = (detailsData.payments ?? [])
      .filter((payment) => payment.status === "paid")
      .reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0);
    const remainingAmount = Math.max(totalAmount - paidAmount, 0);

    setDetailsActionPending(true);
    const message = buildAgendaMessage("payment_charge", detailsData.appointment, publicBaseUrl, {
      chargeAmount: remainingAmount,
    });
    openWhatsapp(phone, message);

    const result = await sendMessage({
      appointmentId: detailsData.appointment.id,
      type: "payment_charge",
      channel: "whatsapp",
      payload: { message, remaining_amount: remainingAmount },
    });

    if (!result.ok) {
      showToast(feedbackFromError(result.error, "whatsapp"));
      setDetailsActionPending(false);
      return;
    }

    showToast(feedbackById("message_recorded"));
    await refreshAttendanceDetails(detailsData.appointment.id);
    router.refresh();
    setDetailsActionPending(false);
  }, [detailsData, openWhatsapp, publicBaseUrl, refreshAttendanceDetails, router, setDetailsActionPending, showToast]);

  const handleSendPaymentReceipt = useCallback(
    async (paymentId: string | null) => {
      if (!detailsData || !paymentId) return;
      const phone = detailsData.appointment.clients?.phone ?? null;
      if (!phone) {
        showToast(feedbackById("whatsapp_missing_phone"));
        return;
      }

      setDetailsActionPending(true);
      const base = resolvePublicBaseUrl(publicBaseUrl);
      const receiptPath = buildAppointmentReceiptPath({
        appointmentId: detailsData.appointment.id,
        attendanceCode: detailsData.appointment.attendance_code ?? null,
      });
      const receiptLink = base && receiptPath ? `${base}${receiptPath}` : "";
      const message = buildAgendaMessage("payment_receipt", detailsData.appointment, publicBaseUrl, { paymentId });
      openWhatsapp(phone, message);

      const result = await sendMessage({
        appointmentId: detailsData.appointment.id,
        type: "payment_receipt",
        channel: "whatsapp",
        payload: { message, payment_id: paymentId, receipt_link: receiptLink || null },
      });

      if (!result.ok) {
        showToast(feedbackFromError(result.error, "whatsapp"));
        setDetailsActionPending(false);
        return;
      }

      showToast(feedbackById("message_recorded"));
      await refreshAttendanceDetails(detailsData.appointment.id);
      router.refresh();
      setDetailsActionPending(false);
    },
    [detailsData, openWhatsapp, publicBaseUrl, refreshAttendanceDetails, router, setDetailsActionPending, showToast]
  );

  const handleSendReminder = useCallback(async () => {
    if (!detailsData) return;
    const phone = detailsData.appointment.clients?.phone ?? null;
    if (!phone) {
      showToast(feedbackById("whatsapp_missing_phone"));
      return;
    }
    setDetailsActionPending(true);
    const message = buildAgendaMessage("reminder_24h", detailsData.appointment, publicBaseUrl);
    openWhatsapp(phone, message);
    const result = await sendReminder24h({ appointmentId: detailsData.appointment.id, message });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "whatsapp"));
      setDetailsActionPending(false);
      return;
    }
    showToast(feedbackById("reminder_recorded"));
    await refreshAttendanceDetails(detailsData.appointment.id);
    router.refresh();
    setDetailsActionPending(false);
  }, [detailsData, openWhatsapp, publicBaseUrl, refreshAttendanceDetails, router, setDetailsActionPending, showToast]);

  const handleSendSurvey = useCallback(async () => {
    if (!detailsData) return;
    const phone = detailsData.appointment.clients?.phone ?? null;
    if (!phone) {
      showToast(feedbackById("whatsapp_missing_phone"));
      return;
    }

    setDetailsActionPending(true);
    const message = buildAgendaMessage("post_survey", detailsData.appointment, publicBaseUrl);
    openWhatsapp(phone, message);

    const result = await sendMessage({
      appointmentId: detailsData.appointment.id,
      type: "post_survey",
      channel: "whatsapp",
      payload: { message },
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "whatsapp"));
      setDetailsActionPending(false);
      return;
    }

    showToast(feedbackById("message_recorded"));
    await refreshAttendanceDetails(detailsData.appointment.id);
    router.refresh();
    setDetailsActionPending(false);
  }, [detailsData, openWhatsapp, publicBaseUrl, refreshAttendanceDetails, router, setDetailsActionPending, showToast]);

  const handleConfirmClient = useCallback(async () => {
    if (!detailsData) return;
    setDetailsActionPending(true);
    const result = await confirmPre({ appointmentId: detailsData.appointment.id, channel: "manual" });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      setDetailsActionPending(false);
      return;
    }
    showToast(feedbackById("client_confirmed"));
    await refreshAttendanceDetails(detailsData.appointment.id);
    router.refresh();
    setDetailsActionPending(false);
  }, [detailsData, refreshAttendanceDetails, router, setDetailsActionPending, showToast]);

  const handleCancelAppointment = useCallback(
    async (options?: { notifyClient?: boolean }) => {
      if (!detailsData) return;
      setDetailsActionPending(true);
      const result = await cancelAppointment(detailsData.appointment.id, options);
      if (!result.ok) {
        showToast(feedbackFromError(result.error, "attendance"));
        setDetailsActionPending(false);
        return;
      }
      showToast(feedbackById("appointment_cancelled"));
      closeDetails();
      router.refresh();
      setDetailsActionPending(false);
    },
    [closeDetails, detailsData, router, setDetailsActionPending, showToast]
  );

  const handleRecordPayment = useCallback(
    async (payload: { type: "signal" | "full"; amount: number; method: "pix" | "card" | "cash" | "other" }) => {
      if (!detailsData) return;
      if (!payload.amount || payload.amount <= 0) {
        showToast(feedbackById("payment_invalid_amount"));
        return;
      }
      setDetailsActionPending(true);
      const result = await recordPayment({
        appointmentId: detailsData.appointment.id,
        method: payload.method,
        amount: payload.amount,
      });
      if (!result.ok) {
        showToast(feedbackFromError(result.error, "attendance"));
        setDetailsActionPending(false);
        return;
      }
      showToast(
        feedbackById("generic_saved", {
          tone: "success",
          message: payload.type === "signal" ? "Sinal registrado." : "Pagamento integral registrado.",
        })
      );
      await refreshAttendanceDetails(detailsData.appointment.id);
      router.refresh();
      setDetailsActionPending(false);
    },
    [detailsData, refreshAttendanceDetails, router, setDetailsActionPending, showToast]
  );

  const handleSaveEvolutionFromDetails = useCallback(
    async (text: string) => {
      if (!detailsData) return { ok: false as const };
      setDetailsActionPending(true);
      const result = await saveEvolution({
        appointmentId: detailsData.appointment.id,
        payload: {
          text,
        },
      });
      if (!result.ok) {
        showToast(feedbackFromError(result.error, "attendance"));
        setDetailsActionPending(false);
        return { ok: false as const };
      }

      showToast(
        feedbackById("generic_saved", {
          tone: "success",
          message: "Evolução salva.",
        })
      );
      await refreshAttendanceDetails(detailsData.appointment.id);
      router.refresh();
      setDetailsActionPending(false);
      return { ok: true as const };
    },
    [detailsData, refreshAttendanceDetails, router, setDetailsActionPending, showToast]
  );

  const handleStructureEvolutionFromDetails = useCallback(
    async (text: string) => {
      if (!detailsData) return { ok: false as const, structuredText: null };
      setDetailsActionPending(true);
      const result = await structureEvolutionFromAudio({
        appointmentId: detailsData.appointment.id,
        transcript: text,
      });
      if (!result.ok) {
        showToast(feedbackFromError(result.error, "attendance"));
        setDetailsActionPending(false);
        return { ok: false as const, structuredText: null };
      }

      showToast(
        feedbackById("generic_saved", {
          tone: "success",
          message: "Flora organizou a evolução.",
        })
      );
      setDetailsActionPending(false);
      return { ok: true as const, structuredText: result.data.structuredText };
    },
    [detailsData, setDetailsActionPending, showToast]
  );

  const handleOpenAttendance = useCallback(() => {
    if (!detailsData) return;
    const returnTo = `/?view=${view}&date=${format(selectedDate, "yyyy-MM-dd")}`;
    closeDetails();
    router.push(`/atendimento/${detailsData.appointment.id}?return=${encodeURIComponent(returnTo)}`);
  }, [closeDetails, detailsData, router, selectedDate, view]);

  return {
    handleSendMessage,
    handleSendPaymentCharge,
    handleSendPaymentReceipt,
    handleSendReminder,
    handleSendSurvey,
    handleConfirmClient,
    handleCancelAppointment,
    handleRecordPayment,
    handleSaveEvolutionFromDetails,
    handleStructureEvolutionFromDetails,
    handleOpenAttendance,
  };
}
