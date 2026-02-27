"use client";

import { createPortal } from "react-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  User,
} from "lucide-react";
import Image from "next/image";
import type { AttendanceOverview } from "../../lib/attendance/attendance-types";
import { AppointmentDetailsActiveView } from "./appointment-details-active-view";
import { AppointmentDetailsCancelDialog } from "./appointment-details-cancel-dialog";
import { AppointmentDetailsCompletedView } from "./appointment-details-completed-view";
import { AppointmentDetailsEvolutionModal } from "./appointment-details-evolution-modal";
import { useAppointmentDetailsSheetController } from "./use-appointment-details-sheet-controller";
import { DEFAULT_PUBLIC_BASE_URL } from "../../src/shared/config";
import type { AutoMessageTemplates } from "../../src/shared/auto-messages.types";
import { applyAutoMessageTemplate } from "../../src/shared/auto-messages.utils";
import { buildAppointmentReceiptPath } from "../../src/shared/public-links";
import { feedbackById, type UserFeedback } from "../../src/shared/feedback/user-feedback";
import {
  formatSentLabel,
  getAutomationStatusLabel,
  getInitials,
  getStatusInfo,
  isMessageSent,
  messageByRawType,
  messageByType,
  paymentStatusMap,
  type PaymentStatus,
} from "./appointment-details-sheet.helpers";

interface AppointmentDetailsSheetProps {
  open: boolean;
  loading?: boolean;
  actionPending?: boolean;
  details: AttendanceOverview | null;
  attendanceCode?: string | null;
  signalPercentage?: number;
  publicBaseUrl?: string;
  messageTemplates: AutoMessageTemplates;
  onClose: () => void;
  onStartSession: () => void;
  onSendCreatedMessage: () => void;
  onSendReminder: () => void;
  onSendSurvey: () => void;
  onSendPaymentCharge: () => void;
  onSendPaymentReceipt: (paymentId: string | null) => void;
  onConfirmClient: () => void;
  onCancelAppointment: (options?: { notifyClient?: boolean }) => void;
  onRecordPayment?: (payload: { type: "signal" | "full"; amount: number; method: "pix" | "card" | "cash" | "other" }) => void;
  onSaveEvolution?: (text: string) => Promise<{ ok: boolean }>;
  onStructureEvolution?: (text: string) => Promise<{ ok: boolean; structuredText: string | null }>;
  onNotify?: (feedback: UserFeedback) => void;
}

