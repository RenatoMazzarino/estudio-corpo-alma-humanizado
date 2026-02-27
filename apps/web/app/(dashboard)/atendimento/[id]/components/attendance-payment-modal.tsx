"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Loader2 } from "lucide-react";
import Image from "next/image";
import type { CheckoutItem, CheckoutRow, PaymentRow } from "../../../../../lib/attendance/attendance-types";
import { PaymentMethodIcon } from "../../../../../components/ui/payment-method-icon";
import {
  ATTENDANCE_PIX_RECEIVER_CITY,
  ATTENDANCE_PIX_RECEIVER_NAME,
  ATTENDANCE_PIX_TXID,
} from "../../../../../src/shared/config";
import { buildPixBrCode } from "../../../../../src/shared/pix/brcode";
import {
  formatCountdown,
  formatCurrency,
  formatPixTypeLabel,
  getRemainingSeconds,
  normalizePixKeyForCharge,
  stageMessages,
} from "./attendance-payment-modal.helpers";
import { AttendancePaymentCompositionPanel } from "./attendance-payment-composition-panel";
import { AttendancePaymentSuccessPanel } from "./attendance-payment-success-panel";
import type { ReceiptFlowMode } from "./attendance-payment.types";

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
  appointmentPaymentStatus?: string | null;
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
  onWaivePayment: () => Promise<{ ok: boolean }>;
  onSendReceipt: (paymentId: string) => Promise<void>;
  onAutoSendReceipt?: (paymentId: string) => Promise<{ ok?: boolean; message?: string } | void>;
  receiptFlowMode?: ReceiptFlowMode;
  variant?: "modal" | "embedded";
  chargeAmountOverride?: number | null;
  hideWaiverOption?: boolean;
  initialMethod?: "cash" | "pix_mp" | "pix_key" | "card" | "waiver";
  successResolveLabel?: string;
  onReceiptPromptResolved?: (payload: {
    paymentId?: string | null;
    sentReceipt: boolean;
    outcome?: "paid" | "waived";
  }) => Promise<void> | void;
}

