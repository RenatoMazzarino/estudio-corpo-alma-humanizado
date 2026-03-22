import { useEffect, useState } from "react";
import { ChevronDown, Eye, MapPin, MessageSquare, Wallet } from "lucide-react";
import { PaymentMethodIcon } from "../ui/payment-method-icon";

type PaymentMethod = "pix" | "card" | "cash" | "other";

interface AppointmentDetailsCompletedViewProps {
  actionPending: boolean;
  dateLabel: string;
  timeLabel: string;
  durationLabel: string;
  isHomeVisit: boolean;
  hasAddress: boolean;
  mapsHref: string | null;
  paymentInfo: { textClass: string };
  paymentStatusLabel: string;
  paidAmountLabel: string;
  latestPaymentMethod: string;
  remainingAmountLabel: string;
  hasReceiptSent: boolean;
  hasChargeSent: boolean;
  paymentStatus: "paid" | "partial" | "pending" | "waived" | "refunded";
  paymentMethod: PaymentMethod;
  remainingAmount: number;
  followUpDateLabel: string;
  followUpNoteLabel: string;
  evolutionPreviewText: string;
  surveyScore: number | null;
  hasSurveySent: boolean;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  onSendPaymentCharge: () => void;
  onRecordPayment: () => void;
  onSendPaymentReceipt: () => void;
  onSendSurvey: () => void;
  onOpenEvolutionModal: () => void;
}

