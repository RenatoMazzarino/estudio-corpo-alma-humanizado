import type { CheckoutItem } from "../../../../../lib/attendance/attendance-types";
import type { PointCardMode, PointPaymentData, PixPaymentData } from "./attendance-payment-modal.controller-types";

type Params = {
  effectiveChargeAmount: number;
  pixAttempt: number;
  pointAttempt: number;
  pixPayment: PixPaymentData | null;
  pixKeyCode: string;
  cashAmount: number;
  receiptPromptPaymentId: string | null;
  resolvingReceiptPrompt: boolean;
  receiptSent: boolean;
  autoReceiptStatus: "idle" | "sending" | "sent" | "failed";
  waiverSuccess: boolean;
  normalizedItems: Array<{ type: CheckoutItem["type"]; label: string; qty: number; amount: number }>;
  newItem: { type: CheckoutItem["type"]; label: string; qty: number; amount: number };
  onCreatePixPayment: (amount: number, attempt: number) => Promise<{ ok: boolean; data?: PixPaymentData | null }>;
  onRegisterCashPayment: (amount: number) => Promise<{ ok: boolean; paymentId?: string | null }>;
  onRegisterPixKeyPayment: (amount: number) => Promise<{ ok: boolean; paymentId?: string | null }>;
  onCreatePointPayment: (
    amount: number,
    mode: PointCardMode,
    attempt: number
  ) => Promise<{ ok: boolean; data?: PointPaymentData | null }>;
  onWaivePayment: () => Promise<{ ok: boolean }>;
  onSendReceipt: (paymentId: string) => Promise<void>;
  onReceiptPromptResolved?: (payload: {
    paymentId?: string | null;
    sentReceipt: boolean;
    outcome?: "paid" | "waived";
  }) => Promise<void> | void;
  onClose: () => void;
  onSaveItems: (
    items: Array<{ type: CheckoutItem["type"]; label: string; qty: number; amount: number }>
  ) => Promise<boolean>;
  setBusy: (value: boolean) => void;
  setErrorText: (value: string | null) => void;
  setPixAttempt: (value: number) => void;
  setPixPayment: (value: PixPaymentData | null) => void;
  setPointAttempt: (value: number) => void;
  setPointPayment: (value: PointPaymentData | null) => void;
  setReceiptPromptPaymentId: (value: string | null) => void;
  setReceiptSent: (value: boolean) => void;
  setAutoReceiptStatus: (value: "idle" | "sending" | "sent" | "failed") => void;
  setAutoReceiptMessage: (value: string | null) => void;
  setWaiverSuccess: (value: boolean) => void;
  setResolvingReceiptPrompt: (value: boolean) => void;
  setDraftItems: (
    value: Array<{ type: CheckoutItem["type"]; label: string; qty: number; amount: number }>
  ) => void;
  setNewItem: (value: { type: CheckoutItem["type"]; label: string; qty: number; amount: number }) => void;
  setCheckoutSaving: (value: boolean) => void;
};

