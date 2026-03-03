
import { useMemo } from "react";
import type { CheckoutItem, PaymentRow } from "../../../../../lib/attendance/attendance-types";

type SummaryParams = {
  draftItems: Array<{ type: CheckoutItem["type"]; label: string; qty: number; amount: number }>;
  payments: PaymentRow[];
  appliedDiscountType: "value" | "pct" | null;
  appliedDiscountValue: number;
  chargeAmountOverride: number | null;
  appointmentPaymentStatus: string | null;
  waiverSuccess: boolean;
  receiptPromptPaymentId: string | null;
};

export function useAttendanceCheckoutSummary({
  draftItems,
  payments,
  appliedDiscountType,
  appliedDiscountValue,
  chargeAmountOverride,
  appointmentPaymentStatus,
  waiverSuccess,
  receiptPromptPaymentId,
}: SummaryParams) {
  const paidTotal = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "paid")
        .reduce((acc, item) => acc + Number(item.amount ?? 0), 0),
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
  const serviceItems = useMemo(() => indexedItems.filter(({ item }) => item.type === "service"), [indexedItems]);
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
    const raw =
      chargeAmountOverride === null || chargeAmountOverride === undefined
        ? remaining
        : Number(chargeAmountOverride);
    if (!Number.isFinite(raw)) return remaining;
    return Math.max(0, Math.min(raw, remaining));
  }, [chargeAmountOverride, remaining]);

  const isFullyPaid = remaining <= 0 && total > 0;
  const isWaived = appointmentPaymentStatus === "waived" || waiverSuccess;
  const isSuccessState = Boolean(receiptPromptPaymentId) || waiverSuccess;

  return {
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
  };
}
