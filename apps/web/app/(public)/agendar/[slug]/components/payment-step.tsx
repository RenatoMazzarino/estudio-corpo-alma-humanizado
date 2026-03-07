"use client";

import { formatCurrencyBRL } from "../../../../../src/shared/currency";
import { PublicCheckoutPanel } from "../../../../../src/modules/payments/public-checkout/public-checkout-panel";
import type { PublicCheckoutPixPayment } from "../../../../../src/modules/payments/public-checkout/types";

type PaymentStepProps = {
  payableSignalAmount: number;
  paymentMethod: "pix" | "card" | null;
  pixPayment: PublicCheckoutPixPayment | null;
  pixStatus: "idle" | "loading" | "error";
  pixRemainingLabel: string;
  pixProgressPct: number;
  pixQrExpired: boolean;
  cardStatus: "idle" | "loading" | "error";
  resolvedClientFullName: string;
  normalizedClientEmail: string;
  appointmentId: string | null;
  onCopyPix: () => void;
  onRegeneratePix: () => void;
  statusMessage?: string | null;
};

export function PaymentStep({
  payableSignalAmount,
  paymentMethod,
  pixPayment,
  pixStatus,
  pixRemainingLabel,
  pixProgressPct,
  pixQrExpired,
  cardStatus,
  resolvedClientFullName,
  normalizedClientEmail,
  appointmentId,
  onCopyPix,
  onRegeneratePix,
  statusMessage,
}: PaymentStepProps) {
  return (
    <section className="no-scrollbar animate-in fade-in slide-in-from-right-6 duration-500 flex flex-1 flex-col overflow-y-auto px-6 pb-32 pt-3">
      <div className="mb-6">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Etapa Final</span>
        <h2 className="mt-2 text-3xl font-serif text-studio-text">Pagamento</h2>
      </div>

      <PublicCheckoutPanel
        title="Total a pagar"
        amountLabel={formatCurrencyBRL(payableSignalAmount)}
        paymentMethod={paymentMethod}
        pixPayment={pixPayment}
        pixStatus={pixStatus}
        pixRemainingLabel={pixRemainingLabel}
        pixProgressPct={pixProgressPct}
        pixQrExpired={pixQrExpired}
        cardStatus={cardStatus}
        payerName={resolvedClientFullName}
        payerEmail={normalizedClientEmail}
        subjectLabel={appointmentId ? `Agendamento #${appointmentId}` : null}
        onCopyPix={onCopyPix}
        onRegeneratePix={onRegeneratePix}
        statusMessage={statusMessage}
      />
    </section>
  );
}
