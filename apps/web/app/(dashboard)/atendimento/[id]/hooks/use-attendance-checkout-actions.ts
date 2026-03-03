import type { AttendanceOverview, CheckoutItem } from "../../../../../lib/attendance/attendance-types";
import {
  createAttendancePixPayment,
  createAttendancePointPayment,
  getAttendancePixPaymentStatus,
  getAttendancePointPaymentStatus,
  recordPayment,
  sendMessage,
  setCheckoutItems,
  setDiscount,
  waiveCheckoutPayment,
} from "../actions";
import { applyAutoMessageTemplate } from "../../../../../src/shared/auto-messages.utils";
import type { AutoMessageTemplates } from "../../../../../src/shared/auto-messages.types";
import { buildAppointmentReceiptPath } from "../../../../../src/shared/public-links";
import { feedbackById, feedbackFromError, type UserFeedback } from "../../../../../src/shared/feedback/user-feedback";
import { normalizePhoneForWhatsapp, resolvePublicBaseUrl } from "../attendance-page.helpers";

interface UseAttendanceCheckoutActionsParams {
  appointment: AttendanceOverview["appointment"];
  clientName: string;
  contactPhone: string | null;
  publicBaseUrl: string;
  messageTemplates: AutoMessageTemplates;
  showToast: (input: UserFeedback) => void;
  refreshPage: () => void;
}

export function useAttendanceCheckoutActions({
  appointment,
  clientName,
  contactPhone,
  publicBaseUrl,
  messageTemplates,
  showToast,
  refreshPage,
}: UseAttendanceCheckoutActionsParams) {
  const handleSaveItems = async (
    items: Array<{ type: CheckoutItem["type"]; label: string; qty: number; amount: number }>
  ) => {
    const result = await setCheckoutItems({ appointmentId: appointment.id, items });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return false;
    }
    showToast(feedbackById("generic_saved", { tone: "success", message: "Itens atualizados." }));
    refreshPage();
    return true;
  };

  const handleSetDiscount = async (type: "value" | "pct" | null, value: number | null, reason?: string) => {
    const result = await setDiscount({
      appointmentId: appointment.id,
      type,
      value,
      reason: reason ?? null,
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return false;
    }
    showToast(feedbackById("generic_saved", { tone: "success", message: "Desconto aplicado." }));
    refreshPage();
    return true;
  };

  const handleRegisterCashPayment = async (amount: number) => {
    const result = await recordPayment({
      appointmentId: appointment.id,
      method: "cash",
      amount,
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return { ok: false, paymentId: null };
    }
    showToast(feedbackById("payment_recorded"));
    refreshPage();
    return { ok: true, paymentId: result.data.paymentId };
  };

  const handleRegisterPixKeyPayment = async (amount: number) => {
    const result = await recordPayment({
      appointmentId: appointment.id,
      method: "pix",
      amount,
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return { ok: false, paymentId: null };
    }
    showToast(feedbackById("payment_recorded"));
    refreshPage();
    return { ok: true, paymentId: result.data.paymentId };
  };

  const handleCreatePixPayment = async (amount: number, attempt: number) => {
    const payerPhone = appointment.clients?.phone ?? "";
    const digits = payerPhone.replace(/\D/g, "");
    if (!digits || digits.length < 10) {
      showToast(feedbackById("whatsapp_missing_phone"));
      return { ok: false as const };
    }
    const result = await createAttendancePixPayment({
      appointmentId: appointment.id,
      amount,
      payerName: clientName,
      payerPhone,
      payerEmail: null,
      attempt,
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "payment_pix"));
      return { ok: false as const };
    }
    showToast(feedbackById("payment_pix_generated"));
    refreshPage();
    return { ok: true as const, data: result.data };
  };

  const handlePollPixStatus = async () => {
    const result = await getAttendancePixPaymentStatus({ appointmentId: appointment.id });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "payment_pix"));
      return { ok: false as const, status: "pending" as const };
    }

    const status = result.data.internal_status;
    if (status === "paid") {
      showToast(feedbackById("payment_recorded"));
      refreshPage();
    } else if (status === "failed") {
      showToast(feedbackById("payment_pix_failed"));
      refreshPage();
    }

    return { ok: true as const, status };
  };

  const handleCreatePointPayment = async (amount: number, cardMode: "debit" | "credit", attempt: number) => {
    const result = await createAttendancePointPayment({
      appointmentId: appointment.id,
      amount,
      cardMode,
      attempt,
    });

    if (!result.ok) {
      showToast(feedbackFromError(result.error, "payment_card"));
      return { ok: false as const };
    }

    if (result.data.internal_status === "paid") {
      showToast(feedbackById("payment_recorded"));
      refreshPage();
    } else {
      showToast(
        feedbackById("payment_pending", {
          message: "Cobrança enviada para a maquininha. Aguarde a confirmação.",
          durationMs: 2200,
        })
      );
    }

    return { ok: true as const, data: result.data };
  };

  const handlePollPointStatus = async (orderId: string) => {
    const result = await getAttendancePointPaymentStatus({
      appointmentId: appointment.id,
      orderId,
    });

    if (!result.ok) {
      showToast(feedbackFromError(result.error, "payment_card"));
      return { ok: false as const, status: "pending" as const, paymentId: null };
    }

    const status = result.data.internal_status;
    if (status === "paid") {
      showToast(feedbackById("payment_recorded"));
      refreshPage();
    } else if (status === "failed") {
      showToast(feedbackById("payment_card_declined"));
      refreshPage();
    }

    return { ok: true as const, status, paymentId: result.data.id };
  };

  const handleSendReceipt = async (paymentId: string) => {
    const phone = normalizePhoneForWhatsapp(contactPhone);
    if (!phone) {
      showToast(feedbackById("whatsapp_missing_phone"));
      return;
    }

    const baseUrl = resolvePublicBaseUrl(publicBaseUrl);
    const receiptPath = buildAppointmentReceiptPath({
      appointmentId: appointment.id,
      attendanceCode: appointment.attendance_code ?? null,
    });
    const receiptLink = baseUrl
      ? `${baseUrl}${receiptPath}`
      : `${window.location.origin}${receiptPath}`;
    const greeting = clientName ? `Olá, ${clientName}!` : "Olá!";
    const message = applyAutoMessageTemplate(messageTemplates.payment_receipt, {
      greeting,
      service_name: appointment.service_name ?? "atendimento",
      receipt_link_block: `🧾 Acesse seu recibo digital aqui:\n${receiptLink}\n\n`,
    }).trim();

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");

    void sendMessage({
      appointmentId: appointment.id,
      type: "payment_receipt",
      channel: "whatsapp",
      payload: {
        message,
        payment_id: paymentId,
        receipt_link: receiptLink,
      },
    }).then((result) => {
      if (!result.ok) {
        showToast(feedbackFromError(result.error, "whatsapp"));
        return;
      }
      showToast(feedbackById("message_recorded"));
    });
  };

  const handleWaiveCheckoutPayment = async () => {
    const result = await waiveCheckoutPayment({
      appointmentId: appointment.id,
      reason: "Cortesia",
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      return { ok: false as const };
    }

    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: "Pagamento liberado como cortesia.",
      })
    );
    refreshPage();
    return { ok: true as const };
  };

  return {
    handleSaveItems,
    handleSetDiscount,
    handleRegisterCashPayment,
    handleRegisterPixKeyPayment,
    handleCreatePixPayment,
    handlePollPixStatus,
    handleCreatePointPayment,
    handlePollPointStatus,
    handleSendReceipt,
    handleWaiveCheckoutPayment,
  };
}
