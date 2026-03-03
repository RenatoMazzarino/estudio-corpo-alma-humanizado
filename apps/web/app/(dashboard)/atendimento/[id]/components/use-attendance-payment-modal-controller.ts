
import { useCallback, useEffect, useState } from "react";
import type { CheckoutItem } from "../../../../../lib/attendance/attendance-types";
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
import type {
  AttendancePaymentModalProps,
  PointPaymentData,
  PixPaymentData,
} from "./attendance-payment-modal.controller-types";
import { createAttendancePaymentModalHandlers } from "./attendance-payment-modal.handlers";
import { useAttendanceCheckoutSummary } from "./use-attendance-checkout-summary";

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

  const {
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
  } = useAttendanceCheckoutSummary({
    draftItems,
    payments,
    appliedDiscountType,
    appliedDiscountValue,
    chargeAmountOverride,
    appointmentPaymentStatus,
    waiverSuccess,
    receiptPromptPaymentId,
  });

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

  const {
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
  } = createAttendancePaymentModalHandlers({
    effectiveChargeAmount,
    pixAttempt,
    pointAttempt,
    pixPayment,
    pixKeyCode,
    cashAmount,
    receiptPromptPaymentId,
    resolvingReceiptPrompt,
    receiptSent,
    autoReceiptStatus,
    waiverSuccess,
    normalizedItems,
    newItem,
    onCreatePixPayment,
    onRegisterCashPayment,
    onRegisterPixKeyPayment,
    onCreatePointPayment,
    onWaivePayment,
    onSendReceipt,
    onReceiptPromptResolved,
    onClose,
    onSaveItems,
    setBusy,
    setErrorText,
    setPixAttempt,
    setPixPayment,
    setPointAttempt,
    setPointPayment,
    setReceiptPromptPaymentId,
    setReceiptSent,
    setAutoReceiptStatus,
    setAutoReceiptMessage,
    setWaiverSuccess,
    setResolvingReceiptPrompt,
    setDraftItems,
    setNewItem,
    setCheckoutSaving,
  });

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
