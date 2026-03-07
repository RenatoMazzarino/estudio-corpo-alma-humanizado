"use client";

import { CheckCircle2, ExternalLink } from "lucide-react";
import Script from "next/script";
import { CardProcessingOverlay } from "../../(public)/agendar/[slug]/components/card-processing-overlay";
import { cardProcessingStages } from "../../(public)/agendar/[slug]/booking-flow-config";
import { PublicCheckoutPanel } from "../../../src/modules/payments/public-checkout/public-checkout-panel";
import { usePublicCheckoutController } from "../../../src/modules/payments/public-checkout/use-public-checkout-controller";
import {
  createPaymentLinkCard,
  createPaymentLinkPix,
  getPaymentLinkCardStatus,
  getPaymentLinkPixStatus,
} from "./actions";

type PaymentLinkClientProps = {
  publicId: string;
  clientName: string;
  payerEmail: string;
  serviceName: string;
  dateTimeLabel: string;
  locationLabel: string;
  remainingAmount: number;
  amountLabel: string;
  paidAmountLabel: string;
  remainingAmountLabel: string;
  referenceLabel: string;
  receiptHref: string;
  mercadoPagoPublicKey: string | null;
  isSettled: boolean;
  isSample: boolean;
};

export default function PaymentLinkClient({
  publicId,
  clientName,
  payerEmail,
  serviceName,
  dateTimeLabel,
  locationLabel,
  remainingAmount,
  amountLabel,
  paidAmountLabel,
  remainingAmountLabel,
  referenceLabel,
  receiptHref,
  mercadoPagoPublicKey,
  isSettled,
  isSample,
}: PaymentLinkClientProps) {
  const checkout = usePublicCheckoutController({
    active: !isSample,
    initialPaymentMethod: "pix",
    amount: remainingAmount,
    payerName: clientName,
    payerEmail,
    mercadoPagoPublicKey,
    initialCompleted: isSettled,
    createPixPayment: ({ attempt }) => createPaymentLinkPix({ publicId, attempt }),
    getPixPaymentStatus: () => getPaymentLinkPixStatus({ publicId }),
    createCardPayment: ({ token, paymentMethodId, installments, identificationType, identificationNumber }) =>
      createPaymentLinkCard({
        publicId,
        token,
        paymentMethodId,
        installments,
        identificationType,
        identificationNumber,
      }),
    getCardPaymentStatus: () => getPaymentLinkCardStatus({ publicId }),
  });

  const resolvedPaidAmountLabel = checkout.paymentCompleted ? amountLabel : paidAmountLabel;
  const resolvedRemainingAmountLabel = checkout.paymentCompleted ? "R$ 0,00" : remainingAmountLabel;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f6f4f1_55%,_#efe8dd)] px-4 py-8 text-studio-text sm:px-6 lg:px-8">
      {!isSample && !checkout.paymentCompleted && (
        <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" onLoad={() => checkout.setMpReady(true)} />
      )}

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row">
        <section className="lg:w-[420px]">
          <div className="rounded-[32px] border border-stone-200/70 bg-white/90 p-6 shadow-[0_30px_80px_rgba(70,54,32,0.12)] backdrop-blur">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-studio-green">Checkout público</p>
            <h1 className="mt-3 text-3xl font-serif leading-tight">{checkout.paymentCompleted ? "Pagamento confirmado" : `Olá, ${clientName}`}</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {checkout.paymentCompleted
                ? "Recebemos o pagamento deste atendimento. O comprovante digital já está disponível."
                : "Este link permite quitar o atendimento integralmente por Pix ou cartão sem depender de atendimento manual."}
            </p>

            <div className="mt-6 space-y-4 rounded-[28px] bg-[#f8f5ef] p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Serviço</p>
                <p className="mt-1 text-lg font-semibold text-studio-text">{serviceName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Data e horário</p>
                <p className="mt-1 text-sm font-medium text-studio-text">{dateTimeLabel}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Local</p>
                <p className="mt-1 text-sm font-medium text-studio-text">{locationLabel}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Total</p>
                  <p className="mt-1 text-base font-semibold text-studio-text">{amountLabel}</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Pago</p>
                  <p className="mt-1 text-base font-semibold text-studio-text">{resolvedPaidAmountLabel}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-studio-green/20 bg-studio-green/10 px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-studio-green">Valor a quitar agora</p>
                <p className="mt-2 text-3xl font-serif font-bold text-studio-text">{resolvedRemainingAmountLabel}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-3 text-xs text-muted">
              <span>Referência</span>
              <span className="font-semibold text-studio-text">{referenceLabel}</span>
            </div>

            {receiptHref && (
              <a
                href={receiptHref}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-studio-text transition hover:bg-stone-50"
              >
                Ver comprovante
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </section>

        <section className="relative flex-1">
          <div className="rounded-[32px] border border-stone-200/70 bg-white/95 p-6 shadow-[0_30px_80px_rgba(70,54,32,0.12)] backdrop-blur sm:p-8">
            {isSample && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                Esta é a página de demonstração usada como amostra para a Meta aprovar o botão dinâmico de pagamento.
              </div>
            )}

            {checkout.paymentCompleted && (
              <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-6 py-8 text-center text-emerald-900">
                <CheckCircle2 className="mx-auto h-12 w-12" />
                <h2 className="mt-4 text-2xl font-serif font-bold">Pagamento concluído</h2>
                <p className="mt-3 text-sm leading-relaxed">
                  O atendimento já está quitado. Se precisar, o comprovante digital pode ser aberto pelo botão acima.
                </p>
              </div>
            )}

            {!checkout.paymentCompleted && (
              <PublicCheckoutPanel
                title="Total a pagar"
                amountLabel={remainingAmountLabel}
                paymentMethod={checkout.paymentMethod}
                onSelectPayment={checkout.setPaymentMethod}
                showMethodSelector={!isSample}
                pixPayment={checkout.pixPayment}
                pixStatus={checkout.pixStatus}
                pixRemainingLabel={checkout.pixRemainingLabel}
                pixProgressPct={checkout.pixProgressPct}
                pixQrExpired={checkout.pixQrExpired}
                cardStatus={checkout.cardStatus}
                payerName={clientName}
                payerEmail={payerEmail}
                subjectLabel={`Referência ${referenceLabel}`}
                onCopyPix={checkout.handleCopyPix}
                onRegeneratePix={checkout.handleRegeneratePix}
                statusMessage={checkout.statusMessage}
              />
            )}
          </div>

          <CardProcessingOverlay
            open={checkout.showCardProcessingOverlay}
            stages={cardProcessingStages}
            stageIndex={checkout.cardProcessingStageIndex}
            awaitingConfirmation={checkout.cardAwaitingConfirmation}
            currentStage={checkout.currentCardProcessingStage}
          />
        </section>
      </div>
    </div>
  );
}
