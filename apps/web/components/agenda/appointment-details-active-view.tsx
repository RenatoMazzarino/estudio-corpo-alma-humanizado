import { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Eye,
  Gift,
  MapPin,
  MessageSquare,
  ReceiptText,
  StickyNote,
  ThumbsUp,
  Wallet,
} from "lucide-react";

import { PaymentMethodIcon } from "../ui/payment-method-icon";
import { WhatsAppIcon } from "../ui/whatsapp-icon";

type PaymentMethod = "pix" | "card" | "cash" | "other";

interface AppointmentDetailsActiveViewProps {
  actionPending: boolean;
  dateLabel: string;
  timeLabel: string;
  isHomeVisit: boolean;
  hasAddress: boolean;
  addressLine: string;
  mapsHref: string | null;
  createdAutomationStatusLabel: string;
  reminderAutomationStatusLabel: string;
  isConfirmed: boolean;
  confirmedText: string;
  paymentStatus: "pending" | "partial" | "paid" | "waived" | "refunded";
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
  onOpenCancelDialog: () => void;
  onSendPaymentCharge: () => void;
  onRecordSignalPayment: () => void;
  onRecordFullPayment: () => void;
  onSendSignalChargeMessage: () => void;
  onSendPaymentChargeMessage: () => void;
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
  createdAutomationStatusLabel,
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
  onOpenCancelDialog,
  onSendPaymentCharge,
  onRecordSignalPayment,
  onRecordFullPayment,
  onSendSignalChargeMessage,
  onSendPaymentChargeMessage,
  onSendPaidReceiptMessage,
}: AppointmentDetailsActiveViewProps) {
  const canExpandFinance = paymentStatus === "pending" || paymentStatus === "partial";
  const [financeExpanded, setFinanceExpanded] = useState(canExpandFinance);

  useEffect(() => {
    setFinanceExpanded(canExpandFinance);
  }, [canExpandFinance]);

  const financeSummary = (() => {
    if (paymentStatus === "pending") {
      return {
        title: "Nada pago",
        subtitleLabel: "Total a cobrar",
        subtitleValue: remainingAmountLabel,
      };
    }

    if (paymentStatus === "partial") {
      return {
        title: "Sinal pago",
        subtitleLabel: "Saldo a cobrar",
        subtitleValue: remainingAmountLabel,
      };
    }

    if (paymentStatus === "paid") {
      return {
        title: "Pagamento integral",
        subtitleLabel: paymentDateLabel ? `Pago em ${paymentDateLabel}` : "Valor pago",
        subtitleValue: paidAmountLabel,
      };
    }

    if (paymentStatus === "waived") {
      return {
        title: "Pagamento liberado",
        subtitleLabel: "Sem cobranca",
        subtitleValue: "-",
      };
    }

    return {
      title: "Pagamento estornado",
      subtitleLabel: "Status",
      subtitleValue: "Estornado",
    };
  })();

  const handleRegisterPayment = () => {
    if (paymentStatus === "pending" && canRegisterSignal) {
      onRecordSignalPayment();
      return;
    }
    onRecordFullPayment();
  };

  const hasNotes = internalNotes.trim().length > 0;
  const gpsChooserHref = hasAddress
    ? `geo:0,0?q=${encodeURIComponent(addressLine)}`
    : null;

  return (
    <div className="space-y-4">
      <section>
        <div className="wl-surface-card shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-line wl-surface-card-header px-4 py-2.5">
            <MapPin className="h-3.5 w-3.5 text-muted" />
            <p className="wl-typo-label text-studio-text">Logistica</p>
          </div>

          <div className="p-4 wl-surface-card-body">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="wl-typo-title text-studio-text">{dateLabel}</p>
                <p className="wl-typo-body-sm pt-0.5 text-muted">{timeLabel}</p>
              </div>
              <span className="wl-typo-body-sm rounded-lg border border-line bg-paper px-2 py-1 text-muted">
                {isHomeVisit ? "Domicilio" : "Estudio"}
              </span>
            </div>

            {isHomeVisit && hasAddress && (
              <div className="mt-3 flex items-start justify-between gap-3 border-t border-line pt-3">
                <div>
                  <p className="wl-typo-title text-studio-text">Endereco</p>
                  <p className="wl-typo-body-sm pt-0.5 leading-5 text-muted">{addressLine}</p>
                </div>
                {(gpsChooserHref || mapsHref) && (
                  <a
                    href={gpsChooserHref ?? mapsHref ?? "#"}
                    onClick={(event) => {
                      if (!gpsChooserHref || !mapsHref) return;
                      event.preventDefault();
                      window.location.href = gpsChooserHref;
                      window.setTimeout(() => {
                        window.open(mapsHref, "_blank", "noopener,noreferrer");
                      }, 500);
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line wl-surface-card-body text-studio-text"
                    aria-label="Abrir rota no mapa"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="wl-surface-card shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-line wl-surface-card-header px-4 py-2.5">
            <MessageSquare className="h-3.5 w-3.5 text-muted" />
            <p className="wl-typo-label text-studio-text">Comunicacao</p>
          </div>

          <div className="flex items-center justify-between border-b border-line wl-surface-card-header px-4 py-3">
            <div className="flex items-center gap-2.5">
              <ThumbsUp className="h-4 w-4 text-muted" />
              <p className="wl-typo-label text-studio-text">Status da cliente</p>
            </div>
            <span
              className={`wl-typo-chip rounded-md border px-2 py-0.5 ${
                isConfirmed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-line bg-paper text-muted"
              }`}
            >
              {isConfirmed ? "Confirmado" : "Aguardando"}
            </span>
          </div>

          <div className="space-y-3 p-4 wl-surface-card-body">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-paper text-muted">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <p className="wl-typo-title text-studio-text">Aviso de agendamento</p>
                <p className="wl-typo-body-sm pt-0.5 text-muted">{createdAutomationStatusLabel}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-paper text-muted">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="wl-typo-title text-studio-text">Confirmacao 24h</p>
                <p className="wl-typo-body-sm pt-0.5 text-muted">{reminderAutomationStatusLabel}</p>
              </div>
            </div>

            <div className="wl-typo-body-sm rounded-lg border border-line bg-paper px-3 py-2.5 text-muted">
              {isConfirmed ? confirmedText : "Aguardando resposta da cliente."}
            </div>
          </div>

          <div className="border-t border-line p-3 wl-surface-card-body">
            <button
              type="button"
              onClick={onOpenCancelDialog}
              disabled={actionPending}
              className="wl-typo-label h-9 w-full rounded-lg border border-red-700 bg-red-600 text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              Cancelar agendamento
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="wl-surface-card shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-line wl-surface-card-header px-4 py-2.5">
            <Wallet className="h-3.5 w-3.5 text-muted" />
            <p className="wl-typo-label text-studio-text">Financeiro</p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (canExpandFinance) {
                setFinanceExpanded((prev) => !prev);
              }
            }}
            className={`w-full p-4 wl-surface-card-body text-left ${canExpandFinance ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-paper text-studio-text">
                  <ReceiptText className="h-4 w-4" />
                </div>
                <div>
                  <p className="wl-typo-h2 leading-none text-studio-text">{financeSummary.title}</p>
                  <p className="wl-typo-body pt-1 text-muted">
                    {financeSummary.subtitleLabel}: <span className="wl-typo-body-strong text-studio-text">{financeSummary.subtitleValue}</span>
                  </p>
                </div>
              </div>

              {canExpandFinance ? (
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted transition-transform ${financeExpanded ? "rotate-180" : "rotate-0"}`}
                />
              ) : null}
            </div>
          </button>

          {canExpandFinance && financeExpanded && (
            <div className="border-t border-line p-4 wl-surface-card-body">
              <p className="wl-typo-label mb-3 text-muted">
                Registrar cobranca (sinal ou total)
              </p>

              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectPaymentMethod("pix")}
                  disabled={actionPending}
                  className={`rounded-xl border border-line px-2 py-3 text-center transition ${
                    paymentMethod === "pix" ? "bg-studio-light text-studio-green" : "wl-surface-card-body text-studio-text"
                  } ${actionPending ? "opacity-60" : ""}`}
                >
                  <PaymentMethodIcon method="pix" className="mx-auto h-4 w-4" />
                  <span className="wl-typo-chip mt-2 block">Pix</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectPaymentMethod("card")}
                  disabled={actionPending}
                  className={`rounded-xl border border-line px-2 py-3 text-center transition ${
                    paymentMethod === "card" ? "bg-studio-light text-studio-green" : "wl-surface-card-body text-studio-text"
                  } ${actionPending ? "opacity-60" : ""}`}
                >
                  <CreditCard className="mx-auto h-4 w-4" />
                  <span className="wl-typo-chip mt-2 block">Credito</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectPaymentMethod("cash")}
                  disabled={actionPending}
                  className={`rounded-xl border border-line px-2 py-3 text-center transition ${
                    paymentMethod === "cash" ? "bg-studio-light text-studio-green" : "wl-surface-card-body text-studio-text"
                  } ${actionPending ? "opacity-60" : ""}`}
                >
                  <Wallet className="mx-auto h-4 w-4" />
                  <span className="wl-typo-chip mt-2 block">Dinheiro</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectPaymentMethod("other")}
                  disabled={actionPending}
                  className={`rounded-xl border border-line px-2 py-3 text-center transition ${
                    paymentMethod === "other" ? "bg-studio-light text-studio-green" : "wl-surface-card-body text-studio-text"
                  } ${actionPending ? "opacity-60" : ""}`}
                >
                  <Gift className="mx-auto h-4 w-4" />
                  <span className="wl-typo-chip mt-2 block">Cortesia</span>
                </button>
              </div>

              {showManualRegister && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleRegisterPayment}
                    disabled={actionPending || (!canRegisterSignal && !canRegisterFull) || remainingAmount <= 0}
                    className="wl-typo-button h-12 rounded-xl bg-studio-green px-3 text-white disabled:opacity-60"
                  >
                    Registrar Pagamento
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (paymentStatus === "pending") {
                        onSendSignalChargeMessage();
                        return;
                      }
                      onSendPaymentChargeMessage();
                    }}
                    disabled={actionPending}
                    className="wl-typo-button flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-paper px-3 text-studio-text disabled:opacity-60"
                  >
                    <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                    Enviar Cobranca
                  </button>
                </div>
              )}
            </div>
          )}

          {!canExpandFinance && paymentStatus === "paid" && (
            <div className="border-t border-line p-4 wl-surface-card-body">
              <button
                type="button"
                onClick={onSendPaidReceiptMessage}
                disabled={actionPending}
                className="wl-typo-label h-10 w-full rounded-xl border border-studio-green bg-studio-light text-studio-green disabled:opacity-60"
              >
                {hasReceiptSent ? "Reenviar recibo" : "Enviar recibo"}
              </button>
            </div>
          )}

          {!canExpandFinance && (paymentStatus === "waived" || paymentStatus === "refunded") && (
            <div className="border-t border-line p-4 wl-surface-card-body">
              <button
                type="button"
                onClick={onSendPaymentCharge}
                disabled={actionPending}
                className="wl-typo-label h-10 w-full rounded-xl border border-line bg-paper text-studio-text disabled:opacity-60"
              >
                {hasChargeSent ? "Reenviar cobranca" : "Enviar cobranca"}
              </button>
            </div>
          )}

          <div className="border-t border-line px-4 py-3 wl-surface-card-body">
            <div className="flex flex-wrap gap-2">
              <span className="wl-typo-chip rounded-md border border-line bg-paper px-2 py-1 text-muted">
                {hasReceiptSent ? "Recibo enviado" : "Recibo pendente"}
              </span>
              <span className="wl-typo-chip rounded-md border border-line bg-paper px-2 py-1 text-muted">
                {hasChargeSent ? "Cobranca enviada" : "Cobranca pendente"}
              </span>
              {paymentStatus === "pending" && (
                <span className="wl-typo-chip rounded-md border border-line bg-paper px-2 py-1 text-muted">
                  Sinal: {signalAmountLabel}
                </span>
              )}
              {paymentStatus === "partial" && (
                <span className="wl-typo-chip rounded-md border border-line bg-paper px-2 py-1 text-muted">
                  Falta: {signalRemainingLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wl-surface-card shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-line wl-surface-card-header px-4 py-2.5">
            <Eye className="h-3.5 w-3.5 text-muted" />
            <p className="wl-typo-label text-studio-text">Observacoes</p>
          </div>
          <div className="p-4 wl-surface-card-body">
            <div className="flex items-start gap-3">
              <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
              <div>
                <p className="wl-typo-label text-muted">Notas do agendamento</p>
                <p className="wl-typo-body-sm pt-1 leading-relaxed text-studio-text">
                  {hasNotes ? internalNotes : "Sem observacoes registradas para este agendamento."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


