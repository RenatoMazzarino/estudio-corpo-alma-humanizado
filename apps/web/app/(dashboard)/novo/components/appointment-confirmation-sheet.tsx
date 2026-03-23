"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { AttendancePaymentMethodSection } from "../../atendimento/[id]/components/attendance-payment-method-section";
import { BottomSheetHeaderV2 } from "../../../../components/ui/bottom-sheet-header-v2";
import { FooterRail } from "../../../../components/ui/footer-rail";
import { formatCurrencyLabel } from "../../../../src/shared/currency";
import {
  appointmentFormButtonDangerClass,
  appointmentFormButtonPrimaryClass,
  appointmentFormButtonSecondaryClass,
  appointmentFormSectionHeaderSecondaryClass
} from "../appointment-form.styles";
import type {
  BookingConfirmationStep,
  BookingPixPaymentData,
  BookingPointPaymentData,
  ChargeBookingState,
  ChargeNowMethodDraft,
  CollectionTimingDraft,
} from "../appointment-form.types";

type FinanceSummaryItem = {
  type: string;
  label: string;
  qty: number;
  amount: number;
};

type AppointmentConfirmationSheetProps = {
  portalTarget: HTMLElement | null;
  open: boolean;
  step: BookingConfirmationStep;
  chargeFlowError: string | null;
  chargeBookingState: ChargeBookingState | null;
  chargeNowMethodDraft: ChargeNowMethodDraft | null;
  chargeNowDraftAmount: number;
  chargePixPayment: BookingPixPaymentData | null;
  runningChargeAction: boolean;
  chargePixRemainingSeconds: number;
  pointEnabled: boolean;
  pointTerminalName: string;
  pointTerminalModel: string;
  chargePointPayment: BookingPointPaymentData | null;
  finishingChargeFlow: boolean;
  clientDisplayPreviewLabel: string;
  selectedServiceName: string | null;
  selectedDate: string;
  selectedTime: string;
  isHomeVisit: boolean;
  addressLabel: string;
  financeDraftItems: FinanceSummaryItem[];
  scheduleSubtotal: number;
  effectiveScheduleDiscount: number;
  scheduleDiscountType: "value" | "pct";
  effectiveScheduleDiscountInputValue: string | number;
  collectionTimingDraft: CollectionTimingDraft | null;
  scheduleTotal: number;
  isChargeNowMethodChosen: boolean;
  isChargeNowAmountConfirmed: boolean;
  chargeNowAmountError: string | null;
  creatingChargeBooking: boolean;
  isCourtesyDraft: boolean;
  onCloseAction: () => void;
  onBackToFinanceAction: () => void;
  onCopyChargePixCodeAction: () => void | Promise<void>;
  onSendChargePixViaWhatsappAction: () => void;
  onCreateChargePixAction: () => void | Promise<void>;
  onStartChargeCardAction: (mode: "debit" | "credit") => void | Promise<void>;
  onVerifyChargeCardNowAction: () => void | Promise<void>;
  onVerifyChargePixNowAction: () => void | Promise<void>;
  onSwitchChargeToAttendanceAction: () => void | Promise<void>;
  onCancelChargeBookingAction: () => void | Promise<void>;
  onEditPaymentAction: () => void;
  onConfirmManualChargeAction: () => void | Promise<void>;
  onBeginImmediateChargeAction: () => void | Promise<void>;
  onScheduleAction: () => void;
};

