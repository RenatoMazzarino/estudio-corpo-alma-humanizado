"use client";

import { Copy } from "lucide-react";
import Image from "next/image";
import { PaymentMethodIcon } from "../../../../../components/ui/payment-method-icon";

type PixPaymentData = {
  id: string;
  status: string;
  ticket_url: string | null;
  qr_code: string | null;
  qr_code_base64: string | null;
  transaction_amount: number;
  created_at: string;
  expires_at: string;
};

type PaymentStepProps = {
  payableSignalAmount: number;
  paymentMethod: "pix" | "card" | null;
  pixPayment: PixPaymentData | null;
  pixStatus: "idle" | "loading" | "error";
  pixRemainingLabel: string;
  pixProgressPct: number;
  pixQrExpired: boolean;
  cardStatus: "idle" | "loading" | "error";
  resolvedClientFullName: string;
  normalizedClientEmail: string;
  appointmentId: string | null;
  onCopyPix: () => void;
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
}: PaymentStepProps) {
  return (
    <section className="no-scrollbar animate-in fade-in slide-in-from-right-6 duration-500 flex flex-1 flex-col overflow-y-auto px-6 pb-32 pt-3">
      <div className="mb-6">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Etapa Final</span>
        <h2 className="mt-2 text-3xl font-serif text-studio-text">Pagamento</h2>
      </div>

      <div className="mb-6 rounded-[28px] border border-stone-100 bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-500">Total a pagar</span>
          <span className="text-2xl font-serif font-bold text-studio-text">R$ {payableSignalAmount.toFixed(2)}</span>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Método selecionado: <span className="font-bold text-studio-text">{paymentMethod === "pix" ? "Pix" : "Cartão"}</span>
        </p>

        {paymentMethod === "pix" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-dashed border-gray-300 bg-stone-50 p-6 text-center">
              {pixPayment?.qr_code_base64 ? (
                <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Image
                    src={`data:image/png;base64,${pixPayment.qr_code_base64}`}
                    alt="QR Code Pix"
                    width={160}
                    height={160}
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-xl bg-white shadow-sm">
                  <PaymentMethodIcon method="pix" className="h-16 w-16" />
                </div>
              )}
              <p className="mb-2 text-xs font-bold uppercase text-studio-green">
                {pixStatus === "loading" ? "Gerando Pix..." : "Aguardando Pagamento"}
              </p>
              <p className="text-xs text-gray-400">QR Code do Mercado Pago</p>
              {pixPayment && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Tempo máximo para pagamento</span>
                    <span className="font-bold text-studio-text">{pixRemainingLabel}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                    <div className="h-full bg-studio-green transition-[width] duration-1000" style={{ width: `${pixProgressPct}%` }} />
                  </div>
                </div>
              )}
            </div>

            {pixPayment?.qr_code && (
              <div className="wrap-break-word rounded-xl border border-gray-200 bg-white p-3 text-[11px] text-gray-600">{pixPayment.qr_code}</div>
            )}

            {pixQrExpired && <span className="sr-only">QR Code expirado</span>}

            <button
              type="button"
              onClick={onCopyPix}
              disabled={!pixPayment?.qr_code || pixStatus === "loading" || pixQrExpired}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-studio-green py-3 font-bold text-studio-green disabled:opacity-40"
            >
              <Copy className="h-4 w-4" /> Copiar chave Pix
            </button>
            <p className="text-center text-[11px] text-gray-500">Assim que o Pix for aprovado, esta tela avança automaticamente.</p>
          </div>
        )}

        {paymentMethod === "card" && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Pagamento com cartão</p>

            <form id="mp-card-form" className="grid gap-3">
              <div className="h-12 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm" id="mp-card-number" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-12 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm" id="mp-card-expiration" />
                <div className="h-12 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm" id="mp-card-security" />
              </div>
              <input
                id="mp-cardholder-name"
                name="cardholderName"
                defaultValue={resolvedClientFullName}
                placeholder="Nome no cartão"
                className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-gray-700"
              />
              <div className="grid grid-cols-2 gap-3">
                <select id="mp-card-issuer" name="issuer" className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-gray-700" />
                <select id="mp-card-installments" name="installments" className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-gray-700" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select id="mp-card-identification-type" name="identificationType" className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-gray-700" />
                <input
                  id="mp-card-identification-number"
                  name="identificationNumber"
                  placeholder="CPF"
                  className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-gray-700"
                />
              </div>
              <input id="mp-card-email" name="cardholderEmail" type="email" readOnly value={normalizedClientEmail} className="hidden" />
              <button type="submit" className="h-12 w-full rounded-2xl bg-studio-green text-sm font-bold uppercase tracking-wide text-white" disabled={cardStatus === "loading"}>
                {cardStatus === "loading" ? "Processando cartão..." : "Pagar com cartão"}
              </button>
            </form>
          </div>
        )}

        {appointmentId && <p className="mt-4 text-[10px] text-gray-400">Agendamento #{appointmentId}</p>}
      </div>
    </section>
  );
}
