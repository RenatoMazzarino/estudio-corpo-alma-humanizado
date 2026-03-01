"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CheckoutItem, CheckoutRow, PaymentRow } from "../../../../../lib/attendance/attendance-types";
import {
  ATTENDANCE_PIX_RECEIVER_CITY,
  ATTENDANCE_PIX_RECEIVER_NAME,
  ATTENDANCE_PIX_TXID,
} from "../../../../../src/shared/config";
import { buildPixBrCode } from "../../../../../src/shared/pix/brcode";
import {
  formatCurrency,
  getRemainingSeconds,
  normalizePixKeyForCharge,
  stageMessages,
} from "./attendance-payment-modal.helpers";
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

export function useAttendancePaymentModalController({
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


  const isEmbedded = variant === "embedded";

  return {
    open,
    portalTarget,
    isEmbedded,
    method,
    setMethod,
    draftItems,
    setDraftItems,
    newItem,
    setNewItem,
    appliedDiscountType,
    appliedDiscountValue,
    appliedDiscountReason,
    discountTypeInput,
    setDiscountTypeInput,
    discountValueInput,
    setDiscountValueInput,
    discountReasonInput,
    setDiscountReasonInput,
    cashAmount,
    setCashAmount,
    pixPayment,
    pixAttempt,
    pixKeyCode,
    pixKeyQrDataUrl,
    pixKeyGenerating,
    pixKeyError,
    pointPayment,
    pointAttempt,
    busy,
    checkoutSaving,
    stageIndex,
    errorText,
    receiptPromptPaymentId,
    waiverSuccess,
    resolvingReceiptPrompt,
    receiptSent,
    autoReceiptStatus,
    autoReceiptMessage,
    pixRemaining,
    normalizedPixKeyValue,
    pixKeyConfigured,
    paidTotal,
    normalizedItems,
    subtotal,
    indexedItems,
    serviceItems,
    displacementItems,
    otherItems,
    appliedDiscountAmount,
    total,
    remaining,
    effectiveChargeAmount,
    isFullyPaid,
    isWaived,
    isSuccessState,
    handleCreatePix,
    handleCopyPix,
    handleCopyPixKey,
    handleRegisterCash,
    handleRegisterPixKey,
    handlePointCharge,
    handleWaiveAsCourtesy,
    handleSendReceiptFromSuccess,
    resolveCheckoutSuccess,
    handleDismiss,
    handleAddItem,
    isRemovableItem,
    handleRemoveItem,
    stageMessages,
    formatCurrency,
    hideWaiverOption,
    pointEnabled,
    pointTerminalName,
    pointTerminalModel,
    pixKeyType,
    onClose,
    successResolveLabel,
    receiptFlowMode,
  };
}
