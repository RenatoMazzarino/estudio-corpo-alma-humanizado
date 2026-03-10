"use client";

import { createPortal } from "react-dom";
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
import type { UserFeedback } from "../../src/shared/feedback/user-feedback";
import { useAppointmentDetailsSheetViewModel } from "./use-appointment-details-sheet-view-model";

interface AppointmentDetailsSheetProps {
  open: boolean;
  loading?: boolean;
  actionPending?: boolean;
  details: AttendanceOverview | null;
  attendanceCode?: string | null;
  signalPercentage?: number;
  publicBaseUrl?: string;
  messageTemplates: AutoMessageTemplates;
  onCloseAction: () => void;
  onStartSessionAction: () => void;
  onSendSurveyAction: () => void;
  onSendPaymentChargeAction: () => void;
  onSendPaymentReceiptAction: (paymentId: string | null) => void;
  onCancelAppointmentAction: (options?: { notifyClient?: boolean }) => void;
  onRecordPaymentAction?: (payload: { type: "signal" | "full"; amount: number; method: "pix" | "card" | "cash" | "other" }) => void;
  onSaveEvolutionAction?: (text: string) => Promise<{ ok: boolean }>;
  onStructureEvolutionAction?: (text: string) => Promise<{ ok: boolean; structuredText: string | null }>;
  onNotifyAction?: (feedback: UserFeedback) => void;
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
  onCloseAction,
  onStartSessionAction,
  onSendSurveyAction,
  onSendPaymentChargeAction,
  onSendPaymentReceiptAction,
  onCancelAppointmentAction,
  onRecordPaymentAction,
  onSaveEvolutionAction,
  onStructureEvolutionAction,
  onNotifyAction,
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
    onClose: onCloseAction,
    onSaveEvolution: onSaveEvolutionAction,
    onStructureEvolution: onStructureEvolutionAction,
  });

  const {
    appointment,
    createdAutoMessage,
    reminderAutoMessage,
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
  } = useAppointmentDetailsSheetViewModel({
    details,
    attendanceCode,
    signalPercentage,
    publicBaseUrl,
    messageTemplates,
    onNotify: onNotifyAction,
  });

  if (!open || !portalTarget) return null;

  return createPortal(
    <div className="absolute inset-0 z-50 flex items-end justify-center pointer-events-none">
      <button
        type="button"
        aria-label="Fechar detalhes"
        onClick={onCloseAction}
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
                <span className={`w-2 h-2 rounded-full ${appointmentStatusDot}`} title="Status do agendamento" />
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
                onSendPaymentCharge={onSendPaymentChargeAction}
                onRecordPayment={() =>
                  onRecordPaymentAction?.({
                    type: "full",
                    amount: remainingAmount,
                    method: paymentMethod,
                  })
                }
                onSendPaymentReceipt={() => onSendPaymentReceiptAction(lastPaid?.id ?? null)}
                onSendSurvey={onSendSurveyAction}
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
                createdAutomationStatusLabel={getAutomationStatusLabel(createdAutoMessage)}
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
                onOpenCancelDialog={() => setCancelDialogOpen(true)}
                onSendPaymentCharge={onSendPaymentChargeAction}
                onRecordSignalPayment={() =>
                  onRecordPaymentAction?.({
                    type: "signal",
                    amount: signalRemaining,
                    method: paymentMethod,
                  })
                }
                onRecordFullPayment={() =>
                  onRecordPaymentAction?.({
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
            canSave={Boolean(onSaveEvolutionAction)}
            canStructure={Boolean(onStructureEvolutionAction)}
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
              onClick={onStartSessionAction}
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
          onCancelAppointmentAction({ notifyClient: notifyClientOnCancel });
          setNotifyClientOnCancel(false);
        }}
      />
    </div>,
    portalTarget
  );
}
