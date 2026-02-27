import { Eye, MapPin, MessageSquare, Wallet } from "lucide-react";
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
  attendanceCode?: string | null;
  attendanceCodeHint?: string | null;
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
  attendanceCode,
  attendanceCodeHint,
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
  return (
    <div className="mt-6 space-y-5">
      <section>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted">
          <MapPin className="h-3.5 w-3.5" />
          Logística
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-line bg-white p-3 text-center">
            <span className="block text-xs font-bold text-studio-text">{dateLabel}</span>
            <span className="text-[10px] font-bold uppercase text-muted">{timeLabel}</span>
          </div>
          <div className="rounded-2xl border border-line bg-white p-3 text-center">
            <span className="block text-xs font-bold text-studio-text">{durationLabel}</span>
            <span className="text-[10px] font-bold uppercase text-muted">Duração</span>
          </div>
          <div className="rounded-2xl border border-line bg-white p-3 text-center">
            <span className="block text-xs font-bold text-studio-text">{isHomeVisit ? "Domicílio" : "Estúdio"}</span>
            <span className="text-[10px] font-bold uppercase text-muted">Local</span>
          </div>
        </div>
        {attendanceCode && (
          <div className="mt-3 rounded-2xl border border-line bg-paper px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                Código de atendimento
              </span>
              <code className="text-xs font-extrabold tracking-[0.08em] text-studio-text">{attendanceCode}</code>
            </div>
            {attendanceCodeHint && <p className="mt-1 text-[10px] text-muted">{attendanceCodeHint}</p>}
          </div>
        )}
        {isHomeVisit && hasAddress && mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-dom-strong"
          >
            <MapPin className="h-3.5 w-3.5" />
            Abrir localização
          </a>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted">
          <Wallet className="h-3.5 w-3.5" />
          Pagamento
        </div>
        <div className="space-y-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Status</span>
            <span className={`font-extrabold ${paymentInfo.textClass}`}>{paymentStatusLabel}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Valor pago</span>
            <span className="font-bold text-studio-text">{paidAmountLabel}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Método</span>
            <span className="font-bold text-studio-text">{latestPaymentMethod}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">A receber</span>
            <span className="font-bold text-studio-text">{remainingAmountLabel}</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <span className="rounded-full bg-stone-100 px-2 py-1 text-[9px] font-extrabold uppercase tracking-widest text-muted">
              {hasReceiptSent ? "Recibo enviado" : "Recibo pendente"}
            </span>
            <span className="rounded-full bg-stone-100 px-2 py-1 text-[9px] font-extrabold uppercase tracking-widest text-muted">
              {hasChargeSent ? "Cobrança enviada" : "Cobrança pendente"}
            </span>
          </div>

          {paymentStatus !== "paid" && paymentStatus !== "waived" && (
            <div className="border-t border-line pt-3">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Incluir pagamento manual</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
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
                    className={`h-9 rounded-xl border text-[10px] font-extrabold transition ${
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
                  className="h-10 rounded-xl border border-studio-text/10 bg-white text-[10px] font-extrabold uppercase tracking-wide text-studio-text disabled:opacity-60"
                >
                  {hasChargeSent ? "Reenviar cobrança" : "Enviar cobrança"}
                </button>
                <button
                  type="button"
                  onClick={onRecordPayment}
                  disabled={actionPending || remainingAmount <= 0}
                  className="h-10 rounded-xl border border-studio-green bg-studio-light text-[10px] font-extrabold uppercase tracking-wide text-studio-green disabled:opacity-60"
                >
                  Incluir pagamento
                </button>
              </div>
            </div>
          )}

          {paymentStatus === "paid" && (
            <div className="border-t border-line pt-3">
              <button
                type="button"
                onClick={onSendPaymentReceipt}
                disabled={actionPending}
                className="h-10 w-full rounded-xl border border-studio-green bg-studio-light text-[10px] font-extrabold uppercase tracking-wide text-studio-green disabled:opacity-60"
              >
                {hasReceiptSent ? "Reenviar recibo" : "Enviar recibo"}
              </button>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted">
          <MessageSquare className="h-3.5 w-3.5" />
          Avaliação e feedback
        </div>
        <div className="space-y-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Pesquisa</span>
            <span className="font-bold text-studio-text">{hasSurveySent ? "Enviada" : "Pendente"}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Resposta</span>
            <span className="font-bold text-studio-text">
              {surveyScore !== null && surveyScore !== undefined ? `Nota ${surveyScore}` : "Sem resposta"}
            </span>
          </div>
          <button
            type="button"
            onClick={onSendSurvey}
            disabled={actionPending}
            className="h-10 w-full rounded-xl border border-studio-text/10 bg-white text-[10px] font-extrabold uppercase tracking-wide text-studio-text disabled:opacity-60"
          >
            {hasSurveySent ? "Reenviar pesquisa" : "Enviar pesquisa"}
          </button>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted">
          <Eye className="h-3.5 w-3.5" />
          Follow-up e evolução
        </div>
        <div className="space-y-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Próximo contato</span>
            <span className="font-bold text-studio-text">{followUpDateLabel}</span>
          </div>
          <div className="text-xs text-muted">{followUpNoteLabel}</div>

          <div className="rounded-xl border border-line bg-paper p-3">
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-muted">Evolução da sessão</p>
            <p className="max-h-24 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-studio-text">
              {evolutionPreviewText}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenEvolutionModal}
            disabled={actionPending}
            className="mt-1 h-10 w-full rounded-xl bg-studio-green text-[10px] font-extrabold uppercase tracking-wide text-white disabled:opacity-60"
          >
            Editar evolução
          </button>
        </div>
      </section>
    </div>
  );
}
