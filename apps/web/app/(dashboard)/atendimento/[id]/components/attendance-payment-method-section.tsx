"use client";

import { Copy, Loader2 } from "lucide-react";
import Image from "next/image";
import { PaymentMethodIcon } from "../../../../../components/ui/payment-method-icon";
import { formatCountdown, formatPixTypeLabel } from "./attendance-payment-modal.helpers";

type Method = "cash" | "pix_mp" | "pix_key" | "card" | "waiver";
type InternalStatus = "paid" | "pending" | "failed";
type PointCardMode = "debit" | "credit";

type PixPaymentData = {
  id: string;
  order_id: string;
  qr_code: string | null;
  qr_code_base64: string | null;
  expires_at: string;
  transaction_amount: number;
};

type PointPaymentData = {
  id: string;
  order_id: string;
  internal_status: InternalStatus;
  card_mode: PointCardMode;
  transaction_amount: number;
};

interface AttendancePaymentMethodSectionProps {
  method: Method;
  hideWaiverOption: boolean;
  isWaived: boolean;
  waiverSuccess: boolean;
  isFullyPaid: boolean;
  pointEnabled: boolean;
  pointTerminalName: string;
  pointTerminalModel: string;
  cashAmount: number;
  pixPayment: PixPaymentData | null;
  pixRemaining: number;
  pixKeyConfigured: boolean;
  pixKeyType: "cnpj" | "cpf" | "email" | "phone" | "evp" | null;
  normalizedPixKeyValue: string;
  pixKeyGenerating: boolean;
  pixKeyQrDataUrl: string | null;
  pixKeyCode: string;
  pixKeyError: string | null;
  pointPayment: PointPaymentData | null;
  busy: boolean;
  errorText: string | null;
  onSetMethod: (value: Method) => void;
  onSetCashAmount: (value: number) => void;
  onCreatePix: () => void;
  onCopyPix: () => void;
  onCopyPixKey: () => void;
  onRegisterCash: () => void;
  onRegisterPixKey: () => void;
  onPointCharge: (cardMode: PointCardMode) => void;
  onWaiveAsCourtesy: () => void;
}

