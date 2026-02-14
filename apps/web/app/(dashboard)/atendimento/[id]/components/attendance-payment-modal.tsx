"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, CreditCard, Loader2, QrCode, Wallet } from "lucide-react";
import Image from "next/image";
import type { CheckoutItem, CheckoutRow, PaymentRow } from "../../../../../lib/attendance/attendance-types";

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

interface AttendancePaymentModalProps {
  open: boolean;
  checkout: CheckoutRow | null;
  items: CheckoutItem[];
  payments: PaymentRow[];
  pointEnabled: boolean;
  pointTerminalName: string;
  pointTerminalModel: string;
  onClose: () => void;
  onSaveItems: (items: Array<{ type: CheckoutItem["type"]; label: string; qty: number; amount: number }>) => Promise<void>;
  onSetDiscount: (type: "value" | "pct" | null, value: number | null, reason?: string) => Promise<void>;
  onRegisterCashPayment: (amount: number) => Promise<{ ok: boolean; paymentId?: string | null }>;
  onCreatePixPayment: (amount: number, attempt: number) => Promise<{ ok: boolean; data?: PixPaymentData }>;
  onPollPixStatus: () => Promise<{ ok: boolean; status: InternalStatus }>;
  onCreatePointPayment: (
    amount: number,
    cardMode: PointCardMode
  ) => Promise<{ ok: boolean; data?: PointPaymentData }>;
  onPollPointStatus: (
    orderId: string
  ) => Promise<{ ok: boolean; status: InternalStatus; paymentId?: string | null }>;
  onSendReceipt: (paymentId: string) => Promise<void>;
}

