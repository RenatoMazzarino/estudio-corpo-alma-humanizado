"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpenText, EllipsisVertical, Pencil, Trash2, User } from "lucide-react";
import Image from "next/image";
import type { AttendanceOverview } from "../../lib/attendance/attendance-types";
import { WhatsAppIcon } from "../ui/whatsapp-icon";
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
  onEditAppointmentAction?: (appointmentId: string) => void;
  onRecordPaymentAction?: (payload: {
    type: "signal" | "full";
    amount: number;
    method: "pix" | "card" | "cash" | "other";
  }) => void;
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
  onEditAppointmentAction,
  onRecordPaymentAction,
  onSaveEvolutionAction,
  onStructureEvolutionAction,
  onNotifyAction,
}: AppointmentDetailsSheetProps) {
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

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
    buildPaymentChargeMessage,
    buildPaidReceiptMessage,
  } = useAppointmentDetailsSheetViewModel({
    details,
    attendanceCode,
    signalPercentage,
    publicBaseUrl,
    messageTemplates,
    onNotify: onNotifyAction,
  });

  useEffect(() => {
    if (!actionsMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(target)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [actionsMenuOpen]);

  useEffect(() => {
    if (!open) {
      setActionsMenuOpen(false);
    }
  }, [open]);

  if (!open || !portalTarget) return null;

  return createPortal(
    <div className="pointer-events-none absolute inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fechar detalhes"
        onClick={onCloseAction}
        className="pointer-events-auto absolute inset-0 bg-studio-text/45 backdrop-blur-[2px]"
      />

      <div
        ref={sheetRef}
        className={`pointer-events-auto relative flex max-h-[95vh] w-full max-w-105 flex-col overflow-hidden rounded-t-[26px] border border-line/80 bg-white shadow-float ${
          isDragging ? "transition-none" : "transition-transform duration-200"
        }`}
        style={{ transform: dragOffset ? `translateY(${dragOffset}px)` : "translateY(0)" }}
      >
        <div
          className="touch-none border-b border-line/80 bg-white px-5 pb-3 pt-2"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <div className="mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-muted/35" />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {attendanceCode && (
                <div className="mb-1.5">
                  <span className="wl-typo-label text-muted">
                    {attendanceCode}
                  </span>
                </div>
              )}

              <div className="flex min-w-0 items-center gap-2.5">
                {avatarUrl ? (
                  <div className="relative h-10 w-10 overflow-hidden rounded-full border border-line bg-white">
                    <Image
                      src={avatarUrl}
                      alt={clientName}
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-studio-light font-semibold text-studio-green">
                    {clientInitials ? clientInitials : <User className="h-4 w-4" />}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${appointmentStatusDot}`}
                      title="Status do agendamento"
                    />
                    <p className="wl-typo-h1 truncate leading-none text-studio-text">{clientName}</p>
                    {isVip && (
                      <span className="wl-typo-chip rounded border border-line bg-paper px-1.5 py-0.5 text-muted">
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="wl-typo-body truncate pt-1 text-muted">
                    {appointment?.service_name ?? ""}{" "}
                    {appointment?.service_duration_minutes ? `- ${appointment.service_duration_minutes} min` : ""}
                  </p>
                  {attendanceCodeHint && <p className="wl-typo-body-sm pt-0.5 text-muted">{attendanceCodeHint}</p>}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Abrir WhatsApp"
                  onClick={() => openWhatsappWithMessage(clientName ? `Ola, ${clientName}!` : "Ola!")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-studio-text shadow-sm transition hover:bg-paper"
                >
                  <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                </button>
                <div ref={actionsMenuRef} className="relative">
                  <button
                    type="button"
                    aria-label="Mais opcoes"
                    onClick={() => setActionsMenuOpen((prev) => !prev)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-studio-text shadow-sm transition hover:bg-paper"
                  >
                    <EllipsisVertical className="h-4 w-4" />
                  </button>
                  {actionsMenuOpen && (
                    <div className="absolute right-0 top-11 z-20 min-w-44 overflow-hidden rounded-xl border border-line bg-white shadow-soft">
                      <button
                        type="button"
                        onClick={() => {
                          setActionsMenuOpen(false);
                          onStartSessionAction();
                        }}
                        className="flex w-full items-center gap-2.5 border-b border-line px-3 py-2.5 text-left text-sm font-medium text-studio-text transition hover:bg-paper"
                      >
                        <BookOpenText className="h-4 w-4" />
                        Abrir prontuario
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionsMenuOpen(false);
                          const appointmentId = details?.appointment?.id ?? null;
                          if (appointmentId && onEditAppointmentAction) {
                            onEditAppointmentAction(appointmentId);
                          }
                        }}
                        className="flex w-full items-center gap-2.5 border-b border-line px-3 py-2.5 text-left text-sm font-medium text-studio-text transition hover:bg-paper"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar agendamento
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionsMenuOpen(false);
                          setCancelDialogOpen(true);
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir agendamento
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <span className={`wl-typo-chip rounded-lg px-2.5 py-1 ${paymentInfo.className}`}>
                {paymentInfo.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
          {loading && <div className="mt-2 text-xs text-muted">Carregando detalhes...</div>}

          {!loading && details &&
            (isCompleted ? (
              <AppointmentDetailsCompletedView
                actionPending={actionPending}
                dateLabel={dateLabel}
                timeLabel={timeLabel}
                durationLabel={durationLabel}
                isHomeVisit={isHomeVisit}
                hasAddress={hasAddress}
                mapsHref={mapsHref}
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
                onSendPaymentChargeMessage={() => openWhatsappWithMessage(buildPaymentChargeMessage())}
                onSendPaidReceiptMessage={() => openWhatsappWithMessage(buildPaidReceiptMessage())}
              />
            ))}
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
          <div className="border-t border-line bg-white px-5 py-4">
            <button
              type="button"
              onClick={onStartSessionAction}
              disabled={!details || actionPending}
              className="h-11 w-full rounded-xl bg-studio-green text-xs font-extrabold uppercase tracking-wide text-white shadow-lg shadow-green-200 transition active:scale-95 disabled:opacity-60"
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