export function createAttendancePaymentModalHandlers(params: Params) {
  const handleCreatePix = async () => {
    if (params.effectiveChargeAmount <= 0) return;
    params.setBusy(true);
    params.setErrorText(null);
    const nextAttempt = params.pixAttempt + 1;
    const result = await params.onCreatePixPayment(params.effectiveChargeAmount, nextAttempt);
    params.setBusy(false);
    if (!result.ok || !result.data) {
      params.setErrorText("Não foi possível gerar o Pix agora.");
      return;
    }
    params.setPixAttempt(nextAttempt);
    params.setPixPayment(result.data);
  };

  const handleCopyPix = async () => {
    if (!params.pixPayment?.qr_code) return;
    await navigator.clipboard.writeText(params.pixPayment.qr_code);
  };

  const handleCopyPixKey = async () => {
    if (!params.pixKeyCode) return;
    await navigator.clipboard.writeText(params.pixKeyCode);
  };

  const handleRegisterCash = async () => {
    if (params.cashAmount <= 0) return;
    params.setBusy(true);
    params.setErrorText(null);
    const result = await params.onRegisterCashPayment(params.cashAmount);
    params.setBusy(false);
    if (!result.ok) {
      params.setErrorText("Não foi possível registrar o pagamento em dinheiro.");
      return;
    }
    if (result.paymentId) {
      params.setReceiptPromptPaymentId(result.paymentId);
      params.setReceiptSent(false);
      params.setAutoReceiptStatus("idle");
      params.setAutoReceiptMessage(null);
    }
  };

  const handleRegisterPixKey = async () => {
    if (params.effectiveChargeAmount <= 0) return;
    params.setBusy(true);
    params.setErrorText(null);
    const result = await params.onRegisterPixKeyPayment(params.effectiveChargeAmount);
    params.setBusy(false);
    if (!result.ok) {
      params.setErrorText("Não foi possível registrar o pagamento Pix por chave.");
      return;
    }
    if (result.paymentId) {
      params.setReceiptPromptPaymentId(result.paymentId);
      params.setReceiptSent(false);
      params.setAutoReceiptStatus("idle");
      params.setAutoReceiptMessage(null);
    }
  };

  const handlePointCharge = async (cardMode: PointCardMode) => {
    if (params.effectiveChargeAmount <= 0) return;
    const nextAttempt = params.pointAttempt + 1;
    params.setBusy(true);
    params.setErrorText(null);
    const result = await params.onCreatePointPayment(params.effectiveChargeAmount, cardMode, nextAttempt);
    params.setBusy(false);
    if (!result.ok || !result.data) {
      params.setErrorText("Não foi possível iniciar a cobrança na maquininha.");
      return;
    }
    params.setPointAttempt(nextAttempt);
    params.setPointPayment(result.data);
    if (result.data.internal_status === "paid") {
      params.setReceiptPromptPaymentId(result.data.id);
      params.setWaiverSuccess(false);
      params.setReceiptSent(false);
      params.setAutoReceiptStatus("idle");
      params.setAutoReceiptMessage(null);
    }
  };

  const handleWaiveAsCourtesy = async () => {
    params.setBusy(true);
    params.setErrorText(null);
    const result = await params.onWaivePayment();
    params.setBusy(false);
    if (!result.ok) {
      params.setErrorText("Não foi possível liberar este pagamento como cortesia.");
      return;
    }
    params.setWaiverSuccess(true);
    params.setReceiptPromptPaymentId(null);
    params.setReceiptSent(false);
    params.setAutoReceiptStatus("idle");
    params.setAutoReceiptMessage("Atendimento liberado como cortesia interna.");
  };

  const handleSendReceiptFromSuccess = async () => {
    const paymentId = params.receiptPromptPaymentId;
    if (!paymentId || params.resolvingReceiptPrompt) return;
    params.setResolvingReceiptPrompt(true);
    try {
      await params.onSendReceipt(paymentId);
      params.setReceiptSent(true);
    } finally {
      params.setResolvingReceiptPrompt(false);
    }
  };

  const resolveCheckoutSuccess = async () => {
    const isPaymentSuccess = Boolean(params.receiptPromptPaymentId);
    if (!isPaymentSuccess && !params.waiverSuccess) return;
    const paymentId = params.receiptPromptPaymentId;
    if (params.resolvingReceiptPrompt) return;
    params.setResolvingReceiptPrompt(true);
    try {
      await params.onReceiptPromptResolved?.({
        paymentId,
        sentReceipt: isPaymentSuccess ? params.receiptSent || params.autoReceiptStatus === "sent" : false,
        outcome: isPaymentSuccess ? "paid" : "waived",
      });
      params.setReceiptPromptPaymentId(null);
      params.setWaiverSuccess(false);
    } finally {
      params.setResolvingReceiptPrompt(false);
    }
  };

  const handleDismiss = () => {
    if (params.receiptPromptPaymentId || params.waiverSuccess) {
      void resolveCheckoutSuccess();
      return;
    }
    params.onClose();
  };

  const handleAddItem = async () => {
    const label = params.newItem.label.trim();
    const amount = Number(params.newItem.amount ?? 0);
    if (!label || amount <= 0) return;
    const nextItems = [...params.normalizedItems, { ...params.newItem, label, qty: 1, amount }];
    params.setCheckoutSaving(true);
    try {
      const saved = await params.onSaveItems(nextItems);
      if (!saved) return;
      params.setDraftItems(nextItems);
      params.setNewItem({ type: "addon", label: "", qty: 1, amount: 0 });
    } finally {
      params.setCheckoutSaving(false);
    }
  };

  const isRemovableItem = (item: { type: CheckoutItem["type"]; label: string }) =>
    item.type !== "service" && !(item.type === "fee" && /desloc/i.test(item.label));

  const handleRemoveItem = async (indexToRemove: number) => {
    const target = params.normalizedItems[indexToRemove];
    if (!target || !isRemovableItem(target)) return;
    const nextItems = params.normalizedItems.filter((_, index) => index !== indexToRemove);
    params.setCheckoutSaving(true);
    try {
      const saved = await params.onSaveItems(nextItems);
      if (!saved) return;
      params.setDraftItems(nextItems);
    } finally {
      params.setCheckoutSaving(false);
    }
  };

  return {
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
  };
}
