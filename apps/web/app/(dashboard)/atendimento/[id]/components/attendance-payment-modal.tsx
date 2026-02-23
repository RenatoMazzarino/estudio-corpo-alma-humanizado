"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, CreditCard, Loader2, QrCode, Trash2, Wallet } from "lucide-react";
import Image from "next/image";
import type { CheckoutItem, CheckoutRow, PaymentRow } from "../../../../../lib/attendance/attendance-types";
import {
  ATTENDANCE_PIX_RECEIVER_CITY,
  ATTENDANCE_PIX_RECEIVER_NAME,
  ATTENDANCE_PIX_TXID,
} from "../../../../../src/shared/config";
import { buildPixBrCode } from "../../../../../src/shared/pix/brcode";

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
  pixKeyValue: string;
  pixKeyType: "cnpj" | "cpf" | "email" | "phone" | "evp" | null;
  pointEnabled: boolean;
  pointTerminalName: string;
  pointTerminalModel: string;
  onClose: () => void;
  onSaveItems: (
    items: Array<{ type: CheckoutItem["type"]; label: string; qty: number; amount: number }>
  ) => Promise<boolean>;
  onSetDiscount: (type: "value" | "pct" | null, value: number | null, reason?: string) => Promise<boolean>;
  onRegisterCashPayment: (amount: number) => Promise<{ ok: boolean; paymentId?: string | null }>;
  onRegisterPixKeyPayment: (amount: number) => Promise<{ ok: boolean; paymentId?: string | null }>;
  onCreatePixPayment: (amount: number, attempt: number) => Promise<{ ok: boolean; data?: PixPaymentData }>;
  onPollPixStatus: () => Promise<{ ok: boolean; status: InternalStatus }>;
  onCreatePointPayment: (
    amount: number,
    cardMode: PointCardMode,
    attempt: number
  ) => Promise<{ ok: boolean; data?: PointPaymentData }>;
  onPollPointStatus: (
    orderId: string
  ) => Promise<{ ok: boolean; status: InternalStatus; paymentId?: string | null }>;
  onSendReceipt: (paymentId: string) => Promise<void>;
  onReceiptPromptResolved?: (payload: { paymentId: string; sentReceipt: boolean }) => Promise<void> | void;
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

function normalizePixKeyForCharge(
  value: string,
  type: "cnpj" | "cpf" | "email" | "phone" | "evp" | null
) {
  if (type === "cnpj" || type === "cpf") {
    return value.replace(/\D/g, "");
  }
  if (type === "phone") {
    const digits = value.replace(/\D/g, "");
    return digits.startsWith("+") ? digits : `+${digits}`;
  }
  return value.trim();
}

function formatPixTypeLabel(type: "cnpj" | "cpf" | "email" | "phone" | "evp" | null) {
  switch (type) {
    case "cnpj":
      return "CNPJ";
    case "cpf":
      return "CPF";
    case "email":
      return "E-mail";
    case "phone":
      return "Telefone";
    case "evp":
      return "Aleatória (EVP)";
    default:
      return "Chave";
  }
}