export function AppointmentDetailsSheet({
  open,
  loading = false,
  actionPending = false,
  details,
  attendanceCode = null,
  signalPercentage = 30,
  publicBaseUrl = DEFAULT_PUBLIC_BASE_URL,
  messageTemplates,
  onClose,
  onStartSession,
  onSendCreatedMessage,
  onSendReminder,
  onSendSurvey,
  onSendPaymentCharge,
  onSendPaymentReceipt,
  onConfirmClient,
  onCancelAppointment,
  onRecordPayment,
  onSaveEvolution,
  onStructureEvolution,
  onNotify,
}: AppointmentDetailsSheetProps) {
  const {
    portalTarget,
    cancelDialogOpen,
    notifyClientOnCancel,
    dragOffset,
    isDragging,
    paymentMethod,
    evolutionModalOpen,
    evolutionDraft,
    evolutionSaving,
    evolutionStructuring,
    sheetRef,
    setCancelDialogOpen,
    setNotifyClientOnCancel,
    setPaymentMethod,
    setEvolutionModalOpen,
    setEvolutionDraft,
    handleDragStart,
    handleDragMove,
    finishDrag,
    handleStructureEvolution,
    handleSaveEvolution,
  } = useAppointmentDetailsSheetController({
    open,
    details,
    onClose,
    onSaveEvolution,
    onStructureEvolution,
  });

  if (!open || !portalTarget) return null;

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

  const createdMessage = messageByType(messages, "created_confirmation");
  const reminderMessage = messageByType(messages, "reminder_24h");
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
  const confirmedLabel = confirmedAt
    ? format(new Date(confirmedAt), "dd MMM 'às' HH:mm", { locale: ptBR })
    : "";
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
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

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
    return base ? `${base}/pagamento` : "";
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

  const attendanceClientToken = attendanceCode ? attendanceCode.split("-")[1] ?? null : null;
  const attendanceCodeHint = attendanceClientToken?.startsWith("N")
    ? "ID cliente por nome"
    : attendanceClientToken?.startsWith("T")
      ? "ID cliente por telefone"
      : attendanceClientToken?.startsWith("A")
        ? "ID cliente de apoio"
        : null;

  return createPortal(
    <div className="absolute inset-0 z-50 flex items-end justify-center pointer-events-none">
      <button
        type="button"
        aria-label="Fechar detalhes"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
      />

      <div
        ref={sheetRef}
        className={`relative w-full max-w-105 rounded-t-3xl bg-white shadow-float flex flex-col max-h-[90vh] pointer-events-auto ${
          isDragging ? "transition-none" : "transition-transform duration-200"
        }`}
        style={{ transform: dragOffset ? `translateY(${dragOffset}px)` : "translateY(0)" }}
      >
        <div
          className="flex items-center justify-center px-6 pt-4 pb-2 touch-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-200" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <div className="relative w-12 h-12 rounded-full overflow-hidden border border-line">
                <Image
                  src={avatarUrl}
                  alt={clientName}
                  fill
                  sizes="48px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-studio-light text-studio-green flex items-center justify-center font-serif font-bold">
                {clientInitials ? clientInitials : <User className="w-5 h-5" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${appointmentStatusDot}`} title={statusInfo.label} />
                <p className="text-2xl font-serif font-bold text-studio-text truncate">{clientName}</p>
                {isVip && (
                  <span className="px-2.5 py-1 rounded-full bg-dom/20 text-dom-strong text-[9px] font-extrabold uppercase tracking-[0.08em]">
                    VIP
                  </span>
                )}
              </div>
              <p className="text-sm text-muted truncate">
                {appointment?.service_name ?? ""}{" "}
                {appointment?.service_duration_minutes ? `• ${appointment.service_duration_minutes} min` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.08em] ${paymentInfo.className}`}
              >
                {paymentInfo.label}
              </span>
            </div>
          </div>

          {loading && (
            <div className="mt-6 text-xs text-muted">Carregando detalhes...</div>
          )}

          {!loading && details && (
            isCompleted ? (
              <AppointmentDetailsCompletedView
                actionPending={actionPending}
                dateLabel={dateLabel}
                timeLabel={timeLabel}
                durationLabel={durationLabel}
                isHomeVisit={isHomeVisit}
                hasAddress={hasAddress}
                mapsHref={mapsHref}
                attendanceCode={attendanceCode}
                attendanceCodeHint={attendanceCodeHint}
                paymentInfo={{ textClass: paymentInfo.textClass }}
                paymentStatusLabel={paymentStatusLabel}
                paidAmountLabel={formatCurrency(paidAmount)}
                latestPaymentMethod={latestPaymentMethod}
                remainingAmountLabel={formatCurrency(remainingAmount)}
                hasReceiptSent={hasReceiptSent}
                hasChargeSent={hasChargeSent}
                paymentStatus={paymentStatus}
                paymentMethod={paymentMethod}
                remainingAmount={remainingAmount}
                followUpDateLabel={followUpDateLabel}
                followUpNoteLabel={followUpNoteLabel}
                evolutionPreviewText={evolutionPreviewText}
                surveyScore={details.post?.survey_score ?? null}
                hasSurveySent={hasSurveySent}
                onSelectPaymentMethod={setPaymentMethod}
                onSendPaymentCharge={onSendPaymentCharge}
                onRecordPayment={() =>
                  onRecordPayment?.({
                    type: "full",
                    amount: remainingAmount,
                    method: paymentMethod,
                  })
                }
                onSendPaymentReceipt={() => onSendPaymentReceipt(lastPaid?.id ?? null)}
                onSendSurvey={onSendSurvey}
                onOpenEvolutionModal={() => setEvolutionModalOpen(true)}
              />
            ) : (
              <AppointmentDetailsActiveView
                actionPending={actionPending}
                dateLabel={dateLabel}
                timeLabel={timeLabel}
                isHomeVisit={isHomeVisit}
                hasAddress={hasAddress}
                addressLine={addressLine}
                mapsHref={mapsHref}
                attendanceCode={attendanceCode}
                attendanceCodeHint={attendanceCodeHint}
                createdMessageSent={isMessageSent(createdMessage?.status)}
                createdMessageLabel={
                  isMessageSent(createdMessage?.status)
                    ? formatSentLabel(createdMessage?.sent_at ?? null)
                    : "Pendente de envio"
                }
                createdAutomationStatusLabel={getAutomationStatusLabel(createdAutoMessage)}
                reminderMessageSent={isMessageSent(reminderMessage?.status)}
                reminderMessageLabel={
                  isMessageSent(reminderMessage?.status)
                    ? formatSentLabel(reminderMessage?.sent_at ?? null)
                    : "Pendente de envio"
                }
                reminderAutomationStatusLabel={getAutomationStatusLabel(reminderAutoMessage)}
                isConfirmed={isConfirmed}
                confirmedText={confirmedText}
                paymentStatus={paymentStatus}
                signalAmountLabel={formatCurrency(signalAmount)}
                paidAmountLabel={formatCurrency(paidAmount)}
                paymentDateLabel={paymentDateLabel}
                hasReceiptSent={hasReceiptSent}
                hasChargeSent={hasChargeSent}
                showManualRegister={showManualRegister}
                canRegisterSignal={canRegisterSignal}
                canRegisterFull={canRegisterFull}
                signalRemainingLabel={formatCurrency(signalRemaining)}
                remainingAmount={remainingAmount}
                remainingAmountLabel={formatCurrency(remainingAmount)}
                paymentMethod={paymentMethod}
                internalNotes={appointment?.internal_notes ?? ""}
                onSelectPaymentMethod={setPaymentMethod}
                onSendCreatedMessage={onSendCreatedMessage}
                onSendReminder={onSendReminder}
                onConfirmClient={onConfirmClient}
                onOpenCancelDialog={() => setCancelDialogOpen(true)}
                onSendPaymentCharge={onSendPaymentCharge}
                onRecordSignalPayment={() =>
                  onRecordPayment?.({
                    type: "signal",
                    amount: signalRemaining,
                    method: paymentMethod,
                  })
                }
                onRecordFullPayment={() =>
                  onRecordPayment?.({
                    type: "full",
                    amount: remainingAmount,
                    method: paymentMethod,
                  })
                }
                onSendSignalChargeMessage={() => openWhatsappWithMessage(buildSignalChargeMessage())}
                onSendSignalReceiptMessage={() => openWhatsappWithMessage(buildSignalReceiptMessage())}
                onSendPaidReceiptMessage={() => openWhatsappWithMessage(buildPaidReceiptMessage())}
              />
            )
          )}
        </div>

        {isCompleted && (
          <AppointmentDetailsEvolutionModal
            open={evolutionModalOpen}
            draft={evolutionDraft}
            saving={evolutionSaving}
            structuring={evolutionStructuring}
            actionPending={actionPending}
            canSave={Boolean(onSaveEvolution)}
            canStructure={Boolean(onStructureEvolution)}
            onClose={() => setEvolutionModalOpen(false)}
            onChangeDraft={setEvolutionDraft}
            onStructure={() => void handleStructureEvolution()}
            onSave={() => void handleSaveEvolution()}
          />
        )}

        {!isCompleted && (
          <div className="border-t border-line px-6 py-4 bg-white/95 backdrop-blur">
            <button
              type="button"
              onClick={onStartSession}
              disabled={!details || actionPending}
              className="w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-200 active:scale-95 transition disabled:opacity-60"
            >
              Ver atendimento
            </button>
          </div>
        )}
      </div>

      <AppointmentDetailsCancelDialog
        open={cancelDialogOpen}
        notifyClientOnCancel={notifyClientOnCancel}
        actionPending={actionPending}
        onClose={() => {
          setCancelDialogOpen(false);
          setNotifyClientOnCancel(false);
        }}
        onChangeNotifyClient={setNotifyClientOnCancel}
        onConfirmCancel={() => {
          setCancelDialogOpen(false);
          onCancelAppointment({ notifyClient: notifyClientOnCancel });
          setNotifyClientOnCancel(false);
        }}
      />
    </div>,
    portalTarget
  );
}
