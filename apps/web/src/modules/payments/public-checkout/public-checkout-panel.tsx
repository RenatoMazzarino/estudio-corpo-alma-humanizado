"use client";

import Image from "next/image";
import { Copy, CreditCard, ExternalLink, QrCode } from "lucide-react";
import type { PublicCheckoutPaymentMethod, PublicCheckoutPixPayment } from "./types";

type PublicCheckoutPanelProps = {
  title: string;
  amountLabel: string;
  paymentMethod: PublicCheckoutPaymentMethod;
  onSelectPayment?: (method: Exclude<PublicCheckoutPaymentMethod, null>) => void;
  showMethodSelector?: boolean;
  pixPayment: PublicCheckoutPixPayment | null;
  pixStatus: "idle" | "loading" | "error";
  pixRemainingLabel: string;
  pixProgressPct: number;
  pixQrExpired: boolean;
  cardStatus: "idle" | "loading" | "error";
  payerName: string;
  payerEmail: string;
  subjectLabel?: string | null;
  onCopyPix: () => void;
  onRegeneratePix?: () => void;
  statusMessage?: string | null;
};

export function PublicCheckoutPanel({
  title,
  amountLabel,
  paymentMethod,
  onSelectPayment,
  showMethodSelector = false,
  pixPayment,
  pixStatus,
  pixRemainingLabel,
  pixProgressPct,
  pixQrExpired,
  cardStatus,
  payerName,
  payerEmail,
  subjectLabel,
  onCopyPix,
  onRegeneratePix,
  statusMessage,
}: PublicCheckoutPanelProps) {
  const showSelector = showMethodSelector && onSelectPayment;
  const toneClass =
    paymentMethod === "pix" && pixStatus === "error"
      ? "text-rose-700"
      : paymentMethod === "card" && cardStatus === "error"
        ? "text-rose-700"
        : "text-muted";

  return (
    <div className="rounded-[28px] border border-stone-100 bg-white p-6 shadow-soft">
      {showSelector && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelectPayment("pix")}
            className={`rounded-[24px] border px-5 py-4 text-left transition ${
              paymentMethod === "pix"
                ? "border-studio-green bg-studio-green/10"
                : "border-stone-200 bg-white hover:border-stone-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100">
                <QrCode className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Pix</p>
                <p className="text-xs text-muted">Confirmação automática e QR Code</p>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onSelectPayment("card")}
            className={`rounded-[24px] border px-5 py-4 text-left transition ${
              paymentMethod === "card"
                ? "border-studio-green bg-studio-green/10"
                : "border-stone-200 bg-white hover:border-stone-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Cartão</p>
                <p className="text-xs text-muted">Pagamento online com validação automática</p>
              </div>
            </div>
          </button>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-500">{title}</span>
        <span className="text-2xl font-serif font-bold text-studio-text">{amountLabel}</span>
      </div>
      {paymentMethod && (
        <p className="mb-4 text-xs text-gray-400">
          Método selecionado: <span className="font-bold text-studio-text">{paymentMethod === "pix" ? "Pix" : "Cartão"}</span>
        </p>
      )}

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
                <QrCode className="h-16 w-16 text-studio-green" />
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onCopyPix}
              disabled={!pixPayment?.qr_code || pixStatus === "loading" || pixQrExpired}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-studio-green py-3 font-bold text-studio-green disabled:opacity-40"
            >
              <Copy className="h-4 w-4" /> Copiar chave Pix
            </button>
            {onRegeneratePix && (
              <button
                type="button"
                onClick={onRegeneratePix}
                className="flex w-full items-center justify-center rounded-2xl border border-stone-300 py-3 font-bold text-studio-text"
              >
                Gerar novo Pix
              </button>
            )}
          </div>

          {pixPayment?.ticket_url && (
            <a
              href={pixPayment.ticket_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-studio-green"
            >
              Abrir cobrança externa
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <p className="text-center text-[11px] text-gray-500">Assim que o Pix for aprovado, esta tela atualiza automaticamente.</p>
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
              defaultValue={payerName}
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
            <input id="mp-card-email" name="cardholderEmail" type="email" readOnly value={payerEmail} className="hidden" />
            <button type="submit" className="h-12 w-full rounded-2xl bg-studio-green text-sm font-bold uppercase tracking-wide text-white" disabled={cardStatus === "loading"}>
              {cardStatus === "loading" ? "Processando cartão..." : "Pagar com cartão"}
            </button>
          </form>
        </div>
      )}

      {subjectLabel && <p className="mt-4 text-[10px] text-gray-400">{subjectLabel}</p>}
      {statusMessage && <p className={`mt-4 text-sm ${toneClass}`}>{statusMessage}</p>}
    </div>
  );
}