export function AppointmentConfirmationSheet({
  portalTarget,
  open,
  step,
  chargeFlowError,
  chargeBookingState,
  chargeNowMethodDraft,
  chargeNowDraftAmount,
  chargePixPayment,
  runningChargeAction,
  chargePixRemainingSeconds,
  pointEnabled,
  pointTerminalName,
  pointTerminalModel,
  chargePointPayment,
  finishingChargeFlow,
  clientDisplayPreviewLabel,
  selectedServiceName,
  selectedDate,
  selectedTime,
  isHomeVisit,
  addressLabel,
  financeDraftItems,
  scheduleSubtotal,
  effectiveScheduleDiscount,
  scheduleDiscountType,
  effectiveScheduleDiscountInputValue,
  collectionTimingDraft,
  scheduleTotal,
  isChargeNowMethodChosen,
  isChargeNowAmountConfirmed,
  chargeNowAmountError,
  creatingChargeBooking,
  isCourtesyDraft,
  onCloseAction,
  onBackToFinanceAction,
  onCopyChargePixCodeAction,
  onSendChargePixViaWhatsappAction,
  onCreateChargePixAction,
  onStartChargeCardAction,
  onVerifyChargeCardNowAction,
  onVerifyChargePixNowAction,
  onSwitchChargeToAttendanceAction,
  onCancelChargeBookingAction,
  onEditPaymentAction,
  onConfirmManualChargeAction,
  onBeginImmediateChargeAction,
  onScheduleAction,
}: AppointmentConfirmationSheetProps) {
  const headerTitle =
    step === "creating_charge"
      ? "Criando agendamento..."
      : step === "charge_payment"
        ? "Pagamento do agendamento"
        : "Revisao do agendamento";

  const headerDescription =
    step === "creating_charge"
      ? "Estamos criando o agendamento e preparando o checkout."
      : step === "charge_payment"
        ? "Finalize a cobranca agora ou mova para pagar no atendimento."
        : "Confira os dados antes de confirmar.";

  const shouldChargeNow = collectionTimingDraft === "charge_now" && chargeNowMethodDraft !== "waiver";
  const canRunChargeNow =
    !creatingChargeBooking &&
    isChargeNowMethodChosen &&
    isChargeNowAmountConfirmed &&
    chargeNowAmountError == null;
  const hasFixedFooter = step === "review" || (step === "charge_payment" && Boolean(chargeBookingState));
  const isPixExpired = chargeNowMethodDraft === "pix_mp" && chargePixRemainingSeconds <= 0;
  const canRunChargeActions = !(runningChargeAction || finishingChargeFlow);
  const isPixFlow = chargeNowMethodDraft === "pix_mp";
  const canConfirmManualCharge = canRunChargeActions && !(isPixFlow && isPixExpired);
  const chargeMethod = useMemo(
    () => (chargeNowMethodDraft && chargeNowMethodDraft !== "waiver" ? chargeNowMethodDraft : "cash"),
    [chargeNowMethodDraft]
  );

  const reviewPrimaryLabel = shouldChargeNow
    ? "Confirmar e cobrar"
    : isCourtesyDraft
      ? "Confirmar e agendar cortesia"
      : "Confirmar e agendar";

  if (!portalTarget || !open) return null;

  return createPortal(
    <div className="pointer-events-none absolute inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fechar revisao do agendamento"
        onClick={onCloseAction}
        className="pointer-events-auto absolute inset-0 bg-studio-text/45 backdrop-blur-[2px]"
      />

      <div className="pointer-events-auto relative flex max-h-[95vh] w-full max-w-105 flex-col overflow-hidden wl-radius-sheet wl-surface-modal shadow-float">
        <BottomSheetHeaderV2
          title={headerTitle}
          subtitle={headerDescription}
          onCloseAction={onCloseAction}
        />

        <div
          className={`max-h-[72vh] overflow-y-auto px-5 pt-5 wl-surface-modal-body ${
            hasFixedFooter ? "pb-36" : "pb-8"
          }`}
        >
          {chargeFlowError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {chargeFlowError}
            </div>
          )}

          {step === "creating_charge" ? (
            <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-5 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-studio-green/20 border-t-studio-green" />
              <p className="mt-3 text-sm font-semibold text-studio-text">Preparando checkout...</p>
              <p className="mt-1 text-xs text-muted">Isso leva apenas alguns segundos.</p>
            </div>
          ) : step === "charge_payment" && chargeBookingState ? (
            <AttendancePaymentMethodSection
              viewMode="charge"
              method={chargeMethod}
              hideWaiverOption={false}
              isWaived={chargeBookingState.appointmentPaymentStatus === "waived"}
              waiverSuccess={false}
              isFullyPaid={chargeBookingState.appointmentPaymentStatus === "paid"}
              pointEnabled={pointEnabled}
              pointTerminalName={pointTerminalName}
              pointTerminalModel={pointTerminalModel}
              cashAmount={chargeNowDraftAmount}
              effectiveChargeAmount={chargeNowDraftAmount}
              pixPayment={chargePixPayment}
              pixRemaining={chargePixRemainingSeconds}
              pixKeyConfigured={false}
              pixKeyType={null}
              normalizedPixKeyValue=""
              pixKeyGenerating={false}
              pixKeyQrDataUrl={null}
              pixKeyCode=""
              pixKeyError={null}
              pointPayment={chargePointPayment}
              busy={runningChargeAction || finishingChargeFlow}
              errorText={chargeFlowError}
              onSetMethodAction={() => undefined}
              onSetCashAmountAction={() => undefined}
              onCreatePixAction={() => void onCreateChargePixAction()}
              onCopyPixAction={() => void onCopyChargePixCodeAction()}
              onCopyPixKeyAction={() => undefined}
              onPointChargeAction={(mode) => void onStartChargeCardAction(mode)}
              onWaiveAsCourtesyAction={() => undefined}
              onLeaveOpenAction={() => void onCancelChargeBookingAction()}
              onResetCurrentChargeAction={onEditPaymentAction}
              onForceRefreshAction={() => {
                if (chargeNowMethodDraft === "pix_mp") {
                  void onVerifyChargePixNowAction();
                  return;
                }
                if (chargeNowMethodDraft === "card") {
                  void onVerifyChargeCardNowAction();
                }
              }}
              onBackToSelectAction={onEditPaymentAction}
              menuThirdActionLabel="Cancelar cobranca e agendamento"
              enableCardSimulation
              allowCardSendWithoutPoint
              onSimulateCardApprovedAction={() => void onConfirmManualChargeAction()}
              onSendPixViaWhatsappAction={onSendChargePixViaWhatsappAction}
            />
          ) : (
            <div className="space-y-4 pb-6">
              <div className="overflow-hidden rounded-xl border border-line bg-white">
                <div className={`${appointmentFormSectionHeaderSecondaryClass} px-4`}>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Resumo</p>
                </div>
                <div className="space-y-2 px-4 py-3 text-sm wl-surface-card-body">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-500">Cliente</span>
                    <span className="text-right font-semibold text-studio-text">{clientDisplayPreviewLabel || "Cliente"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-500">Servico</span>
                    <span className="text-right font-semibold text-studio-text">{selectedServiceName || "Selecione um servico"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-500">Data</span>
                    <span className="text-right font-semibold text-studio-text">
                      {selectedDate
                        ? `${format(parseISO(selectedDate), "EEEE", { locale: ptBR }).replace(/^./, (char) => char.toUpperCase())}, ${format(parseISO(selectedDate), "dd/MM", { locale: ptBR })}`
                        : "--"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-500">Horario</span>
                    <span className="text-right font-semibold text-studio-text">{selectedTime || "--:--"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-500">Local</span>
                    <span className="text-right font-semibold text-studio-text">
                      {isHomeVisit ? `Domicilio${addressLabel ? ` - ${addressLabel}` : ""}` : "Estudio"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-line bg-white">
                <div className={`${appointmentFormSectionHeaderSecondaryClass} px-4`}>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Financeiro</p>
                </div>
                <div className="space-y-2 px-4 py-3 text-sm wl-surface-card-body">
                  {financeDraftItems.length > 0 ? (
                    financeDraftItems.map((item, index) => (
                      <div key={`${item.type}-${item.label}-${index}`} className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">{item.label}</span>
                        <span className="font-semibold text-studio-text">
                          R$ {formatCurrencyLabel(Number(item.amount) * Number(item.qty ?? 1))}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted">Sem itens financeiros configurados.</p>
                  )}

                  <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-1">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold text-studio-text">R$ {formatCurrencyLabel(scheduleSubtotal)}</span>
                  </div>

                  {effectiveScheduleDiscount > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">
                        Desconto {scheduleDiscountType === "pct" ? `(${effectiveScheduleDiscountInputValue}%)` : ""}
                      </span>
                      <span className="font-semibold text-studio-text">- R$ {formatCurrencyLabel(effectiveScheduleDiscount)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">Cobranca</span>
                    <span className="font-semibold text-studio-text">
                      {collectionTimingDraft === "charge_now" ? "Agora" : "No atendimento"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-3">
                    <span className="text-sm font-semibold text-gray-500">Total do agendamento</span>
                    <span className="text-base font-bold text-studio-text">R$ {formatCurrencyLabel(scheduleTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {step === "review" ? (
          <FooterRail
            className="absolute inset-x-0 bottom-0"
            surfaceClassName="bg-[rgba(250,247,242,0.96)]"
            paddingXClassName="px-5"
            rowClassName="grid grid-cols-2 gap-2"
          >
            <button
              type="button"
              onClick={onBackToFinanceAction}
              className={`${appointmentFormButtonSecondaryClass} rounded-xl px-3 text-xs uppercase tracking-wide`}
            >
              Voltar
            </button>

            <button
              type="button"
              onClick={shouldChargeNow ? () => void onBeginImmediateChargeAction() : onScheduleAction}
              disabled={shouldChargeNow ? !canRunChargeNow : creatingChargeBooking}
              className={`${appointmentFormButtonPrimaryClass} rounded-xl px-3 text-xs uppercase tracking-wide`}
            >
              {reviewPrimaryLabel}
            </button>
          </FooterRail>
        ) : null}

        {step === "charge_payment" && chargeBookingState ? (
          <FooterRail
            className="absolute inset-x-0 bottom-0"
            surfaceClassName="bg-[rgba(250,247,242,0.96)]"
            paddingXClassName="px-5"
            rowClassName="grid grid-cols-2 gap-2"
          >
            <button
              type="button"
              onClick={() => void onSwitchChargeToAttendanceAction()}
              disabled={!canRunChargeActions}
              className={`${appointmentFormButtonDangerClass} rounded-xl px-3 text-xs uppercase tracking-wide`}
            >
              {finishingChargeFlow ? "Finalizando..." : "Cobrar No Atendimento"}
            </button>

            <button
              type="button"
              onClick={() => void onConfirmManualChargeAction()}
              disabled={!canConfirmManualCharge}
              className={`${appointmentFormButtonPrimaryClass} rounded-xl px-3 text-xs uppercase tracking-wide`}
            >
              {runningChargeAction ? "Registrando..." : "Confirmacao Manual"}
            </button>
          </FooterRail>
        ) : null}

      </div>
    </div>,
    portalTarget
  );
}
