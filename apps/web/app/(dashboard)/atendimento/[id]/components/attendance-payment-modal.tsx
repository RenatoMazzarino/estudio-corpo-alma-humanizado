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
  const [appliedDiscountType, setAppliedDiscountType] = useState<"value" | "pct" | null>(checkout?.discount_type ?? null);
  const [appliedDiscountValue, setAppliedDiscountValue] = useState<number>(checkout?.discount_value ?? 0);
  const [appliedDiscountReason, setAppliedDiscountReason] = useState<string>(checkout?.discount_reason ?? "");
  const [discountTypeInput, setDiscountTypeInput] = useState<"value" | "pct">(checkout?.discount_type === "pct" ? "pct" : "value");
  const [discountValueInput, setDiscountValueInput] = useState<number>(checkout?.discount_value ?? 0);
  const [discountReasonInput, setDiscountReasonInput] = useState<string>(checkout?.discount_reason ?? "");
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
  const normalizedItems = useMemo(
    () =>
      draftItems.map((item) => ({
        ...item,
        qty: Math.max(1, Number(item.qty ?? 1)),
        amount: Number(item.amount ?? 0),
      })),
    [draftItems]
  );
  const subtotal = useMemo(
    () => normalizedItems.reduce((acc, item) => acc + item.amount * (item.qty ?? 1), 0),
    [normalizedItems]
  );
  const serviceAmount = useMemo(
    () => normalizedItems.filter((item) => item.type === "service").reduce((acc, item) => acc + item.amount * (item.qty ?? 1), 0),
    [normalizedItems]
  );
  const extraItems = useMemo(() => normalizedItems.filter((item) => item.type !== "service"), [normalizedItems]);
  const appliedDiscountAmount = useMemo(() => {
    if (!appliedDiscountType || appliedDiscountValue <= 0) return 0;
    if (appliedDiscountType === "pct") {
      return Math.min(subtotal, subtotal * (appliedDiscountValue / 100));
    }
    return Math.min(subtotal, appliedDiscountValue);
  }, [appliedDiscountType, appliedDiscountValue, subtotal]);
  const total = Math.max(subtotal - appliedDiscountAmount, 0);
  const remaining = Math.max(total - paidTotal, 0);
  const isFullyPaid = remaining <= 0 && total > 0;

  useEffect(() => {
    if (!open) return;
    setDraftItems(items.map((item) => ({ type: item.type, label: item.label, qty: item.qty, amount: item.amount })));
    setAppliedDiscountType(checkout?.discount_type ?? null);
    setAppliedDiscountValue(checkout?.discount_value ?? 0);
    setAppliedDiscountReason(checkout?.discount_reason ?? "");
    setDiscountTypeInput(checkout?.discount_type === "pct" ? "pct" : "value");
    setDiscountValueInput(checkout?.discount_value ?? 0);
    setDiscountReasonInput(checkout?.discount_reason ?? "");
    setErrorText(null);
  }, [open, items, checkout?.discount_type, checkout?.discount_value, checkout?.discount_reason]);

  useEffect(() => {
    if (!open) return;
    setCashAmount(remaining);
  }, [open, remaining]);

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

  const handleAddItem = async () => {
    const label = newItem.label.trim();
    const amount = Number(newItem.amount ?? 0);
    if (!label || amount <= 0) return;
    const nextItems = [...normalizedItems, { ...newItem, label, qty: 1, amount }];
    setDraftItems(nextItems);
    setNewItem({ type: "addon", label: "", qty: 1, amount: 0 });
    await onSaveItems(nextItems);
  };

  const handleApplyDiscount = async () => {
    const normalizedValue = Number(discountValueInput ?? 0);
    const safeValue = Number.isFinite(normalizedValue) ? Math.max(normalizedValue, 0) : 0;
    const nextType: "value" | "pct" | null = safeValue > 0 ? discountTypeInput : null;
    const nextReason = discountReasonInput.trim();

    setAppliedDiscountType(nextType);
    setAppliedDiscountValue(safeValue);
    setAppliedDiscountReason(nextReason);

    const nextDiscountAmount =
      nextType === "pct" ? Math.min(subtotal, subtotal * (safeValue / 100)) : nextType === "value" ? Math.min(subtotal, safeValue) : 0;
    const nextTotal = Math.max(subtotal - nextDiscountAmount, 0);
    setCashAmount(Math.max(nextTotal - paidTotal, 0));

    await onSetDiscount(nextType, safeValue > 0 ? safeValue : null, nextReason || undefined);
  };

  const modalNode = (
    <div className={`${portalTarget ? "absolute" : "fixed"} inset-0 z-50 flex items-end justify-center pointer-events-none`}>
      <button
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
        aria-label="Fechar modal"
      />
      <div className="relative w-full max-w-105 rounded-t-3xl bg-white shadow-float flex flex-col max-h-[90vh] pointer-events-auto">
        <div className="flex items-center justify-center px-6 pt-4 pb-2">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-200" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-serif font-bold text-studio-text">Pagamento</h2>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted mt-1">
                Registro financeiro da sessão
              </p>
            </div>
            <button
              className="rounded-full border border-line px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-gray-500"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>

          <section className="mt-5">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
              <Wallet className="w-3.5 h-3.5" />
              Descritivo da cobrança
            </div>
            <div className="rounded-2xl border border-line bg-white px-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-studio-text">
                  <span>Valor do serviço</span>
                  <span className="font-bold">{formatCurrency(serviceAmount)}</span>
                </div>

                {paidTotal > 0 && (
                  <div className="flex items-center justify-between text-sm text-studio-text">
                    <span>Sinal pago</span>
                    <span className="font-bold text-studio-green">- {formatCurrency(paidTotal)}</span>
                  </div>
                )}

                {extraItems.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="flex items-center justify-between text-sm text-studio-text">
                    <span className="truncate pr-3">
                      {item.label}
                      {(item.qty ?? 1) > 1 ? ` x${item.qty}` : ""}
                    </span>
                    <span className="font-bold">{formatCurrency(item.amount * (item.qty ?? 1))}</span>
                  </div>
                ))}

                {appliedDiscountAmount > 0 && (
                  <div className="flex items-center justify-between text-sm text-studio-text">
                    <span className="truncate pr-3">
                      {appliedDiscountReason
                        ? `Desconto • ${appliedDiscountReason}`
                        : appliedDiscountType === "pct"
                          ? `Desconto aplicado (${appliedDiscountValue}%)`
                          : "Desconto aplicado"}
                    </span>
                    <span className="font-bold text-studio-green">- {formatCurrency(appliedDiscountAmount)}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 border-t border-dashed border-line pt-3 flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Valor total a cobrar</span>
                <span className="text-lg font-black text-studio-text">{formatCurrency(remaining)}</span>
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-line px-4 py-4 bg-white">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
              <CreditCard className="w-3.5 h-3.5" />
              Itens e desconto
            </div>
            <div className="space-y-2">
              {draftItems.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex justify-between text-sm text-studio-text">
                  <span className="truncate pr-3">{item.label}</span>
                  <span className="font-bold">{formatCurrency(item.amount)}</span>
                </div>
              ))}
              {draftItems.length === 0 && (
                <p className="text-xs text-muted">Sem itens adicionais.</p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
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
            <div className="mt-2">
              <button
                className="w-full rounded-xl border border-line px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-studio-text"
                onClick={handleAddItem}
              >
                Adicionar item
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <select
                value={discountTypeInput}
                onChange={(event) => setDiscountTypeInput(event.target.value === "pct" ? "pct" : "value")}
                className="rounded-xl border border-line px-3 py-2 text-xs"
              >
                <option value="value">Desconto em R$</option>
                <option value="pct">Desconto em %</option>
              </select>
              <input
                type="number"
                value={discountValueInput}
                onChange={(event) => setDiscountValueInput(Number(event.target.value))}
                className="rounded-xl border border-line px-3 py-2 text-xs"
              />
            </div>
            <input
              value={discountReasonInput}
              onChange={(event) => setDiscountReasonInput(event.target.value)}
              className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-xs"
              placeholder="Motivo do desconto"
            />
            <button
              className="mt-2 w-full rounded-xl border border-studio-green bg-studio-light px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-studio-green"
              onClick={handleApplyDiscount}
            >
              Aplicar desconto
            </button>
          </section>

          <section className="mt-5">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
              <Wallet className="w-3.5 h-3.5" />
              Forma de pagamento
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                className={`h-10 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border transition ${
                  method === "cash"
                    ? "border-studio-green bg-studio-light text-studio-green"
                    : "border-line text-muted hover:bg-paper"
                }`}
                onClick={() => setMethod("cash")}
              >
                <Wallet className="mx-auto mb-1 h-3.5 w-3.5" />
                Dinheiro
              </button>
              <button
                className={`h-10 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border transition ${
                  method === "pix"
                    ? "border-studio-green bg-studio-light text-studio-green"
                    : "border-line text-muted hover:bg-paper"
                }`}
                onClick={() => setMethod("pix")}
              >
                <QrCode className="mx-auto mb-1 h-3.5 w-3.5" />
                Pix
              </button>
              <button
                className={`h-10 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border transition ${
                  method === "card"
                    ? "border-studio-green bg-studio-light text-studio-green"
                    : "border-line text-muted hover:bg-paper"
                }`}
                onClick={() => setMethod("card")}
              >
                <CreditCard className="mx-auto mb-1 h-3.5 w-3.5" />
                Cartão
              </button>
            </div>
          </section>

          {method === "cash" && (
            <section className="mt-4 rounded-2xl border border-line px-4 py-4 bg-white">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-2">
                Recebimento em dinheiro
              </p>
              <input
                type="number"
                className="w-full rounded-xl border border-line px-3 py-2 text-sm"
                value={cashAmount}
                onChange={(event) => setCashAmount(Number(event.target.value))}
              />
              <button
                className="mt-3 w-full h-10 rounded-xl bg-studio-green px-3 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                onClick={handleRegisterCash}
                disabled={isFullyPaid}
              >
                Registrar recebimento
              </button>
            </section>
          )}

          {method === "pix" && (
            <section className="mt-4 rounded-2xl border border-line px-4 py-4 bg-white">
              {!pixPayment && (
                <button
                  className="w-full h-10 rounded-xl bg-studio-green px-3 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                  onClick={handleCreatePix}
                  disabled={isFullyPaid}
                >
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
                    <div
                      className="h-full rounded-full bg-studio-green transition-all"
                      style={{ width: `${Math.max((pixRemaining / (15 * 60)) * 100, 0)}%` }}
                    />
                  </div>
                  <div className="mt-3 rounded-xl border border-line bg-stone-50 px-3 py-2 text-[11px] text-muted break-all">
                    {pixPayment.qr_code}
                  </div>
                  <button
                    className="mt-3 w-full h-10 rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wider text-studio-green"
                    onClick={handleCopyPix}
                  >
                    <Copy className="mr-1 inline h-3.5 w-3.5" />
                    Copiar código Pix
                  </button>
                </>
              )}
            </section>
          )}

          {method === "card" && (
            <section className="mt-4 rounded-2xl border border-line px-4 py-4 bg-white">
              <p className="text-xs font-bold text-studio-text">
                {pointEnabled ? pointTerminalName || "Maquininha Point configurada" : "Point não configurada"}
              </p>
              <p className="text-[11px] text-muted mt-1">
                {pointTerminalModel || "Configure a maquininha em Configurações."}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="h-10 rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wider text-studio-green disabled:opacity-60"
                  onClick={() => handlePointCharge("debit")}
                  disabled={!pointEnabled || isFullyPaid}
                >
                  Cobrar no débito
                </button>
                <button
                  className="h-10 rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wider text-studio-green disabled:opacity-60"
                  onClick={() => handlePointCharge("credit")}
                  disabled={!pointEnabled || isFullyPaid}
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

          {errorText && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-xs font-semibold text-red-700">
              {errorText}
            </div>
          )}

          {receiptPromptPaymentId && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-800">Pagamento confirmado. Deseja enviar o recibo agora?</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="h-10 rounded-xl border border-emerald-300 bg-white px-3 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700"
                  onClick={() => setReceiptPromptPaymentId(null)}
                >
                  Agora não
                </button>
                <button
                  className="h-10 rounded-xl bg-emerald-600 px-3 text-[11px] font-extrabold uppercase tracking-wider text-white"
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