export function AttendancePaymentMethodSection({
  method,
  hideWaiverOption,
  isWaived,
  waiverSuccess,
  isFullyPaid,
  pointEnabled,
  pointTerminalName,
  pointTerminalModel,
  cashAmount,
  pixPayment,
  pixRemaining,
  pixKeyConfigured,
  pixKeyType,
  normalizedPixKeyValue,
  pixKeyGenerating,
  pixKeyQrDataUrl,
  pixKeyCode,
  pixKeyError,
  pointPayment,
  busy,
  errorText,
  onSetMethod,
  onSetCashAmount,
  onCreatePix,
  onCopyPix,
  onCopyPixKey,
  onRegisterCash,
  onRegisterPixKey,
  onPointCharge,
  onWaiveAsCourtesy,
}: AttendancePaymentMethodSectionProps) {
  return (
    <>
      <section className="mt-5">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted">
          <PaymentMethodIcon method="card" className="h-3.5 w-3.5" />
          Forma de pagamento
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            className={`h-10 rounded-xl border text-[10px] font-extrabold uppercase tracking-wide transition ${
              method === "cash"
                ? "border-studio-green bg-studio-light text-studio-green"
                : "border-line text-muted hover:bg-paper"
            }`}
            onClick={() => onSetMethod("cash")}
            disabled={isWaived}
          >
            <PaymentMethodIcon method="cash" className="mx-auto mb-1 h-3.5 w-3.5" />
            Dinheiro
          </button>
          <button
            className={`h-10 rounded-xl border text-[10px] font-extrabold uppercase tracking-wide transition ${
              method === "pix_mp"
                ? "border-studio-green bg-studio-light text-studio-green"
                : "border-line text-muted hover:bg-paper"
            }`}
            onClick={() => onSetMethod("pix_mp")}
            disabled={isWaived}
          >
            <PaymentMethodIcon method="pix" className="mx-auto mb-1 h-3.5 w-3.5" />
            PIX MP
          </button>
          <button
            className={`h-10 rounded-xl border text-[10px] font-extrabold uppercase tracking-wide transition ${
              method === "pix_key"
                ? "border-studio-green bg-studio-light text-studio-green"
                : "border-line text-muted hover:bg-paper"
            }`}
            onClick={() => onSetMethod("pix_key")}
            disabled={isWaived}
          >
            <PaymentMethodIcon method="pix_key" className="mx-auto mb-1 h-3.5 w-3.5" />
            PIX Chave
          </button>
          <button
            className={`h-10 rounded-xl border text-[10px] font-extrabold uppercase tracking-wide transition ${
              method === "card"
                ? "border-studio-green bg-studio-light text-studio-green"
                : "border-line text-muted hover:bg-paper"
            }`}
            onClick={() => onSetMethod("card")}
            disabled={isWaived}
          >
            <PaymentMethodIcon method="card" className="mx-auto mb-1 h-3.5 w-3.5" />
            Cartão
          </button>
          {!hideWaiverOption && (
            <button
              className={`h-10 rounded-xl border text-[10px] font-extrabold uppercase tracking-wide transition ${
                method === "waiver"
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-line text-muted hover:bg-paper"
              }`}
              onClick={() => onSetMethod("waiver")}
            >
              <PaymentMethodIcon method="waiver" className="mx-auto mb-1 h-3.5 w-3.5" />
              Cortesia
            </button>
          )}
        </div>
        {isWaived && !waiverSuccess && (
          <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3 text-xs text-sky-900">
            Este atendimento já está marcado como <strong>cortesia</strong> (pagamento liberado).
          </div>
        )}
      </section>

      {method === "cash" && (
        <section className="mt-4 rounded-2xl border border-line bg-white px-4 py-4">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted">
            Recebimento em dinheiro
          </p>
          <input
            type="number"
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
            value={cashAmount}
            onChange={(event) => onSetCashAmount(Number(event.target.value))}
          />
          <button
            className="mt-3 h-10 w-full rounded-xl bg-studio-green px-3 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
            onClick={onRegisterCash}
            disabled={isFullyPaid || isWaived}
          >
            Registrar recebimento
          </button>
        </section>
      )}

      {method === "pix_mp" && (
        <section className="mt-4 rounded-2xl border border-line bg-white px-4 py-4">
          {!pixPayment && (
            <button
              className="h-10 w-full rounded-xl bg-studio-green px-3 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
              onClick={onCreatePix}
              disabled={isFullyPaid || isWaived}
            >
              Gerar PIX MP
            </button>
          )}
          {pixPayment && (
            <>
              {pixPayment.qr_code_base64 && (
                <Image
                  src={`data:image/png;base64,${pixPayment.qr_code_base64}`}
                  alt="QR Code Pix"
                  width={160}
                  height={160}
                  unoptimized
                  className="mx-auto h-40 w-40 rounded-xl border border-line bg-white p-2"
                />
              )}
              <p className="mt-3 text-center text-xs font-bold text-studio-green">
                Tempo restante: {formatCountdown(pixRemaining)}
              </p>
              <div className="mt-2 h-2 rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-studio-green transition-all"
                  style={{ width: `${Math.max((pixRemaining / (15 * 60)) * 100, 0)}%` }}
                />
              </div>
              <div className="mt-3 break-all rounded-xl border border-line bg-stone-50 px-3 py-2 text-[11px] text-muted">
                {pixPayment.qr_code}
              </div>
              <button
                className="mt-3 h-10 w-full rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wider text-studio-green"
                onClick={onCopyPix}
              >
                <Copy className="mr-1 inline h-3.5 w-3.5" />
                Copiar código Pix
              </button>
            </>
          )}
        </section>
      )}

      {method === "pix_key" && (
        <section className="mt-4 rounded-2xl border border-line bg-white px-4 py-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
            Pix por chave CNPJ (sem API MP)
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {pixKeyConfigured
              ? `${formatPixTypeLabel(pixKeyType)} ativa: ${normalizedPixKeyValue}`
              : "Nenhuma chave Pix ativa configurada."}
          </p>

          {pixKeyGenerating && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-xs text-studio-text">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-studio-green" />
              Gerando QR Pix da chave...
            </div>
          )}

          {pixKeyQrDataUrl && (
            <Image
              src={pixKeyQrDataUrl}
              alt="QR Code Pix por chave"
              width={160}
              height={160}
              unoptimized
              className="mx-auto mt-3 h-40 w-40 rounded-xl border border-line bg-white p-2"
            />
          )}

          {pixKeyCode && (
            <>
              <div className="mt-3 break-all rounded-xl border border-line bg-stone-50 px-3 py-2 text-[11px] text-muted">
                {pixKeyCode}
              </div>
              <button
                className="mt-3 h-10 w-full rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wider text-studio-green"
                onClick={onCopyPixKey}
              >
                <Copy className="mr-1 inline h-3.5 w-3.5" />
                Copiar código Pix chave
              </button>
            </>
          )}

          <button
            className="mt-3 h-10 w-full rounded-xl bg-studio-green px-3 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
            onClick={onRegisterPixKey}
            disabled={isFullyPaid || isWaived || !pixKeyConfigured || !pixKeyCode || pixKeyGenerating}
          >
            Registrar pagamento Pix chave
          </button>

          {pixKeyError && <p className="mt-2 text-xs font-semibold text-red-700">{pixKeyError}</p>}
        </section>
      )}

      {method === "card" && (
        <section className="mt-4 rounded-2xl border border-line bg-white px-4 py-4">
          <p className="text-xs font-bold text-studio-text">
            {pointEnabled ? pointTerminalName || "Maquininha Point configurada" : "Point não configurada"}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {pointTerminalModel || "Configure a maquininha em Configurações."}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              className="h-10 rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wider text-studio-green disabled:opacity-60"
              onClick={() => onPointCharge("debit")}
              disabled={!pointEnabled || isFullyPaid || isWaived}
            >
              Cobrar no débito
            </button>
            <button
              className="h-10 rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wider text-studio-green disabled:opacity-60"
              onClick={() => onPointCharge("credit")}
              disabled={!pointEnabled || isFullyPaid || isWaived}
            >
              Cobrar no crédito
            </button>
          </div>
          {pointPayment && (
            <p className="mt-3 text-xs text-muted">
              Cobrança enviada ({pointPayment.card_mode === "debit" ? "débito" : "crédito"}). Aguardando confirmação...
            </p>
          )}
        </section>
      )}

      {!hideWaiverOption && method === "waiver" && (
        <section className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-sky-700">
            Cortesia interna
          </p>
          <p className="text-[11px] leading-relaxed text-sky-900">
            Use esta opção quando o estúdio decidir <strong>liberar a cobrança</strong> deste atendimento.
            O sistema marcará o status financeiro como <strong>Liberado</strong> (sem registrar pagamento recebido).
          </p>
          <button
            className="mt-3 h-10 w-full rounded-xl bg-sky-600 px-3 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
            onClick={onWaiveAsCourtesy}
            disabled={isWaived || busy}
          >
            {isWaived ? "Cortesia já aplicada" : "Aplicar cortesia"}
          </button>
        </section>
      )}

      {errorText && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-xs font-semibold text-red-700">
          {errorText}
        </div>
      )}
    </>
  );
}
