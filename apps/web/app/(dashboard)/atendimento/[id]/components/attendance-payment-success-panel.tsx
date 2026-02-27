import { CheckCircle2, Loader2 } from "lucide-react";

import type { ReceiptFlowMode } from "./attendance-payment.types";

interface AttendancePaymentSuccessPanelProps {
  waiverSuccess: boolean;
  totalLabel: string;
  remainingLabel: string;
  receiptFlowMode: ReceiptFlowMode;
  autoReceiptStatus: "idle" | "sending" | "sent" | "failed";
  autoReceiptMessage: string | null;
  receiptSent: boolean;
  resolvingReceiptPrompt: boolean;
  successResolveLabel: string;
  onSendReceipt: () => void;
  onResolve: () => void;
}

export function AttendancePaymentSuccessPanel({
  waiverSuccess,
  totalLabel,
  remainingLabel,
  receiptFlowMode,
  autoReceiptStatus,
  autoReceiptMessage,
  receiptSent,
  resolvingReceiptPrompt,
  successResolveLabel,
  onSendReceipt,
  onResolve,
}: AttendancePaymentSuccessPanelProps) {
  return (
    <section className="mt-5 flex min-h-[58vh] flex-col items-center justify-center px-1 pb-1 text-center animate-in zoom-in duration-300">
      <div
        className={`h-24 w-24 rounded-full flex items-center justify-center mb-5 shadow-soft ${
          waiverSuccess ? "bg-sky-100 text-sky-600" : "bg-emerald-100 text-emerald-600"
        }`}
      >
        <CheckCircle2 className="h-11 w-11" />
      </div>

      <h3 className="text-3xl font-serif text-studio-text">
        {waiverSuccess ? "Cortesia aplicada!" : "Pagamento confirmado!"}
      </h3>
      <p className="mt-3 max-w-72 text-sm leading-relaxed text-muted">
        {waiverSuccess
          ? "Este atendimento foi liberado de cobrança e seguirá como cortesia interna."
          : "O pagamento foi registrado no atendimento com sucesso."}
      </p>

      <div className="mt-6 w-full rounded-2xl border border-line bg-white px-4 py-4 text-left shadow-soft">
        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</span>
          <span className={`text-sm font-bold ${waiverSuccess ? "text-sky-700" : "text-emerald-700"}`}>
            {waiverSuccess ? "Cortesia / liberado" : "Pagamento confirmado"}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total checkout</span>
          <span className="text-sm font-bold text-studio-text">{totalLabel}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Saldo restante</span>
          <span
            className={`text-sm font-bold ${
              waiverSuccess || remainingLabel === "Quitado" ? "text-emerald-700" : "text-studio-text"
            }`}
          >
            {waiverSuccess ? "Dispensado (cortesia)" : remainingLabel}
          </span>
        </div>
      </div>

      {!waiverSuccess && receiptFlowMode === "auto" ? (
        <div
          className={`mt-4 w-full rounded-2xl border px-4 py-3 text-sm ${
            autoReceiptStatus === "failed"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : autoReceiptStatus === "sent"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-line bg-paper text-studio-text"
          }`}
        >
          {autoReceiptStatus === "sending" && (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-studio-green" />
              {autoReceiptMessage ?? "Enviando recibo automaticamente..."}
            </span>
          )}
          {autoReceiptStatus !== "sending" &&
            (autoReceiptMessage ?? "Recibo será enviado automaticamente pelo WhatsApp.")}
        </div>
      ) : !waiverSuccess ? (
        <div className="mt-4 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-studio-text">
          {receiptSent ? "Recibo enviado pelo WhatsApp (manual)." : "Você pode enviar o recibo manualmente agora."}
        </div>
      ) : (
        <div className="mt-4 w-full rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {autoReceiptMessage ?? "Cortesia registrada. Nenhum recibo financeiro será enviado neste fluxo."}
        </div>
      )}

      {!waiverSuccess && receiptFlowMode === "manual" && (
        <button
          className="mt-5 w-full h-12 rounded-2xl border border-stone-200 bg-white text-studio-text font-bold uppercase tracking-widest text-xs hover:bg-stone-50 transition-colors disabled:opacity-60"
          onClick={onSendReceipt}
          disabled={resolvingReceiptPrompt}
        >
          {resolvingReceiptPrompt ? "Enviando recibo..." : receiptSent ? "Reenviar recibo" : "Enviar recibo"}
        </button>
      )}

      <button
        className="mt-3 w-full h-12 rounded-2xl bg-studio-green text-white font-bold uppercase tracking-widest text-xs hover:bg-studio-green-dark transition-colors disabled:opacity-60"
        onClick={onResolve}
        disabled={resolvingReceiptPrompt || (!waiverSuccess && autoReceiptStatus === "sending")}
      >
        {resolvingReceiptPrompt ? "Saindo..." : successResolveLabel}
      </button>
    </section>
  );
}