export function AttendancePaymentModal({
  open,
  checkout,
  items,
  payments,
  appointmentPaymentStatus = null,
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
  onWaivePayment,
  onSendReceipt,
  onAutoSendReceipt,
  receiptFlowMode = "manual",
  variant = "modal",
  chargeAmountOverride = null,
  hideWaiverOption = false,
  initialMethod = "cash",
  successResolveLabel = "Voltar para agenda",
  onReceiptPromptResolved,
}: AttendancePaymentModalProps) {
  const [method, setMethod] = useState<"cash" | "pix_mp" | "pix_key" | "card" | "waiver">("cash");
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
  const [waiverSuccess, setWaiverSuccess] = useState(false);
  const [resolvingReceiptPrompt, setResolvingReceiptPrompt] = useState(false);
  const [receiptSent, setReceiptSent] = useState(false);
  const [autoReceiptStatus, setAutoReceiptStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [autoReceiptMessage, setAutoReceiptMessage] = useState<string | null>(null);
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
  const effectiveChargeAmount = useMemo(() => {
    const raw = chargeAmountOverride === null || chargeAmountOverride === undefined ? remaining : Number(chargeAmountOverride);
    if (!Number.isFinite(raw)) return remaining;
    return Math.max(0, Math.min(raw, remaining));
  }, [chargeAmountOverride, remaining]);
  const isFullyPaid = remaining <= 0 && total > 0;
  const isWaived = appointmentPaymentStatus === "waived" || waiverSuccess;
  const isSuccessState = Boolean(receiptPromptPaymentId) || waiverSuccess;

  useEffect(() => {
    if (!open) return;
    setMethod(appointmentPaymentStatus === "waived" ? "waiver" : initialMethod);
    setDraftItems(items.map((item) => ({ type: item.type, label: item.label, qty: item.qty, amount: item.amount })));
    setAppliedDiscountType(checkout?.discount_type ?? null);
    setAppliedDiscountValue(checkout?.discount_value ?? 0);
    setAppliedDiscountReason(checkout?.discount_reason ?? "");
    setDiscountTypeInput(checkout?.discount_type === "pct" ? "pct" : "value");
    setDiscountValueInput(checkout?.discount_value ?? 0);
    setDiscountReasonInput(checkout?.discount_reason ?? "");
    setErrorText(null);
    setWaiverSuccess(false);
    setResolvingReceiptPrompt(false);
    setReceiptSent(false);
    setAutoReceiptStatus("idle");
    setAutoReceiptMessage(null);
    setPixKeyError(null);
    setCheckoutSaving(false);
  }, [open, items, checkout?.discount_type, checkout?.discount_value, checkout?.discount_reason, appointmentPaymentStatus, initialMethod]);

  useEffect(() => {
    if (!open) return;
    setCashAmount(effectiveChargeAmount);
  }, [effectiveChargeAmount, open]);

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
    if (variant === "embedded") {
      setPortalTarget(null);
      return;
    }
    setPortalTarget(document.getElementById("app-frame"));
  }, [variant]);

  useEffect(() => {
    if (!open || !pixPayment || method !== "pix_mp") return;
    const interval = window.setInterval(async () => {
      const result = await onPollPixStatus();
      if (!result.ok) return;
      if (result.status === "paid") {
        setReceiptPromptPaymentId(pixPayment.id);
        setReceiptSent(false);
        setAutoReceiptStatus("idle");
        setAutoReceiptMessage(null);
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
    if (effectiveChargeAmount <= 0) {
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
          amount: effectiveChargeAmount,
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
  }, [effectiveChargeAmount, method, normalizedPixKeyValue, open, pixKeyConfigured]);

  useEffect(() => {
    if (!open || !pointPayment || method !== "card") return;
    const interval = window.setInterval(async () => {
      const result = await onPollPointStatus(pointPayment.order_id);
      if (!result.ok) return;
      if (result.status === "paid") {
        setReceiptPromptPaymentId(result.paymentId ?? pointPayment.id);
        setReceiptSent(false);
        setAutoReceiptStatus("idle");
        setAutoReceiptMessage(null);
        setPointPayment(null);
      }
      if (result.status === "failed") {
        setErrorText("Cobrança não concluída na maquininha. Tente novamente.");
      }
    }, 3500);
    return () => window.clearInterval(interval);
  }, [method, onPollPointStatus, open, pointPayment]);

  useEffect(() => {
    if (!open || receiptFlowMode !== "auto") return;
    if (!receiptPromptPaymentId) return;
    if (autoReceiptStatus !== "idle") return;

    let cancelled = false;

    const run = async () => {
      if (!onAutoSendReceipt) {
        if (!cancelled) {
          setAutoReceiptStatus("failed");
          setAutoReceiptMessage("Envio automático do recibo ainda não está configurado neste ambiente.");
        }
        return;
      }

      setAutoReceiptStatus("sending");
      setAutoReceiptMessage("Enviando recibo automaticamente no WhatsApp...");
      try {
        const result = await onAutoSendReceipt(receiptPromptPaymentId);
        if (cancelled) return;
        if (result && result.ok === false) {
          setAutoReceiptStatus("failed");
          setAutoReceiptMessage(result.message ?? "Não foi possível enviar o recibo automaticamente.");
          return;
        }
        setAutoReceiptStatus("sent");
        setAutoReceiptMessage(result?.message ?? "Recibo enviado automaticamente pelo WhatsApp.");
        setReceiptSent(true);
      } catch {
        if (cancelled) return;
        setAutoReceiptStatus("failed");
        setAutoReceiptMessage("Não foi possível enviar o recibo automaticamente.");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [autoReceiptStatus, onAutoSendReceipt, open, receiptFlowMode, receiptPromptPaymentId]);

  const handleCreatePix = async () => {
    if (effectiveChargeAmount <= 0) return;
    setBusy(true);
    setErrorText(null);
    const nextAttempt = pixAttempt + 1;
    const result = await onCreatePixPayment(effectiveChargeAmount, nextAttempt);
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
      setReceiptSent(false);
      setAutoReceiptStatus("idle");
      setAutoReceiptMessage(null);
    }
  };

  const handleRegisterPixKey = async () => {
    if (effectiveChargeAmount <= 0) return;
    setBusy(true);
    setErrorText(null);
    const result = await onRegisterPixKeyPayment(effectiveChargeAmount);
    setBusy(false);
    if (!result.ok) {
      setErrorText("Não foi possível registrar o pagamento Pix por chave.");
      return;
    }
    if (result.paymentId) {
      setReceiptPromptPaymentId(result.paymentId);
      setReceiptSent(false);
      setAutoReceiptStatus("idle");
      setAutoReceiptMessage(null);
    }
  };

  const handlePointCharge = async (cardMode: PointCardMode) => {
    if (effectiveChargeAmount <= 0) return;
    const nextAttempt = pointAttempt + 1;
    setBusy(true);
    setErrorText(null);
    const result = await onCreatePointPayment(effectiveChargeAmount, cardMode, nextAttempt);
    setBusy(false);
    if (!result.ok || !result.data) {
      setErrorText("Não foi possível iniciar a cobrança na maquininha.");
      return;
    }
    setPointAttempt(nextAttempt);
    setPointPayment(result.data);
    if (result.data.internal_status === "paid") {
      setReceiptPromptPaymentId(result.data.id);
      setWaiverSuccess(false);
      setReceiptSent(false);
      setAutoReceiptStatus("idle");
      setAutoReceiptMessage(null);
    }
  };

  const handleWaiveAsCourtesy = async () => {
    if (isWaived) return;
    setBusy(true);
    setErrorText(null);
    const result = await onWaivePayment();
    setBusy(false);
    if (!result.ok) {
      setErrorText("Não foi possível liberar este pagamento como cortesia.");
      return;
    }
    setWaiverSuccess(true);
    setReceiptPromptPaymentId(null);
    setReceiptSent(false);
    setAutoReceiptStatus("idle");
    setAutoReceiptMessage("Atendimento liberado como cortesia interna.");
  };

  const handleSendReceiptFromSuccess = async () => {
    const paymentId = receiptPromptPaymentId;
    if (!paymentId || resolvingReceiptPrompt) return;
    setResolvingReceiptPrompt(true);
    try {
      await onSendReceipt(paymentId);
      setReceiptSent(true);
    } finally {
      setResolvingReceiptPrompt(false);
    }
  };

  const resolveCheckoutSuccess = async () => {
    const isPaymentSuccess = Boolean(receiptPromptPaymentId);
    if (!isPaymentSuccess && !waiverSuccess) return;
    const paymentId = receiptPromptPaymentId;
    if (resolvingReceiptPrompt) return;
    setResolvingReceiptPrompt(true);
    try {
      await onReceiptPromptResolved?.({
        paymentId,
        sentReceipt: isPaymentSuccess ? receiptSent || autoReceiptStatus === "sent" : false,
        outcome: isPaymentSuccess ? "paid" : "waived",
      });
      setReceiptPromptPaymentId(null);
      setWaiverSuccess(false);
    } finally {
      setResolvingReceiptPrompt(false);
    }
  };

  const handleDismiss = () => {
    if (receiptPromptPaymentId || waiverSuccess) {
      void resolveCheckoutSuccess();
      return;
    }
    onClose();
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

  const handleApplyDiscount = useCallback(async () => {
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
  }, [discountReasonInput, discountTypeInput, discountValueInput, onSetDiscount, paidTotal, subtotal]);

  useEffect(() => {
    if (!open || isSuccessState || checkoutSaving) return;

    const normalizedValue = Number(discountValueInput ?? 0);
    const safeValue = Number.isFinite(normalizedValue) ? Math.max(normalizedValue, 0) : 0;
    const nextType: "value" | "pct" | null = safeValue > 0 ? discountTypeInput : null;
    const nextReason = discountReasonInput.trim();
    const currentType = appliedDiscountType ?? null;
    const currentValue = Number.isFinite(Number(appliedDiscountValue))
      ? Math.max(Number(appliedDiscountValue), 0)
      : 0;
    const currentReason = (appliedDiscountReason ?? "").trim();
    const hasChange =
      nextType !== currentType ||
      Math.abs(safeValue - currentValue) > 0.009 ||
      nextReason !== currentReason;

    if (!hasChange) return;

    const timeout = window.setTimeout(() => {
      void handleApplyDiscount();
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [
    appliedDiscountReason,
    appliedDiscountType,
    appliedDiscountValue,
    checkoutSaving,
    discountReasonInput,
    discountTypeInput,
    discountValueInput,
    handleApplyDiscount,
    isSuccessState,
    open,
  ]);

  if (!open) return null;

  const isEmbedded = variant === "embedded";
  const modalNode = (
    <div
      className={
        isEmbedded
          ? "relative w-full"
          : `${portalTarget ? "absolute" : "fixed"} inset-0 z-50 flex items-end justify-center pointer-events-none`
      }
    >
      {!isEmbedded && (
        <button
          className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
          onClick={handleDismiss}
          aria-label="Fechar modal"
        />
      )}
      <div
        className={`relative w-full flex flex-col ${
          isEmbedded
            ? "rounded-2xl border border-line bg-white shadow-soft"
            : "max-w-105 rounded-t-3xl bg-white shadow-float max-h-[90vh] pointer-events-auto"
        }`}
      >
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
              onClick={handleDismiss}
            >
              Fechar
            </button>
          </div>

          {isSuccessState ? (
            <AttendancePaymentSuccessPanel
              waiverSuccess={waiverSuccess}
              totalLabel={formatCurrency(total)}
              remainingLabel={remaining <= 0 ? "Quitado" : formatCurrency(remaining)}
              receiptFlowMode={receiptFlowMode}
              autoReceiptStatus={autoReceiptStatus}
              autoReceiptMessage={autoReceiptMessage}
              receiptSent={receiptSent}
              resolvingReceiptPrompt={resolvingReceiptPrompt}
              successResolveLabel={successResolveLabel}
              onSendReceipt={() => void handleSendReceiptFromSuccess()}
              onResolve={() => void resolveCheckoutSuccess()}
            />
          ) : (
            <>
              <AttendancePaymentCompositionPanel
                serviceItems={serviceItems}
                displacementItems={displacementItems}
                otherItems={otherItems}
                checkoutSaving={checkoutSaving}
                newItem={newItem}
                discountTypeInput={discountTypeInput}
                discountValueInput={discountValueInput}
                discountReasonInput={discountReasonInput}
                appliedDiscountAmount={appliedDiscountAmount}
                appliedDiscountType={appliedDiscountType}
                appliedDiscountValue={appliedDiscountValue}
                appliedDiscountReason={appliedDiscountReason}
                paidTotal={paidTotal}
                totalLabel={formatCurrency(total)}
                effectiveChargeAmountLabel={formatCurrency(effectiveChargeAmount)}
                formatCurrency={formatCurrency}
                isRemovableItem={isRemovableItem}
                onAddItem={handleAddItem}
                onRemoveItem={(index) => void handleRemoveItem(index)}
                onChangeNewItemLabel={(label) =>
                  setNewItem((current) => ({ ...current, label }))
                }
                onChangeNewItemAmount={(amount) =>
                  setNewItem((current) => ({ ...current, amount }))
                }
                onChangeDiscountType={setDiscountTypeInput}
                onChangeDiscountValue={setDiscountValueInput}
                onChangeDiscountReason={setDiscountReasonInput}
              />

          <section className="mt-5">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">
              <PaymentMethodIcon method="card" className="h-3.5 w-3.5" />
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
                disabled={isWaived}
              >
                <PaymentMethodIcon method="cash" className="mx-auto mb-1 h-3.5 w-3.5" />
                Dinheiro
              </button>
              <button
                className={`h-10 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border transition ${
                  method === "pix_mp"
                    ? "border-studio-green bg-studio-light text-studio-green"
                    : "border-line text-muted hover:bg-paper"
                }`}
                onClick={() => setMethod("pix_mp")}
                disabled={isWaived}
              >
                <PaymentMethodIcon method="pix" className="mx-auto mb-1 h-3.5 w-3.5" />
                PIX MP
              </button>
              <button
                className={`h-10 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border transition ${
                  method === "pix_key"
                    ? "border-studio-green bg-studio-light text-studio-green"
                    : "border-line text-muted hover:bg-paper"
                }`}
                onClick={() => setMethod("pix_key")}
                disabled={isWaived}
              >
                <PaymentMethodIcon method="pix_key" className="mx-auto mb-1 h-3.5 w-3.5" />
                PIX Chave
              </button>
              <button
                className={`h-10 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border transition ${
                  method === "card"
                    ? "border-studio-green bg-studio-light text-studio-green"
                    : "border-line text-muted hover:bg-paper"
                }`}
                onClick={() => setMethod("card")}
                disabled={isWaived}
              >
                <PaymentMethodIcon method="card" className="mx-auto mb-1 h-3.5 w-3.5" />
                Cartão
              </button>
              {!hideWaiverOption && (
                <button
                  className={`h-10 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border transition ${
                    method === "waiver"
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-line text-muted hover:bg-paper"
                  }`}
                  onClick={() => setMethod("waiver")}
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
                disabled={isFullyPaid || isWaived}
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
                disabled={isFullyPaid || isWaived || !pixKeyConfigured || !pixKeyCode || pixKeyGenerating}
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
                  disabled={!pointEnabled || isFullyPaid || isWaived}
                >
                  Cobrar no débito
                </button>
                <button
                  className="h-10 rounded-xl border border-line px-3 text-[11px] font-extrabold uppercase tracking-wider text-studio-green disabled:opacity-60"
                  onClick={() => handlePointCharge("credit")}
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
            <section className="mt-4 rounded-2xl border border-sky-200 px-4 py-4 bg-sky-50">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-sky-700 mb-2">
                Cortesia interna
              </p>
              <p className="text-[11px] text-sky-900 leading-relaxed">
                Use esta opção quando o estúdio decidir <strong>liberar a cobrança</strong> deste atendimento.
                O sistema marcará o status financeiro como <strong>Liberado</strong> (sem registrar pagamento recebido).
              </p>
              <button
                className="mt-3 w-full h-10 rounded-xl bg-sky-600 px-3 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                onClick={handleWaiveAsCourtesy}
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
          )}
        </div>
      </div>

      {busy && (
        <div className="absolute inset-0 z-90 flex items-center justify-center bg-black/35 backdrop-blur-sm">
          <div className="rounded-2xl bg-white px-5 py-4 text-center shadow-float">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-studio-green" />
            <p className="mt-3 text-sm font-bold text-studio-text">{stageMessages[stageIndex]}</p>
          </div>
        </div>
      )}
    </div>
  );

  if (isEmbedded) return modalNode;
  return portalTarget ? createPortal(modalNode, portalTarget) : modalNode;
}
