import { Bell, CheckCircle2, Eye, MapPin, MessageSquare, StickyNote, ThumbsUp, Wallet } from "lucide-react";

import { PaymentMethodIcon } from "../ui/payment-method-icon";

type PaymentMethod = "pix" | "card" | "cash" | "other";

interface AppointmentDetailsActiveViewProps {
  actionPending: boolean;
  dateLabel: string;
  timeLabel: string;
  isHomeVisit: boolean;
  hasAddress: boolean;
  addressLine: string;
  mapsHref: string | null;
  attendanceCode: string | null;
  attendanceCodeHint: string | null;
  createdMessageSent: boolean;
  createdMessageLabel: string;
  createdAutomationStatusLabel: string;
  reminderMessageSent: boolean;
  reminderMessageLabel: string;
  reminderAutomationStatusLabel: string;
  isConfirmed: boolean;
  confirmedText: string;
  paymentStatus:
    | "pending"
    | "partial"
    | "paid"
    | "waived"
    | "refunded";
  signalAmountLabel: string;
  paidAmountLabel: string;
  paymentDateLabel: string;
  hasReceiptSent: boolean;
  hasChargeSent: boolean;
  showManualRegister: boolean;
  canRegisterSignal: boolean;
  canRegisterFull: boolean;
  signalRemainingLabel: string;
  remainingAmount: number;
  remainingAmountLabel: string;
  paymentMethod: PaymentMethod;
  internalNotes: string;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  onSendCreatedMessage: () => void;
  onSendReminder: () => void;
  onConfirmClient: () => void;
  onOpenCancelDialog: () => void;
  onSendPaymentCharge: () => void;
  onRecordSignalPayment: () => void;
  onRecordFullPayment: () => void;
  onSendSignalChargeMessage: () => void;
  onSendSignalReceiptMessage: () => void;
  onSendPaidReceiptMessage: () => void;
}