const stageMessages = [
  "Arrumando a maca...",
  "Esquentando as toalhas...",
  "Conferindo os dados do pagamento...",
  "Confirmando a sessão no sistema...",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function getRemainingSeconds(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(Math.floor(diff / 1000), 0);
}

function formatCountdown(totalSeconds: number) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function AttendancePaymentModal({
  open,
  checkout,
  items,
  payments,
  pointEnabled,
  pointTerminalName,
  pointTerminalModel,
  onClose,
  onSaveItems,
  onSetDiscount,
  onRegisterCashPayment,
  onCreatePixPayment,
  onPollPixStatus,
  onCreatePointPayment,
  onPollPointStatus,
  onSendReceipt,
}: AttendancePaymentModalProps) {
  const [method, setMethod] = useState<"cash" | "pix" | "card">("cash");
  const [draftItems, setDraftItems] = useState(
    items.map((item) => ({ type: item.type, label: item.label, qty: item.qty, amount: item.amount }))
  );
  const [newItem, setNewItem] = useState({ type: "addon" as CheckoutItem["type"], label: "", qty: 1, amount: 0 });
  const [discountType, setDiscountType] = useState<"value" | "pct" | null>(checkout?.discount_type ?? "value");
  const [discountValue, setDiscountValue] = useState<number>(checkout?.discount_value ?? 0);
  const [discountReason, setDiscountReason] = useState<string>(checkout?.discount_reason ?? "");
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [pixPayment, setPixPayment] = useState<PixPaymentData | null>(null);
  const [pixAttempt, setPixAttempt] = useState(0);
  const [pointPayment, setPointPayment] = useState<PointPaymentData | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [receiptPromptPaymentId, setReceiptPromptPaymentId] = useState<string | null>(null);
  const [pixRemaining, setPixRemaining] = useState(0);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const paidTotal = useMemo(
    () => payments.filter((payment) => payment.status === "paid").reduce((acc, item) => acc + Number(item.amount ?? 0), 0),
    [payments]
  );
  const total = Number(checkout?.total ?? 0);
  const remaining = Math.max(total - paidTotal, 0);
  const isFullyPaid = remaining <= 0 && total > 0;

  useEffect(() => {
    if (!open) return;
    setDraftItems(items.map((item) => ({ type: item.type, label: item.label, qty: item.qty, amount: item.amount })));
    setDiscountType(checkout?.discount_type ?? "value");
    setDiscountValue(checkout?.discount_value ?? 0);
    setDiscountReason(checkout?.discount_reason ?? "");
    setCashAmount(Math.max(remaining, 0));
    setErrorText(null);
  }, [open, items, checkout?.discount_type, checkout?.discount_value, checkout?.discount_reason, remaining]);

  useEffect(() => {
    if (!busy) {
      setStageIndex(0);
      return;
    }
    const interval = window.setInterval(() => {
      setStageIndex((current) => (current + 1) % stageMessages.length);
    }, 1300);
    return () => window.clearInterval(interval);
  }, [busy]);

  useEffect(() => {
    if (!open || !pixPayment) return;
    setPixRemaining(getRemainingSeconds(pixPayment.expires_at));
    const interval = window.setInterval(() => {
      setPixRemaining(getRemainingSeconds(pixPayment.expires_at));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [open, pixPayment]);

  useEffect(() => {
    setPortalTarget(document.getElementById("app-frame"));
  }, []);

  useEffect(() => {
    if (!open || !pixPayment || method !== "pix") return;
    const interval = window.setInterval(async () => {
      const result = await onPollPixStatus();
      if (!result.ok) return;
      if (result.status === "paid") {
        setReceiptPromptPaymentId(pixPayment.id);
        setPixPayment(null);
      }
      if (result.status === "failed") {
        setErrorText("O Pix não foi aprovado. Gere um novo código para continuar.");
      }
    }, 4000);
    return () => window.clearInterval(interval);
  }, [method, onPollPixStatus, open, pixPayment]);

  useEffect(() => {
    if (!open || !pointPayment || method !== "card") return;
    const interval = window.setInterval(async () => {
      const result = await onPollPointStatus(pointPayment.order_id);
      if (!result.ok) return;
      if (result.status === "paid") {
        setReceiptPromptPaymentId(result.paymentId ?? pointPayment.id);
        setPointPayment(null);
      }
      if (result.status === "failed") {
        setErrorText("Cobrança não concluída na maquininha. Tente novamente.");
      }
    }, 3500);
    return () => window.clearInterval(interval);
  }, [method, onPollPointStatus, open, pointPayment]);

  if (!open) return null;

  const handleCreatePix = async () => {
    if (remaining <= 0) return;
    setBusy(true);
    setErrorText(null);
    const nextAttempt = pixAttempt + 1;
    const result = await onCreatePixPayment(remaining, nextAttempt);
    setBusy(false);
    if (!result.ok || !result.data) {
      setErrorText("Não foi possível gerar o Pix agora.");
      return;
    }
    setPixAttempt(nextAttempt);
    setPixPayment(result.data);
  };

  const handleCopyPix = async () => {
    if (!pixPayment?.qr_code) return;
    await navigator.clipboard.writeText(pixPayment.qr_code);
  };

  const handleRegisterCash = async () => {
    if (cashAmount <= 0) return;
    setBusy(true);
    setErrorText(null);
    const result = await onRegisterCashPayment(cashAmount);
    setBusy(false);
    if (!result.ok) {
      setErrorText("Não foi possível registrar o pagamento em dinheiro.");
      return;
    }
    if (result.paymentId) {
      setReceiptPromptPaymentId(result.paymentId);
    }
  };

  const handlePointCharge = async (cardMode: PointCardMode) => {
    if (remaining <= 0) return;
    setBusy(true);
    setErrorText(null);
    const result = await onCreatePointPayment(remaining, cardMode);
    setBusy(false);
    if (!result.ok || !result.data) {
      setErrorText("Não foi possível iniciar a cobrança na maquininha.");
      return;
    }
    setPointPayment(result.data);
    if (result.data.internal_status === "paid") {
      setReceiptPromptPaymentId(result.data.id);
    }
  };

  const modalNode = (
    <div className={`${portalTarget ? "absolute" : "fixed"} inset-0 z-[80]`}>
      <button className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} aria-label="Fechar modal" />
      <div className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-105 rounded-t-3xl bg-white p-4 pb-6 max-h-[90vh] overflow-y-auto">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-200" />
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif font-bold text-studio-text">Pagamento</h2>
          <button className="rounded-xl border border-line px-3 py-1 text-xs font-bold text-gray-500" onClick={onClose}>Fechar</button>
        </div>

        <div className="mt-4 rounded-2xl border border-line p-4">
          <div className="flex justify-between text-sm text-muted">
            <span>Total</span>
            <strong className="text-studio-text">{formatCurrency(total)}</strong>
          </div>
          <div className="mt-2 flex justify-between text-sm text-muted">
            <span>Pago</span>
            <strong className="text-studio-green">{formatCurrency(paidTotal)}</strong>
          </div>
          <div className="mt-2 flex justify-between text-sm text-muted">
            <span>A receber</span>
            <strong className="text-studio-text">{formatCurrency(remaining)}</strong>
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded-2xl border border-line p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted font-extrabold">Itens e desconto</p>
          {draftItems.map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex justify-between text-sm text-studio-text">
              <span>{item.label}</span>
              <span>{formatCurrency(item.amount)}</span>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2">
            <input
              className="col-span-2 rounded-xl border border-line px-3 py-2 text-xs"
              placeholder="Novo item"
              value={newItem.label}
              onChange={(event) => setNewItem((current) => ({ ...current, label: event.target.value }))}
            />
            <input
              className="rounded-xl border border-line px-3 py-2 text-xs"
              type="number"
              value={newItem.amount}
              onChange={(event) => setNewItem((current) => ({ ...current, amount: Number(event.target.value) }))}
            />
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-xl border border-line px-3 py-2 text-xs font-bold"
              onClick={() => {
                if (!newItem.label.trim()) return;
                setDraftItems((current) => [...current, newItem]);
                setNewItem({ type: "addon", label: "", qty: 1, amount: 0 });
              }}
            >
              Adicionar item
            </button>
            <button className="flex-1 rounded-xl bg-studio-green px-3 py-2 text-xs font-bold text-white" onClick={() => onSaveItems(draftItems)}>
              Salvar itens
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={discountType ?? "value"}
              onChange={(event) => setDiscountType(event.target.value === "pct" ? "pct" : "value")}
              className="rounded-xl border border-line px-3 py-2 text-xs"
            >
              <option value="value">Desconto em R$</option>
              <option value="pct">Desconto em %</option>
            </select>
            <input
              type="number"
              value={discountValue}
              onChange={(event) => setDiscountValue(Number(event.target.value))}
              className="rounded-xl border border-line px-3 py-2 text-xs"
            />
          </div>
          <input
            value={discountReason}
            onChange={(event) => setDiscountReason(event.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2 text-xs"
            placeholder="Motivo do desconto"
          />
          <button className="w-full rounded-xl border border-studio-green bg-studio-light px-3 py-2 text-xs font-bold text-studio-green" onClick={() => onSetDiscount(discountType, discountValue, discountReason)}>
            Aplicar desconto
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button className={`rounded-xl border px-3 py-2 text-xs font-bold ${method === "cash" ? "border-studio-green bg-studio-light text-studio-green" : "border-line text-muted"}`} onClick={() => setMethod("cash")}>
            <Wallet className="mx-auto mb-1 h-4 w-4" /> Dinheiro
          </button>
          <button className={`rounded-xl border px-3 py-2 text-xs font-bold ${method === "pix" ? "border-studio-green bg-studio-light text-studio-green" : "border-line text-muted"}`} onClick={() => setMethod("pix")}>
            <QrCode className="mx-auto mb-1 h-4 w-4" /> Pix
          </button>
          <button className={`rounded-xl border px-3 py-2 text-xs font-bold ${method === "card" ? "border-studio-green bg-studio-light text-studio-green" : "border-line text-muted"}`} onClick={() => setMethod("card")}>
            <CreditCard className="mx-auto mb-1 h-4 w-4" /> Cartão
          </button>
        </div>

        {method === "cash" && (
          <div className="mt-4 rounded-2xl border border-line p-4">
            <input
              type="number"
              className="w-full rounded-xl border border-line px-3 py-2 text-sm"
              value={cashAmount}
              onChange={(event) => setCashAmount(Number(event.target.value))}
            />
            <button className="mt-3 w-full rounded-xl bg-studio-green px-3 py-3 text-xs font-bold text-white" onClick={handleRegisterCash} disabled={isFullyPaid}>
              Registrar recebimento
            </button>
          </div>
        )}

        {method === "pix" && (
          <div className="mt-4 rounded-2xl border border-line p-4">
            {!pixPayment && (
              <button className="w-full rounded-xl bg-studio-green px-3 py-3 text-xs font-bold text-white" onClick={handleCreatePix} disabled={isFullyPaid}>
                Gerar Pix
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
                  <div className="h-full rounded-full bg-studio-green transition-all" style={{ width: `${Math.max((pixRemaining / (15 * 60)) * 100, 0)}%` }} />
                </div>
                <div className="mt-3 rounded-xl border border-line bg-stone-50 px-3 py-2 text-[11px] text-muted break-all">
                  {pixPayment.qr_code}
                </div>
                <button className="mt-3 w-full rounded-xl border border-line px-3 py-2 text-xs font-bold text-studio-green" onClick={handleCopyPix}>
                  <Copy className="mr-1 inline h-3.5 w-3.5" /> Copiar código Pix
                </button>
              </>
            )}
          </div>
        )}

        {method === "card" && (
          <div className="mt-4 rounded-2xl border border-line p-4">
            <p className="text-xs font-bold text-studio-text">
              {pointEnabled ? pointTerminalName || "Maquininha Point configurada" : "Point não configurada"}
            </p>
            <p className="text-[11px] text-muted">{pointTerminalModel || "Configure a maquininha em Configurações."}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="rounded-xl border border-line px-3 py-2 text-xs font-bold text-studio-green" onClick={() => handlePointCharge("debit")} disabled={!pointEnabled || isFullyPaid}>
                Cobrar no débito
              </button>
              <button className="rounded-xl border border-line px-3 py-2 text-xs font-bold text-studio-green" onClick={() => handlePointCharge("credit")} disabled={!pointEnabled || isFullyPaid}>
                Cobrar no crédito
              </button>
            </div>
            {pointPayment && (
              <p className="mt-3 text-xs text-muted">
                Cobrança enviada ({pointPayment.card_mode === "debit" ? "débito" : "crédito"}). Aguardando confirmação...
              </p>
            )}
          </div>
        )}

        {errorText && <p className="mt-3 text-xs font-semibold text-red-600">{errorText}</p>}

        {receiptPromptPaymentId && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-800">Pagamento confirmado. Deseja enviar o recibo agora?</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-700" onClick={() => setReceiptPromptPaymentId(null)}>
                Agora não
              </button>
              <button
                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                onClick={async () => {
                  await onSendReceipt(receiptPromptPaymentId);
                  setReceiptPromptPaymentId(null);
                }}
              >
                Enviar recibo
              </button>
            </div>
          </div>
        )}
      </div>

      {busy && (
        <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/35 backdrop-blur-sm">
          <div className="rounded-2xl bg-white px-5 py-4 text-center shadow-float">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-studio-green" />
            <p className="mt-3 text-sm font-bold text-studio-text">{stageMessages[stageIndex]}</p>
          </div>
        </div>
      )}
    </div>
  );

  return portalTarget ? createPortal(modalNode, portalTarget) : modalNode;
}
