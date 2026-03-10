import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AttendanceOverview } from "../../lib/attendance/attendance-types";
import type { AutoMessageTemplates } from "../../src/shared/auto-messages.types";
import { applyAutoMessageTemplate } from "../../src/shared/auto-messages.utils";
import { formatCurrencyBRL } from "../../src/shared/currency";
import { feedbackById, type UserFeedback } from "../../src/shared/feedback/user-feedback";
import { buildAppointmentPaymentPath, buildAppointmentReceiptPath } from "../../src/shared/public-links";
import {
  getAutomationStatusLabel,
  getInitials,
  getStatusInfo,
  isMessageSent,
  messageByRawType,
  messageByType,
  paymentStatusMap,
  type PaymentStatus,
} from "./appointment-details-sheet.helpers";

type Params = {
  details: AttendanceOverview | null;
  attendanceCode: string | null;
  signalPercentage: number;
  publicBaseUrl: string;
  messageTemplates: AutoMessageTemplates;
  onNotify?: (feedback: UserFeedback) => void;
};

export function useAppointmentDetailsSheetViewModel({
  details,
  attendanceCode,
  signalPercentage,
  publicBaseUrl,
  messageTemplates,
  onNotify,
}: Params) {
  const appointment = details?.appointment ?? null;
  const attendance = details?.attendance ?? null;
  const messages = details?.messages ?? [];
  const clientName = appointment?.clients?.name?.trim() ?? "";
  const clientInitials = getInitials(clientName);
  const isVip = Boolean(appointment?.clients?.is_vip);
  const avatarUrl = appointment?.clients?.avatar_url ?? null;
  const startDate = appointment?.start_time ? new Date(appointment.start_time) : null;
  const dateLabel = startDate ? format(startDate, "dd MMM", { locale: ptBR }) : "";
  const timeLabel = startDate ? format(startDate, "HH:mm", { locale: ptBR }) : "";

  const appointmentAddress = [
    appointment?.address_logradouro,
    appointment?.address_numero,
    appointment?.address_complemento,
    appointment?.address_bairro,
    appointment?.address_cidade,
    appointment?.address_estado,
  ]
    .filter((value) => value && value.trim().length > 0)
    .join(", ");

  const clientAddress = [
    appointment?.clients?.address_logradouro,
    appointment?.clients?.address_numero,
    appointment?.clients?.address_complemento,
    appointment?.clients?.address_bairro,
    appointment?.clients?.address_cidade,
    appointment?.clients?.address_estado,
  ]
    .filter((value) => value && value.trim().length > 0)
    .join(", ");

  const isHomeVisit = typeof appointment?.is_home_visit === "boolean"
    ? appointment.is_home_visit
    : appointmentAddress.length > 0;
  const addressLine = appointmentAddress || clientAddress;

  const createdAutoMessage = messageByRawType(messages, "auto_appointment_created");
  const reminderAutoMessage = messageByRawType(messages, "auto_appointment_reminder");
  const paymentChargeMessage = messageByType(messages, "payment_charge");
  const paymentReceiptMessage = messageByType(messages, "payment_receipt");
  const postSurveyMessage = messageByType(messages, "post_survey");
  const appointmentStatus = appointment?.status ?? "pending";
  const isCompleted = appointmentStatus === "completed";
  const shouldShowConfirmed = ["confirmed", "in_progress", "completed"].includes(appointmentStatus);
  const confirmedAt = shouldShowConfirmed ? attendance?.confirmed_at ?? null : null;
  const isConfirmed = Boolean(confirmedAt);
  const confirmedLabel = confirmedAt ? format(new Date(confirmedAt), "dd MMM 'às' HH:mm", { locale: ptBR }) : "";
  const confirmedText = confirmedLabel ? `Confirmado em ${confirmedLabel}` : "Confirmado";
  const statusInfo = getStatusInfo(appointment?.status ?? "pending");
  const appointmentStatusDot = statusInfo.dotClass ?? "bg-amber-400";
  const rawPaymentStatus = appointment?.payment_status ?? "pending";
  const paymentStatus = Object.prototype.hasOwnProperty.call(paymentStatusMap, rawPaymentStatus)
    ? (rawPaymentStatus as PaymentStatus)
    : "pending";
  const paymentInfo = paymentStatusMap[paymentStatus];
  const hasAddress = addressLine.length > 0;
  const mapsHref = isHomeVisit && hasAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`
    : null;
  const payments = details?.payments ?? [];
  const paidPayments = payments.filter((payment) => payment.status === "paid");
  const paidAmount = paidPayments.reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0);
  const lastPaid = paidPayments.length > 0 ? paidPayments[paidPayments.length - 1] : null;
  const latestPaymentMethod = (() => {
    if (!lastPaid) return "Não informado";
    if (lastPaid.method === "pix") return "Pix";
    if (lastPaid.method === "cash") return "Dinheiro";
    if (lastPaid.method === "card") {
      if (lastPaid.card_mode === "debit") return "Cartão débito";
      if (lastPaid.card_mode === "credit") return "Cartão crédito";
      return "Cartão";
    }
    return "Outro";
  })();
  const paidAt = lastPaid?.paid_at ?? lastPaid?.created_at ?? null;
  const totalAmount = Number(details?.checkout?.total ?? appointment?.price ?? 0);
  const normalizedSignalPercentage = Number.isFinite(signalPercentage)
    ? Math.min(Math.max(signalPercentage, 0), 100)
    : 30;
  const signalBaseAmount = totalAmount > 0 ? totalAmount * (normalizedSignalPercentage / 100) : 0;
  const signalAmount = Math.round(signalBaseAmount * 100) / 100;
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);
  const signalRemaining = Math.min(Math.max(signalAmount - paidAmount, 0), remainingAmount);
  const canRegisterSignal = paymentStatus === "pending" && paidAmount <= 0 && signalRemaining > 0;
  const canRegisterFull = paymentStatus !== "paid" && paymentStatus !== "waived" && remainingAmount > 0;
  const showManualRegister = canRegisterSignal || canRegisterFull;
  const paymentStatusLabel =
    paymentStatus === "paid"
      ? "Pago"
      : paymentStatus === "partial"
        ? "Parcial"
        : paymentStatus === "waived"
          ? "Liberado"
          : paymentStatus === "refunded"
            ? "Estornado"
            : "Não pago";
  const hasReceiptSent = isMessageSent(paymentReceiptMessage?.status);
  const hasChargeSent = isMessageSent(paymentChargeMessage?.status);
  const hasSurveySent = isMessageSent(postSurveyMessage?.status);
  const appointmentDurationMinutes = appointment?.actual_duration_minutes
    ? Math.max(1, appointment.actual_duration_minutes)
    : attendance?.actual_seconds
      ? Math.max(1, Math.round(attendance.actual_seconds / 60))
      : appointment?.total_duration_minutes ?? appointment?.service_duration_minutes ?? 0;
  const durationLabel = appointmentDurationMinutes > 0 ? `${appointmentDurationMinutes} min` : "Não informado";
  const followUpDateLabel =
    details?.post?.follow_up_due_at
      ? format(new Date(details.post.follow_up_due_at), "dd/MM/yyyy", { locale: ptBR })
      : "Não definido";
  const followUpNoteLabel =
    details?.post?.follow_up_note?.trim() && details.post.follow_up_note.trim().length > 0
      ? details.post.follow_up_note.trim()
      : "Sem observação registrada";
  const latestEvolutionText = details?.evolution?.[0]?.evolution_text?.trim() ?? "";
  const evolutionPreviewText = latestEvolutionText || "Sem evolução registrada nesta sessão.";
  const paymentDateLabel = paidAt ? format(new Date(paidAt), "dd/MM", { locale: ptBR }) : "";
  const formatCurrency = formatCurrencyBRL;
  const attendanceClientToken = attendanceCode ? attendanceCode.split("-")[1] ?? null : null;
  const attendanceCodeHint = attendanceClientToken?.startsWith("N")
    ? "ID cliente por nome"
    : attendanceClientToken?.startsWith("T")
      ? "ID cliente por telefone"
      : attendanceClientToken?.startsWith("A")
        ? "ID cliente de apoio"
        : null;

  const openWhatsappWithMessage = (message: string) => {
    const phone = appointment?.clients?.phone ?? "";
    const digits = phone.replace(/\D/g, "");
    if (!digits) {
      onNotify?.(feedbackById("whatsapp_missing_phone"));
      return;
    }
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    const url = `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const resolvePublicBaseUrl = () => {
    const raw = publicBaseUrl.trim();
    if (!raw) {
      if (typeof window === "undefined") return "";
      return window.location.origin.replace(/\/$/, "");
    }
    return /^https?:\/\//i.test(raw) ? raw.replace(/\/$/, "") : `https://${raw.replace(/\/$/, "")}`;
  };

  const buildPaymentLink = () => {
    const base = resolvePublicBaseUrl();
    if (!base) return "";
    const paymentPath = buildAppointmentPaymentPath({
      appointmentId: appointment?.id ?? null,
      attendanceCode: appointment?.attendance_code ?? null,
    });
    return paymentPath ? `${base}${paymentPath}` : "";
  };

  const buildReceiptLink = (_paymentId?: string | null) => {
    void _paymentId;
    const base = resolvePublicBaseUrl();
    if (!base) return "";
    const receiptPath = buildAppointmentReceiptPath({
      appointmentId: appointment?.id ?? null,
      attendanceCode: appointment?.attendance_code ?? null,
    });
    return receiptPath ? `${base}${receiptPath}` : "";
  };

  const buildSignalChargeMessage = () => {
    const serviceName = appointment?.service_name ?? "";
    const dateValue = startDate ? format(startDate, "dd/MM", { locale: ptBR }) : "";
    const timeValue = startDate ? format(startDate, "HH:mm", { locale: ptBR }) : "";
    const signalValue = formatCurrency(signalAmount);
    const paymentLink = buildPaymentLink();
    const greeting = clientName ? `Olá, ${clientName}!` : "Olá!";
    const linkBlock = paymentLink
      ? `👇 Segue o link para pagamento:\n\n💰 Valor do Sinal: ${signalValue}\nLink:\n${paymentLink}\n\n`
      : "";

    return applyAutoMessageTemplate(messageTemplates.signal_charge, {
      greeting,
      service_name: serviceName,
      date_line: dateValue,
      time: timeValue,
      signal_amount: signalValue,
      payment_link_block: linkBlock,
    }).trim();
  };

  const buildSignalReceiptMessage = () => {
    const serviceName = appointment?.service_name ?? "";
    const paidValue = formatCurrency(paidAmount);
    const greeting = clientName ? `Olá, ${clientName}!` : "Olá!";
    const receiptLink = buildReceiptLink(lastPaid?.id ?? null);
    const receiptLine = receiptLink
      ? `🧾 Acesse seu recibo digital aqui:\n${receiptLink}\n\nVocê pode baixar ou imprimir direto pelo link.\n\n`
      : "";
    return applyAutoMessageTemplate(messageTemplates.signal_receipt, {
      greeting,
      service_name: serviceName,
      signal_amount: paidValue,
      receipt_link_block: receiptLine,
    }).trim();
  };

  const buildPaidReceiptMessage = (paymentId?: string | null) => {
    const serviceName = appointment?.service_name ?? "";
    const greeting = clientName ? `Olá, ${clientName}!` : "Olá!";
    const receiptLink = buildReceiptLink(paymentId ?? lastPaid?.id ?? null);
    const receiptLine = receiptLink
      ? `🧾 Acesse seu recibo digital aqui:\n${receiptLink}\n\nVocê pode baixar ou imprimir direto pelo link.\n\n`
      : "";
    return applyAutoMessageTemplate(messageTemplates.payment_receipt, {
      greeting,
      service_name: serviceName,
      receipt_link_block: receiptLine,
    }).trim();
  };

  return {
    appointment,
    attendance,
    createdAutoMessage,
    reminderAutoMessage,
    paymentReceiptMessage,
    postSurveyMessage,
    clientName,
    clientInitials,
    isVip,
    avatarUrl,
    dateLabel,
    timeLabel,
    isHomeVisit,
    hasAddress,
    addressLine,
    mapsHref,
    isCompleted,
    isConfirmed,
    confirmedText,
    appointmentStatusDot,
    paymentStatus,
    paymentInfo,
    paidAmount,
    lastPaid,
    latestPaymentMethod,
    remainingAmount,
    signalAmount,
    signalRemaining,
    canRegisterSignal,
    canRegisterFull,
    showManualRegister,
    paymentStatusLabel,
    hasReceiptSent,
    hasChargeSent,
    hasSurveySent,
    durationLabel,
    followUpDateLabel,
    followUpNoteLabel,
    evolutionPreviewText,
    paymentDateLabel,
    attendanceCodeHint,
    formatCurrency,
    getAutomationStatusLabel,
    openWhatsappWithMessage,
    buildSignalChargeMessage,
    buildSignalReceiptMessage,
    buildPaidReceiptMessage,
  };
}