export function AttendancePaymentModal({
  open,
  checkout,
  items,
  payments,
  pixKeyValue,
  pixKeyType,
  pointEnabled,
  pointTerminalName,
  pointTerminalModel,
  onClose,
  onSaveItems,
  onSetDiscount,
  onRegisterCashPayment,
  onRegisterPixKeyPayment,
  onCreatePixPayment,
  onPollPixStatus,
  onCreatePointPayment,
  onPollPointStatus,
  onSendReceipt,
  onReceiptPromptResolved,
}: AttendancePaymentModalProps) {
  const [method, setMethod] = useState<"cash" | "pix_mp" | "pix_key" | "card">("cash");
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
  const [pixKeyCode, setPixKeyCode] = useState("");
  const [pixKeyQrDataUrl, setPixKeyQrDataUrl] = useState<string | null>(null);
  const [pixKeyGenerating, setPixKeyGenerating] = useState(false);
  const [pixKeyError, setPixKeyError] = useState<string | null>(null);
  const [pointPayment, setPointPayment] = useState<PointPaymentData | null>(null);
  const [pointAttempt, setPointAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [checkoutSaving, setCheckoutSaving] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [receiptPromptPaymentId, setReceiptPromptPaymentId] = useState<string | null>(null);
  const [resolvingReceiptPrompt, setResolvingReceiptPrompt] = useState(false);
  const [pixRemaining, setPixRemaining] = useState(0);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const normalizedPixKeyValue = normalizePixKeyForCharge(pixKeyValue, pixKeyType);
  const pixKeyConfigured = normalizedPixKeyValue.length > 0;

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
  const indexedItems = useMemo(() => normalizedItems.map((item, index) => ({ item, index })), [normalizedItems]);
  const serviceItems = useMemo(
    () => indexedItems.filter(({ item }) => item.type === "service"),
    [indexedItems]
  );
  const displacementItems = useMemo(
    () => indexedItems.filter(({ item }) => item.type === "fee" && /desloc/i.test(item.label)),
    [indexedItems]
  );
  const otherItems = useMemo(
    () =>
      indexedItems.filter(
        ({ item }) => !(item.type === "service" || (item.type === "fee" && /desloc/i.test(item.label)))
      ),
    [indexedItems]
  );
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
    setResolvingReceiptPrompt(false);
    setPixKeyError(null);
    setCheckoutSaving(false);
  }, [open, items, checkout?.discount_type, checkout?.discount_value, checkout?.discount_reason]);

  useEffect(() => {
    if (!open) return;
    setCashAmount(remaining);
  }, [open, remaining]);

  useEffect(() => {
    if (!open) return;
    setPixAttempt(0);
    setPointAttempt(0);
  }, [open]);

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
    if (!open || !pixPayment || method !== "pix_mp") return;
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
    if (!open || method !== "pix_key") return;
    if (!pixKeyConfigured) {
      setPixKeyCode("");
      setPixKeyQrDataUrl(null);
      setPixKeyError("Configure a chave Pix CNPJ para usar esta forma de cobrança.");
      return;
    }
    if (remaining <= 0) {
      setPixKeyCode("");
      setPixKeyQrDataUrl(null);
      setPixKeyError(null);
      return;
    }

    let cancelled = false;
    const generatePixKeyCharge = async () => {
      setPixKeyGenerating(true);
      setPixKeyError(null);
      try {
        const payload = buildPixBrCode({
          pixKey: normalizedPixKeyValue,
          amount: remaining,
          merchantName: ATTENDANCE_PIX_RECEIVER_NAME,
          merchantCity: ATTENDANCE_PIX_RECEIVER_CITY,
          txid: ATTENDANCE_PIX_TXID,
          description: "Atendimento Estudio Corpo e Alma",
        });

        const qrcode = await import("qrcode");
        const qrDataUrl = await qrcode.toDataURL(payload, {
          width: 280,
          margin: 1,
          errorCorrectionLevel: "M",
        });

        if (cancelled) return;
        setPixKeyCode(payload);
        setPixKeyQrDataUrl(qrDataUrl);
      } catch {
        if (cancelled) return;
        setPixKeyCode("");
        setPixKeyQrDataUrl(null);
        setPixKeyError("Não foi possível gerar o Pix por chave agora.");
      } finally {
        if (!cancelled) {
          setPixKeyGenerating(false);
        }
      }
    };

    void generatePixKeyCharge();
    return () => {
      cancelled = true;
    };
  }, [method, normalizedPixKeyValue, open, pixKeyConfigured, remaining]);

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

  const handleCopyPixKey = async () => {
    if (!pixKeyCode) return;
    await navigator.clipboard.writeText(pixKeyCode);
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

  const handleRegisterPixKey = async () => {
    if (remaining <= 0) return;
    setBusy(true);
    setErrorText(null);
    const result = await onRegisterPixKeyPayment(remaining);
    setBusy(false);
    if (!result.ok) {
      setErrorText("Não foi possível registrar o pagamento Pix por chave.");
      return;
    }
    if (result.paymentId) {
      setReceiptPromptPaymentId(result.paymentId);
    }
  };

  const handlePointCharge = async (cardMode: PointCardMode) => {
    if (remaining <= 0) return;
    const nextAttempt = pointAttempt + 1;
    setBusy(true);
    setErrorText(null);
    const result = await onCreatePointPayment(remaining, cardMode, nextAttempt);
    setBusy(false);
    if (!result.ok || !result.data) {
      setErrorText("Não foi possível iniciar a cobrança na maquininha.");
      return;
    }
    setPointAttempt(nextAttempt);
    setPointPayment(result.data);
    if (result.data.internal_status === "paid") {
      setReceiptPromptPaymentId(result.data.id);
    }
  };

  const resolveReceiptPrompt = async (sendReceipt: boolean) => {
    const paymentId = receiptPromptPaymentId;
    if (!paymentId || resolvingReceiptPrompt) return;
    setReceiptPromptPaymentId(null);
    setResolvingReceiptPrompt(true);
    try {
      if (sendReceipt) {
        await onSendReceipt(paymentId);
      }
      await onReceiptPromptResolved?.({ paymentId, sentReceipt: sendReceipt });
    } finally {
      setResolvingReceiptPrompt(false);
    }
  };

  const handleAddItem = async () => {
    const label = newItem.label.trim();
    const amount = Number(newItem.amount ?? 0);
    if (!label || amount <= 0) return;
    const nextItems = [...normalizedItems, { ...newItem, label, qty: 1, amount }];
    setCheckoutSaving(true);
    try {
      const saved = await onSaveItems(nextItems);
      if (!saved) return;
      setDraftItems(nextItems);
      setNewItem({ type: "addon", label: "", qty: 1, amount: 0 });
    } finally {
      setCheckoutSaving(false);
    }
  };

  const isRemovableItem = (item: { type: CheckoutItem["type"]; label: string }) =>
    item.type !== "service" && !(item.type === "fee" && /desloc/i.test(item.label));

  const handleRemoveItem = async (indexToRemove: number) => {
    const target = normalizedItems[indexToRemove];
    if (!target || !isRemovableItem(target)) return;
    const nextItems = normalizedItems.filter((_, index) => index !== indexToRemove);
    setCheckoutSaving(true);
    try {
      const saved = await onSaveItems(nextItems);
      if (!saved) return;
      setDraftItems(nextItems);
    } finally {
      setCheckoutSaving(false);
    }
  };

  const handleApplyDiscount = async () => {
    const normalizedValue = Number(discountValueInput ?? 0);
    const safeValue = Number.isFinite(normalizedValue) ? Math.max(normalizedValue, 0) : 0;
    const nextType: "value" | "pct" | null = safeValue > 0 ? discountTypeInput : null;
    const nextReason = discountReasonInput.trim();

    setCheckoutSaving(true);
    try {
      const saved = await onSetDiscount(nextType, safeValue > 0 ? safeValue : null, nextReason || undefined);
      if (!saved) return;

      setAppliedDiscountType(nextType);
      setAppliedDiscountValue(safeValue);
      setAppliedDiscountReason(nextReason);

      const nextDiscountAmount =
        nextType === "pct"
          ? Math.min(subtotal, subtotal * (safeValue / 100))
          : nextType === "value"
            ? Math.min(subtotal, safeValue)
            : 0;
      const nextTotal = Math.max(subtotal - nextDiscountAmount, 0);
      setCashAmount(Math.max(nextTotal - paidTotal, 0));
    } finally {
      setCheckoutSaving(false);
    }
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

          <section className="mt-5 rounded-2xl border border-line px-4 py-4 bg-white">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
              <Wallet className="w-3.5 h-3.5" />
              Composição da cobrança
            </div>

            <div className="space-y-2">
              {serviceItems.map(({ item, index }) => (
                <div key={`service-${index}`} className="flex items-center justify-between gap-3 text-sm text-studio-text">
                  <span className="truncate pr-3">
                    {item.label}
                    {(item.qty ?? 1) > 1 ? ` x${item.qty}` : ""}
                  </span>
                  <span className="font-bold">{formatCurrency(item.amount * (item.qty ?? 1))}</span>
                </div>
              ))}

              {displacementItems.map(({ item, index }) => (
                <div key={`displacement-${index}`} className="flex items-center justify-between gap-3 text-sm text-studio-text">
                  <span className="truncate pr-3">
                    {item.label}
                    {(item.qty ?? 1) > 1 ? ` x${item.qty}` : ""}
                  </span>
                  <span className="font-bold">{formatCurrency(item.amount * (item.qty ?? 1))}</span>
                </div>
              ))}

              {otherItems.map(({ item, index }) => (
                <div key={`extra-${index}`} className="flex items-center justify-between gap-3 text-sm text-studio-text">
                  <span className="truncate pr-3">
                    {item.label}
                    {(item.qty ?? 1) > 1 ? ` x${item.qty}` : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{formatCurrency(item.amount * (item.qty ?? 1))}</span>
                    {isRemovableItem(item) && (
                        <button
                          type="button"
                          onClick={() => void handleRemoveItem(index)}
                          disabled={checkoutSaving}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white text-muted hover:text-red-600"
                          aria-label={`Remover item ${item.label}`}
                        >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Adicionar item</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <input
                  className="col-span-2 rounded-xl border border-line px-3 py-2 text-xs"
                  placeholder="Novo item"
                  value={newItem.label}
                  disabled={checkoutSaving}
                  onChange={(event) => setNewItem((current) => ({ ...current, label: event.target.value }))}
                />
                <input
                  className="rounded-xl border border-line px-3 py-2 text-xs"
                  type="number"
                  value={newItem.amount}
                  disabled={checkoutSaving}
                  onChange={(event) => setNewItem((current) => ({ ...current, amount: Number(event.target.value) }))}
                />
              </div>
              <button
                className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-studio-text"
                onClick={handleAddItem}
                disabled={checkoutSaving}
              >
                {checkoutSaving ? "Salvando..." : "Adicionar item"}
              </button>
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Desconto</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  value={discountTypeInput}
                  disabled={checkoutSaving}
                  onChange={(event) => setDiscountTypeInput(event.target.value === "pct" ? "pct" : "value")}
                  className="rounded-xl border border-line px-3 py-2 text-xs"
                >
                  <option value="value">Desconto em R$</option>
                  <option value="pct">Desconto em %</option>
                </select>
                <input
                  type="number"
                  value={discountValueInput}
                  disabled={checkoutSaving}
                  onChange={(event) => setDiscountValueInput(Number(event.target.value))}
                  className="rounded-xl border border-line px-3 py-2 text-xs"
                />
              </div>
              <input
                value={discountReasonInput}
                disabled={checkoutSaving}
                onChange={(event) => setDiscountReasonInput(event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-xs"
                placeholder="Motivo do desconto"
              />
              <button
                className="mt-2 w-full rounded-xl border border-studio-green bg-studio-light px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-studio-green"
                onClick={handleApplyDiscount}
                disabled={checkoutSaving}
              >
                {checkoutSaving ? "Salvando..." : "Aplicar desconto"}
              </button>
            </div>

            <div className="mt-4 border-t border-dashed border-line pt-3 space-y-2">
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
              {paidTotal > 0 && (
                <div className="flex items-center justify-between text-sm text-studio-text">
                  <span>Já pago</span>
                  <span className="font-bold text-studio-green">- {formatCurrency(paidTotal)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-muted">
                <span>Total do checkout</span>
                <span className="text-base font-black text-studio-text">{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-muted">
                <span>Valor a cobrar agora</span>
                <span className="text-lg font-black text-studio-text">{formatCurrency(remaining)}</span>
              </div>
            </div>
          </section>

          <section className="mt-5">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
              <Wallet className="w-3.5 h-3.5" />
              Forma de pagamento
            </div>
            <div className="grid grid-cols-4 gap-2">
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
                  method === "pix_mp"
                    ? "border-studio-green bg-studio-light text-studio-green"
                    : "border-line text-muted hover:bg-paper"
                }`}
                onClick={() => setMethod("pix_mp")}
              >
                <QrCode className="mx-auto mb-1 h-3.5 w-3.5" />
                PIX MP
              </button>
              <button
                className={`h-10 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border transition ${
                  method === "pix_key"
                    ? "border-studio-green bg-studio-light text-studio-green"
                    : "border-line text-muted hover:bg-paper"
                }`}
                onClick={() => setMethod("pix_key")}
              >
                <QrCode className="mx-auto mb-1 h-3.5 w-3.5" />
                PIX Chave
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

          {method === "pix_mp" && (
            <section className="mt-4 rounded-2xl border border-line px-4 py-4 bg-white">
              {!pixPayment && (
                <button
                  className="w-full h-10 rounded-xl bg-studio-green px-3 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                  onClick={handleCreatePix}
                  disabled={isFullyPaid}
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

          {method === "pix_key" && (
            <section className="mt-4 rounded-2xl border border-line px-4 py-4 bg-white">
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
                  <div className="mt-3 rounded-xl border border-line bg-stone-50 px-3 py-2 text-[11px] text-muted break-all">
                    {pixKeyCode}
                  </div>
                  <button
                    className="mt-3 w-full h-10 rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wider text-studio-green"
                    onClick={handleCopyPixKey}
                  >
                    <Copy className="mr-1 inline h-3.5 w-3.5" />
                    Copiar código Pix chave
                  </button>
                </>
              )}

              <button
                className="mt-3 w-full h-10 rounded-xl bg-studio-green px-3 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                onClick={handleRegisterPixKey}
                disabled={isFullyPaid || !pixKeyConfigured || !pixKeyCode || pixKeyGenerating}
              >
                Registrar pagamento Pix chave
              </button>

              {pixKeyError && <p className="mt-2 text-xs font-semibold text-red-700">{pixKeyError}</p>}
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
                  onClick={() => void resolveReceiptPrompt(false)}
                  disabled={resolvingReceiptPrompt}
                >
                  Agora não
                </button>
                <button
                  className="h-10 rounded-xl bg-emerald-600 px-3 text-[11px] font-extrabold uppercase tracking-wider text-white"
                  onClick={() => void resolveReceiptPrompt(true)}
                  disabled={resolvingReceiptPrompt}
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
