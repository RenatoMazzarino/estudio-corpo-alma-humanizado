"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, Phone, X } from "lucide-react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { PaymentMethodIcon } from "../../../../components/ui/payment-method-icon";
import { formatCurrencyLabel } from "../../../../src/shared/currency";
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
  chargePixAttempt: number;
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
  formatCountdown: (seconds: number) => string;
  onClose: () => void;
  onCreateChargePixNow: (attempt: number) => void | Promise<void>;
  onCopyChargePixCode: () => void | Promise<void>;
  onSendChargePixViaWhatsapp: () => void;
  onStartChargeCard: (mode: "debit" | "credit") => void | Promise<void>;
  onVerifyChargeCardNow: () => void | Promise<void>;
  onSwitchChargeToAttendance: () => void | Promise<void>;
  onClearChargeFlowError: () => void;
  onResolveDeferredManualPrompt: (shouldSendMessage: boolean) => void | Promise<void>;
  onBeginImmediateCharge: () => void | Promise<void>;
  onSchedule: (shouldSendMessage: boolean) => void;
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
  chargePixAttempt,
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
  formatCountdown,
  onClose,
  onCreateChargePixNow,
  onCopyChargePixCode,
  onSendChargePixViaWhatsapp,
  onStartChargeCard,
  onVerifyChargeCardNow,
  onSwitchChargeToAttendance,
  onClearChargeFlowError,
  onResolveDeferredManualPrompt,
  onBeginImmediateCharge,
  onSchedule,
}: AppointmentConfirmationSheetProps) {
  if (!portalTarget || !open) return null;

  const headerKicker = step === "charge_payment" ? "Cobrança no agendamento" : "Confirmar agendamento";
  const headerTitle =
    step === "creating_charge"
      ? "Criando agendamento..."
      : step === "charge_payment"
        ? "Pagamento do agendamento"
        : step === "charge_manual_prompt"
          ? "Aviso manual do agendamento"
          : "Revisar dados antes de criar";
  const headerDescription =
    step === "creating_charge"
      ? "Estamos criando o agendamento e preparando o checkout."
      : step === "charge_payment"
        ? "Finalize a cobrança agora ou jogue para pagar no atendimento."
        : step === "charge_manual_prompt"
          ? "Escolha se deseja enviar o aviso manual de agendamento agora."
          : "Confira os dados do agendamento antes de confirmar.";

  return createPortal(
    <div className="absolute inset-0 z-50 flex items-end justify-center overflow-hidden overscroll-contain bg-black/40 px-5 py-5">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-white p-5 shadow-float">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">{headerKicker}</p>
            <h3 className="text-lg font-serif text-studio-text">{headerTitle}</h3>
            <p className="mt-1 text-xs text-muted">{headerDescription}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-studio-light text-studio-green"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {chargeFlowError && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {chargeFlowError}
          </div>
        )}

        {step === "creating_charge" ? (
          <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-5 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-studio-green/20 border-t-studio-green" />
            <p className="mt-3 text-sm font-semibold text-studio-text">Preparando cobrança...</p>
            <p className="mt-1 text-xs text-muted">Isso leva apenas alguns segundos.</p>
          </div>
        ) : step === "charge_payment" && chargeBookingState ? (
          <div className="space-y-4">
            {chargeNowMethodDraft === "pix_mp" ? (
              <div className="rounded-2xl border border-line bg-white px-4 py-4">
                <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted">
                  <PaymentMethodIcon method="pix" className="h-4 w-4" />
                  PIX Mercado Pago
                </div>
                <p className="mt-2 text-xs text-muted">
                  Valor a cobrar agora: <strong>R$ {formatCurrencyLabel(chargeNowDraftAmount)}</strong>
                </p>

                {!chargePixPayment ? (
                  <button
                    type="button"
                    onClick={() => void onCreateChargePixNow(chargePixAttempt + 1)}
                    disabled={runningChargeAction}
                    className="mt-3 h-11 w-full rounded-2xl bg-studio-green text-xs font-extrabold uppercase tracking-wide text-white disabled:opacity-70"
                  >
                    {runningChargeAction ? "Gerando PIX..." : "Gerar QR Code PIX"}
                  </button>
                ) : (
                  <>
                    {chargePixPayment.qr_code_base64 && (
                      <Image
                        src={`data:image/png;base64,${chargePixPayment.qr_code_base64}`}
                        alt="QR Code Pix"
                        width={200}
                        height={200}
                        unoptimized
                        className="mx-auto mt-4 h-44 w-44 rounded-xl border border-line bg-white p-2"
                      />
                    )}
                    <p className="mt-3 text-center text-xs font-semibold text-studio-green">
                      Tempo restante: {formatCountdown(chargePixRemainingSeconds)}
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-stone-200">
                      <div
                        className="h-full rounded-full bg-studio-green transition-all"
                        style={{ width: `${Math.max((chargePixRemainingSeconds / (15 * 60)) * 100, 0)}%` }}
                      />
                    </div>
                    <div className="mt-3 break-all rounded-xl border border-line bg-stone-50 px-3 py-2 text-[11px] text-muted">
                      {chargePixPayment.qr_code}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void onCopyChargePixCode()}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wider text-studio-green"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar chave PIX
                      </button>
                      <button
                        type="button"
                        onClick={onSendChargePixViaWhatsapp}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wider text-studio-green"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Enviar WhatsApp
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : chargeNowMethodDraft === "card" ? (
              <div className="rounded-2xl border border-line bg-white px-4 py-4">
                <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted">
                  <PaymentMethodIcon method="card" className="h-4 w-4" />
                  Cobrança na maquininha
                </div>
                <p className="mt-2 text-xs text-muted">
                  Valor a cobrar agora: <strong>R$ {formatCurrencyLabel(chargeNowDraftAmount)}</strong>
                </p>
                <p className="mt-2 text-xs text-muted">
                  {pointEnabled ? pointTerminalName || "Maquininha Point configurada" : "Point não configurada"}
                </p>
                <p className="text-[11px] text-muted">{pointTerminalModel || "Configure a maquininha em Configurações."}</p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void onStartChargeCard("debit")}
                    disabled={!pointEnabled || runningChargeAction}
                    className="h-10 rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wide text-studio-green disabled:opacity-70"
                  >
                    Cobrar no débito
                  </button>
                  <button
                    type="button"
                    onClick={() => void onStartChargeCard("credit")}
                    disabled={!pointEnabled || runningChargeAction}
                    className="h-10 rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wide text-studio-green disabled:opacity-70"
                  >
                    Cobrar no crédito
                  </button>
                </div>

                {chargePointPayment && (
                  <div className="mt-3 rounded-xl border border-line bg-stone-50 px-3 py-2">
                    <p className="text-xs text-muted">
                      Cobrança enviada ({chargePointPayment.card_mode === "debit" ? "débito" : "crédito"}). Aguardando confirmação...
                    </p>
                    <button
                      type="button"
                      onClick={() => void onVerifyChargeCardNow()}
                      className="mt-2 h-9 rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wide text-studio-green"
                    >
                      Verificar agora
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 text-xs text-muted">
                Finalize a cobrança no atendimento.
              </div>
            )}

            <div className={`grid gap-2 ${chargeNowMethodDraft === "pix_mp" && chargePixRemainingSeconds <= 0 ? "grid-cols-2" : "grid-cols-1"}`}>
              <button
                type="button"
                onClick={() => void onSwitchChargeToAttendance()}
                disabled={finishingChargeFlow}
                className="h-12 w-full rounded-2xl border border-line bg-white text-xs font-extrabold uppercase tracking-wide text-studio-text disabled:opacity-70"
              >
                {finishingChargeFlow ? "Finalizando..." : "Cobrar no atendimento"}
              </button>
              {chargeNowMethodDraft === "pix_mp" && chargePixRemainingSeconds <= 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onClearChargeFlowError();
                    void onCreateChargePixNow(chargePixAttempt + 1);
                  }}
                  disabled={runningChargeAction}
                  className="h-12 w-full rounded-2xl bg-studio-light text-xs font-extrabold uppercase tracking-wide text-studio-green disabled:opacity-60"
                >
                  Gerar novo pix
                </button>
              )}
            </div>
          </div>
        ) : step === "charge_manual_prompt" && chargeBookingState ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
              <p className="text-xs font-semibold text-studio-text">
                Agendamento criado{chargeBookingState.appointmentPaymentStatus === "paid" ? " e pagamento confirmado" : ""}.
              </p>
              <p className="mt-1 text-xs text-muted">Agora você pode decidir se quer enviar o aviso manual pelo WhatsApp.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void onResolveDeferredManualPrompt(true)}
                className="h-12 w-full rounded-2xl bg-studio-green text-xs font-extrabold uppercase tracking-wide text-white shadow-lg shadow-green-900/10"
              >
                Enviar aviso manual
              </button>
              <button
                type="button"
                onClick={() => void onResolveDeferredManualPrompt(false)}
                className="h-12 w-full rounded-2xl border border-line bg-white text-xs font-extrabold uppercase tracking-wide text-studio-text"
              >
                Não enviar aviso manual
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Resumo</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-gray-500">Cliente</span>
                  <span className="text-right font-semibold text-studio-text">{clientDisplayPreviewLabel || "Cliente"}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-gray-500">Serviço</span>
                  <span className="text-right font-semibold text-studio-text">{selectedServiceName || "Selecione um serviço"}</span>
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
                  <span className="text-gray-500">Horário</span>
                  <span className="text-right font-semibold text-studio-text">{selectedTime || "--:--"}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-gray-500">Local</span>
                  <span className="text-right font-semibold text-studio-text">
                    {isHomeVisit ? `Domicílio${addressLabel ? ` • ${addressLabel}` : ""}` : "Estúdio"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-100 bg-white p-4">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Financeiro</p>
              <div className="space-y-2 text-sm">
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
                {collectionTimingDraft === "charge_now" && (
                  <>
                    {chargeNowMethodDraft !== "waiver" && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">Valor total do atendimento</span>
                        <span className="font-semibold text-studio-text">R$ {formatCurrencyLabel(scheduleTotal)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Forma</span>
                      <span className="font-semibold text-studio-text">
                        {chargeNowMethodDraft === "pix_mp"
                          ? "PIX"
                          : chargeNowMethodDraft === "card"
                            ? "Cartão"
                            : chargeNowMethodDraft === "cash"
                              ? "Dinheiro"
                              : "Cortesia"}
                      </span>
                    </div>
                    {chargeNowMethodDraft === "waiver" && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">Status financeiro</span>
                        <span className="font-semibold text-sky-700">Cortesia / pagamento liberado</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Cobrança</span>
                  <span className="font-semibold text-studio-text">
                    {collectionTimingDraft === "at_attendance" ? "No atendimento" : "Agora (No Agendamento)"}
                  </span>
                </div>
              </div>
              {collectionTimingDraft === "charge_now" && chargeNowMethodDraft !== "waiver" ? (
                <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-gray-500">Valor Cobrado agora</span>
                    <span className="shrink-0 whitespace-nowrap text-base font-bold text-studio-text">
                      R$ {formatCurrencyLabel(chargeNowDraftAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-gray-500">Saldo a cobrar</span>
                    <span className="shrink-0 whitespace-nowrap text-base font-bold text-studio-text">
                      R$ {formatCurrencyLabel(Math.max(scheduleTotal - chargeNowDraftAmount, 0))}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-stone-100 pt-3">
                  <span className="text-sm font-semibold text-gray-500">Total do agendamento</span>
                  <span className="text-base font-bold text-studio-text">R$ {formatCurrencyLabel(scheduleTotal)}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {collectionTimingDraft === "charge_now" && chargeNowMethodDraft !== "waiver" ? (
                <>
                  <button
                    type="button"
                    onClick={() => void onBeginImmediateCharge()}
                    disabled={
                      creatingChargeBooking ||
                      !isChargeNowMethodChosen ||
                      !isChargeNowAmountConfirmed ||
                      Boolean(chargeNowAmountError)
                    }
                    className="h-12 w-full rounded-2xl bg-studio-green text-xs font-extrabold uppercase tracking-wide text-white shadow-lg shadow-green-900/10 disabled:opacity-70"
                  >
                    {creatingChargeBooking ? "Preparando cobrança..." : "Cobrar"}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-12 w-full rounded-2xl border border-line bg-white text-xs font-extrabold uppercase tracking-wide text-studio-text"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSchedule(true)}
                    className="h-12 w-full rounded-2xl bg-studio-green text-xs font-extrabold uppercase tracking-wide text-white shadow-lg shadow-green-900/10"
                  >
                    {isCourtesyDraft ? "Agendar cortesia e avisar" : "Agendar e avisar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSchedule(false)}
                    className="h-12 w-full rounded-2xl border border-line bg-white text-xs font-extrabold uppercase tracking-wide text-studio-text"
                  >
                    {isCourtesyDraft ? "Agendar cortesia sem enviar" : "Agendar sem enviar"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    portalTarget
  );
}