export function AppointmentDetailsActiveView({
  actionPending,
  dateLabel,
  timeLabel,
  isHomeVisit,
  hasAddress,
  addressLine,
  mapsHref,
  attendanceCode,
  attendanceCodeHint,
  createdMessageSent,
  createdMessageLabel,
  createdAutomationStatusLabel,
  reminderMessageSent,
  reminderMessageLabel,
  reminderAutomationStatusLabel,
  isConfirmed,
  confirmedText,
  paymentStatus,
  signalAmountLabel,
  paidAmountLabel,
  paymentDateLabel,
  hasReceiptSent,
  hasChargeSent,
  showManualRegister,
  canRegisterSignal,
  canRegisterFull,
  signalRemainingLabel,
  remainingAmount,
  remainingAmountLabel,
  paymentMethod,
  internalNotes,
  onSelectPaymentMethod,
  onSendCreatedMessage,
  onSendReminder,
  onConfirmClient,
  onOpenCancelDialog,
  onSendPaymentCharge,
  onRecordSignalPayment,
  onRecordFullPayment,
  onSendSignalChargeMessage,
  onSendSignalReceiptMessage,
  onSendPaidReceiptMessage,
}: AppointmentDetailsActiveViewProps) {
  return (
    <div className="mt-6 space-y-5">
      <section>
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
          <MapPin className="w-3.5 h-3.5" />
          Logística
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-3 border border-line text-center">
            <span className="text-xs font-bold text-studio-text block">{dateLabel}</span>
            <span className="text-[10px] font-bold text-muted uppercase">{timeLabel}</span>
          </div>
          <div
            className={`bg-white rounded-2xl p-3 border border-line col-span-2 relative ${
              isHomeVisit ? "" : "flex items-center justify-center"
            }`}
          >
            {isHomeVisit ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-dom-strong">
                    Domicílio
                  </span>
                </div>
                {hasAddress && (
                  <p className="text-xs font-bold text-studio-text truncate pr-8 mt-1">
                    {addressLine}
                  </p>
                )}
                {hasAddress && mapsHref && (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-dom-strong shadow-sm border border-line"
                    aria-label="Abrir rota no mapa"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </a>
                )}
              </>
            ) : (
              <p className="text-base font-extrabold text-studio-green tracking-wide w-full text-center">
                Estúdio
              </p>
            )}
          </div>
        </div>
        {attendanceCode && (
          <div className="mt-3 rounded-2xl border border-line bg-paper px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                Código de atendimento
              </span>
              <code className="text-xs font-extrabold tracking-[0.08em] text-studio-text">
                {attendanceCode}
              </code>
            </div>
            {attendanceCodeHint && (
              <p className="mt-1 text-[10px] text-muted">{attendanceCodeHint}</p>
            )}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
          <MessageSquare className="w-3.5 h-3.5" />
          Comunicação
        </div>

        <div className="bg-white rounded-2xl border border-line px-4 py-2 shadow-sm">
          <div className="flex items-center justify-between gap-3 py-3 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-studio-text">Aviso de Agendamento</p>
                <p className="text-[10px] text-muted">{createdMessageLabel}</p>
                <p className="text-[10px] text-muted">{createdAutomationStatusLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onSendCreatedMessage}
              disabled={actionPending}
              className="px-3 py-1.5 bg-studio-text text-white rounded-full text-[10px] font-extrabold transition disabled:opacity-60"
            >
              {createdMessageSent ? "Reenviar" : "Enviar"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 py-3 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-studio-text">Lembrete 24h</p>
                <p className="text-[10px] text-muted">{reminderMessageLabel}</p>
                <p className="text-[10px] text-muted">{reminderAutomationStatusLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onSendReminder}
              disabled={actionPending}
              className="px-3 py-1.5 bg-studio-text text-white rounded-full text-[10px] font-extrabold transition disabled:opacity-60"
            >
              {reminderMessageSent ? "Reenviar" : "Enviar"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                <ThumbsUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-studio-text">Confirmação do Cliente</p>
                <p className="text-[10px] text-muted">
                  {isConfirmed ? confirmedText : "Aguardando resposta..."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isConfirmed && (
                <button
                  type="button"
                  onClick={onConfirmClient}
                  disabled={actionPending}
                  className="px-3 py-1.5 border border-studio-green text-studio-green rounded-full text-[10px] font-extrabold transition disabled:opacity-60"
                >
                  Confirmar
                </button>
              )}
              <button
                type="button"
                onClick={onOpenCancelDialog}
                disabled={actionPending}
                className="px-3 py-1.5 border border-red-200 text-red-600 rounded-full text-[10px] font-extrabold transition disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
          <Wallet className="w-3.5 h-3.5" />
          Financeiro
        </div>

        <div className="bg-white rounded-2xl border border-line px-4 py-2 shadow-sm">
          {paymentStatus === "pending" && (
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-studio-text">Sinal / Reserva</p>
                  <p className="text-[10px] text-amber-600 font-semibold">Pendente</p>
                  <p className="text-[10px] text-muted">Valor do sinal: {signalAmountLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSendSignalChargeMessage}
                disabled={actionPending}
                className="px-3 py-1.5 bg-studio-text text-white rounded-full text-[10px] font-extrabold transition disabled:opacity-60"
              >
                Cobrar Sinal
              </button>
            </div>
          )}

          {paymentStatus === "partial" && (
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-studio-text">Sinal / Reserva</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">
                    {paymentDateLabel ? `Pago em ${paymentDateLabel}` : "Pago"}
                  </p>
                  <p className="text-[10px] text-muted">Valor pago: {paidAmountLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSendSignalReceiptMessage}
                disabled={actionPending}
                className="px-3 py-1.5 bg-studio-text text-white rounded-full text-[10px] font-extrabold transition disabled:opacity-60"
              >
                Enviar comprovante
              </button>
            </div>
          )}

          {paymentStatus === "paid" && (
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-studio-text">Pagamento integral</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">
                    {paymentDateLabel ? `Pago integralmente em ${paymentDateLabel}` : "Pago integralmente"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSendPaidReceiptMessage}
                disabled={actionPending}
                className="px-3 py-1.5 bg-studio-text text-white rounded-full text-[10px] font-extrabold transition disabled:opacity-60"
              >
                Enviar comprovante
              </button>
            </div>
          )}

          {paymentStatus === "waived" && (
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-studio-text">Pagamento liberado</p>
                  <p className="text-[10px] text-sky-600 font-semibold">
                    Cobrança dispensada por decisão interna
                  </p>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-extrabold">
                Sem cobrança
              </span>
            </div>
          )}

          {paymentStatus === "refunded" && (
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-studio-text">Pagamento estornado</p>
                  <p className="text-[10px] text-slate-600 font-semibold">
                    Reavalie cobrança complementar, se necessário
                  </p>
                </div>
              </div>
            </div>
          )}

          {showManualRegister && (
            <div className="border-t border-line pt-3">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                Registrar pagamento manual
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {([
                  { key: "pix", label: "Pix", icon: <PaymentMethodIcon method="pix" className="h-3.5 w-3.5" /> },
                  { key: "card", label: "Cartão", icon: <PaymentMethodIcon method="card" className="h-3.5 w-3.5" /> },
                  { key: "cash", label: "Dinheiro", icon: <PaymentMethodIcon method="cash" className="h-3.5 w-3.5" /> },
                ] as const).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelectPaymentMethod(item.key)}
                    disabled={actionPending}
                    className={`h-9 rounded-xl text-[10px] font-extrabold border transition ${
                      paymentMethod === item.key
                        ? "border-studio-green bg-studio-light text-studio-green"
                        : "border-line text-muted hover:bg-paper"
                    } ${actionPending ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      {item.icon}
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className={`mt-3 grid gap-2 ${canRegisterSignal && canRegisterFull ? "grid-cols-2" : "grid-cols-1"}`}>
                {canRegisterSignal && (
                  <button
                    type="button"
                    onClick={onRecordSignalPayment}
                    disabled={actionPending}
                    className={`h-10 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border transition ${
                      "border-amber-200 text-amber-700 bg-amber-50"
                    } ${actionPending ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    Registrar sinal ({signalRemainingLabel})
                  </button>
                )}
                {canRegisterFull && (
                  <button
                    type="button"
                    onClick={onRecordFullPayment}
                    disabled={actionPending || remainingAmount <= 0}
                    className={`h-10 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border transition ${
                      "border-studio-green text-studio-green bg-studio-light"
                    } ${actionPending ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    Pagamento integral ({remainingAmountLabel})
                  </button>
                )}
              </div>
              <p className="mt-2 text-[10px] text-muted">
                O valor do sinal segue a porcentagem configurada nas configurações.
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-stone-100 text-muted">
              {hasReceiptSent ? "Recibo enviado" : "Recibo pendente"}
            </span>
            <span className="px-2 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-stone-100 text-muted">
              {hasChargeSent ? "Cobrança enviada" : "Cobrança pendente"}
            </span>
          </div>

          <button
            type="button"
            onClick={onSendPaymentCharge}
            disabled={actionPending}
            className="mt-3 w-full h-10 rounded-xl border border-studio-text/10 bg-white text-[10px] font-extrabold uppercase tracking-wide text-studio-text disabled:opacity-60"
          >
            {hasChargeSent ? "Reenviar cobrança" : "Enviar cobrança"}
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
          <Eye className="w-3.5 h-3.5" />
          Atenção
        </div>
        {internalNotes.trim() && (
          <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-xl flex gap-3 items-start">
            <StickyNote className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-yellow-700 mb-1">
                Observação do formulário de agendamento
              </p>
              <p className="text-xs text-yellow-800 leading-relaxed">{internalNotes}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