export function AppointmentDetailsCompletedView({
  actionPending,
  dateLabel,
  timeLabel,
  durationLabel,
  isHomeVisit,
  hasAddress,
  mapsHref,
  paymentInfo,
  paymentStatusLabel,
  paidAmountLabel,
  latestPaymentMethod,
  remainingAmountLabel,
  hasReceiptSent,
  hasChargeSent,
  paymentStatus,
  paymentMethod,
  remainingAmount,
  followUpDateLabel,
  followUpNoteLabel,
  evolutionPreviewText,
  surveyScore,
  hasSurveySent,
  onSelectPaymentMethod,
  onSendPaymentCharge,
  onRecordPayment,
  onSendPaymentReceipt,
  onSendSurvey,
  onOpenEvolutionModal,
}: AppointmentDetailsCompletedViewProps) {
  const canExpandFinance = paymentStatus === "pending" || paymentStatus === "partial";
  const [financeExpanded, setFinanceExpanded] = useState(false);

  useEffect(() => {
    if (!canExpandFinance) {
      setFinanceExpanded(false);
    }
  }, [canExpandFinance]);

  return (
    <div className="space-y-4">
      <section>
        <div className="wl-surface-card shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-line wl-surface-card-header px-4 py-2.5">
            <MapPin className="h-3.5 w-3.5 text-muted" />
            <p className="wl-typo-label text-studio-text">Logistica</p>
          </div>
          <div className="p-4 wl-surface-card-body">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-line bg-paper p-2.5 text-center">
                <p className="wl-typo-title text-studio-text">{dateLabel}</p>
                <p className="wl-typo-body-sm pt-0.5 text-muted">{timeLabel}</p>
              </div>
              <div className="rounded-lg border border-line bg-paper p-2.5 text-center">
                <p className="wl-typo-title text-studio-text">{durationLabel}</p>
                <p className="wl-typo-body-sm pt-0.5 text-muted">Duracao</p>
              </div>
              <div className="rounded-lg border border-line bg-paper p-2.5 text-center">
                <p className="wl-typo-title text-studio-text">{isHomeVisit ? "Domicilio" : "Estudio"}</p>
                <p className="wl-typo-body-sm pt-0.5 text-muted">Local</p>
              </div>
            </div>

            {isHomeVisit && hasAddress && mapsHref && (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="wl-typo-chip mt-3 inline-flex h-8 items-center gap-1 rounded-full border border-line bg-paper px-3 text-studio-text"
              >
                <MapPin className="h-3.5 w-3.5" />
                Abrir localizacao
              </a>
            )}
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
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="wl-typo-body-sm text-muted">Status</span>
                  <span className={`wl-typo-body-sm-strong ${paymentInfo.textClass}`}>{paymentStatusLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="wl-typo-body-sm text-muted">Valor pago</span>
                  <span className="wl-typo-body-sm-strong text-studio-text">{paidAmountLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="wl-typo-body-sm text-muted">Metodo</span>
                  <span className="wl-typo-body-sm-strong text-studio-text">{latestPaymentMethod}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="wl-typo-body-sm text-muted">A receber</span>
                  <span className="wl-typo-body-sm-strong text-studio-text">{remainingAmountLabel}</span>
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
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: "pix", label: "Pix", icon: <PaymentMethodIcon method="pix" className="h-3.5 w-3.5" /> },
                  { key: "card", label: "Cartao", icon: <PaymentMethodIcon method="card" className="h-3.5 w-3.5" /> },
                  { key: "cash", label: "Dinheiro", icon: <PaymentMethodIcon method="cash" className="h-3.5 w-3.5" /> },
                ] as const).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelectPaymentMethod(item.key)}
                    disabled={actionPending}
                    className={`wl-typo-label h-9 rounded-lg border transition ${
                      paymentMethod === item.key
                        ? "border-studio-green bg-studio-light text-studio-green"
                        : "border-line text-muted hover:bg-paper"
                    } ${actionPending ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      {item.icon}
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onSendPaymentCharge}
                  disabled={actionPending}
                  className="wl-typo-label h-10 rounded-lg border border-line bg-paper text-studio-text disabled:opacity-60"
                >
                  {hasChargeSent ? "Reenviar cobranca" : "Enviar cobranca"}
                </button>
                <button
                  type="button"
                  onClick={onRecordPayment}
                  disabled={actionPending || remainingAmount <= 0}
                  className="wl-typo-label h-10 rounded-lg border border-studio-green bg-studio-light text-studio-green disabled:opacity-60"
                >
                  Incluir pagamento
                </button>
              </div>
            </div>
          )}

          {!canExpandFinance && paymentStatus === "paid" && (
            <div className="border-t border-line p-4 wl-surface-card-body">
              <button
                type="button"
                onClick={onSendPaymentReceipt}
                disabled={actionPending}
                className="wl-typo-label h-10 w-full rounded-lg border border-studio-green bg-studio-light text-studio-green disabled:opacity-60"
              >
                {hasReceiptSent ? "Reenviar recibo" : "Enviar recibo"}
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
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wl-surface-card shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-line wl-surface-card-header px-4 py-2.5">
            <MessageSquare className="h-3.5 w-3.5 text-muted" />
            <p className="wl-typo-label text-studio-text">Avaliacao</p>
          </div>
          <div className="p-4 wl-surface-card-body">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <span className="wl-typo-body-sm text-muted">Pesquisa</span>
                <span className="wl-typo-body-sm-strong text-studio-text">{hasSurveySent ? "Enviada" : "Pendente"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="wl-typo-body-sm text-muted">Resposta</span>
                <span className="wl-typo-body-sm-strong text-studio-text">
                  {surveyScore !== null && surveyScore !== undefined ? `Nota ${surveyScore}` : "Sem resposta"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onSendSurvey}
              disabled={actionPending}
              className="wl-typo-label mt-3 h-10 w-full rounded-lg border border-line bg-paper text-studio-text disabled:opacity-60"
            >
              {hasSurveySent ? "Reenviar pesquisa" : "Enviar pesquisa"}
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="wl-surface-card shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-line wl-surface-card-header px-4 py-2.5">
            <Eye className="h-3.5 w-3.5 text-muted" />
            <p className="wl-typo-label text-studio-text">Follow-up e evolucao</p>
          </div>
          <div className="p-4 wl-surface-card-body">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <span className="wl-typo-body-sm text-muted">Proximo contato</span>
                <span className="wl-typo-body-sm-strong text-studio-text">{followUpDateLabel}</span>
              </div>
              <p className="wl-typo-body-sm text-muted">{followUpNoteLabel}</p>
            </div>

            <div className="mt-3 rounded-lg border border-line bg-paper p-3">
              <p className="wl-typo-label text-muted">Evolucao da sessao</p>
              <p className="wl-typo-body-sm max-h-24 overflow-y-auto whitespace-pre-wrap pt-1 leading-relaxed text-studio-text">
                {evolutionPreviewText}
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenEvolutionModal}
              disabled={actionPending}
              className="wl-typo-label mt-3 h-10 w-full rounded-lg bg-studio-green text-white disabled:opacity-60"
            >
              Editar evolucao
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}


