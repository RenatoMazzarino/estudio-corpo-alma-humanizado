import { useMemo } from "react";
import { parseDecimalInput } from "../../../../src/shared/currency";
import type {
  ChargeNowAmountMode,
  ChargeNowMethodDraft,
  CollectionTimingDraft,
  DisplacementEstimate,
  FinanceDraftItem,
  FinanceDraftItemType,
  Service,
} from "../appointment-form.types";

type ScheduleDiscountType = "value" | "pct";

type UseAppointmentFinanceParams = {
  manualDisplacementFee: string;
  displacementEstimate: DisplacementEstimate | null;
  isHomeVisit: boolean;
  servicePriceDraft: string;
  selectedService: Service | null;
  scheduleDiscountValue: string;
  scheduleDiscountType: ScheduleDiscountType;
  chargeNowCustomAmount: string;
  financeExtraItems: FinanceDraftItem[];
  chargeNowMethodDraft: ChargeNowMethodDraft | null;
  chargeNowAmountMode: ChargeNowAmountMode;
  chargeNowSignalPercent: number;
  collectionTimingDraft: CollectionTimingDraft | null;
  isEditing: boolean;
};

export function useAppointmentFinance(params: UseAppointmentFinanceParams) {
  const parsedManualDisplacementFee = useMemo(
    () => parseDecimalInput(params.manualDisplacementFee),
    [params.manualDisplacementFee]
  );

  const effectiveDisplacementFee = params.isHomeVisit
    ? Math.max(0, parsedManualDisplacementFee ?? params.displacementEstimate?.fee ?? 0)
    : 0;

  const parsedServicePriceDraft = useMemo(
    () => parseDecimalInput(params.servicePriceDraft),
    [params.servicePriceDraft]
  );

  const effectiveServicePriceDraft = useMemo(() => {
    const serviceCatalogPrice = Number(params.selectedService?.price ?? 0);
    return Math.max(0, parsedServicePriceDraft ?? serviceCatalogPrice);
  }, [parsedServicePriceDraft, params.selectedService?.price]);

  const parsedScheduleDiscountValue = useMemo(
    () => parseDecimalInput(params.scheduleDiscountValue),
    [params.scheduleDiscountValue]
  );

  const parsedChargeNowCustomAmount = useMemo(
    () => parseDecimalInput(params.chargeNowCustomAmount),
    [params.chargeNowCustomAmount]
  );

  const financeExtraSubtotal = useMemo(
    () =>
      params.financeExtraItems.reduce(
        (acc, item) => acc + Math.max(0, Number(item.amount ?? 0)) * Math.max(1, Number(item.qty ?? 1)),
        0
      ),
    [params.financeExtraItems]
  );

  const financeDraftItems = useMemo(() => {
    const items: Array<{ type: FinanceDraftItemType; label: string; qty: number; amount: number }> = [];
    if (params.selectedService) {
      items.push({
        type: "service",
        label: params.selectedService.name,
        qty: 1,
        amount: effectiveServicePriceDraft,
      });
    }
    if (params.isHomeVisit && effectiveDisplacementFee > 0) {
      items.push({
        type: "fee",
        label: "Taxa deslocamento",
        qty: 1,
        amount: effectiveDisplacementFee,
      });
    }
    params.financeExtraItems.forEach((item) => {
      items.push({
        type: item.type,
        label: item.label,
        qty: item.qty,
        amount: Math.max(0, Number(item.amount ?? 0)),
      });
    });
    return items;
  }, [effectiveDisplacementFee, effectiveServicePriceDraft, params.financeExtraItems, params.isHomeVisit, params.selectedService]);

  const scheduleSubtotal = useMemo(
    () => Math.max(0, effectiveServicePriceDraft + effectiveDisplacementFee + financeExtraSubtotal),
    [effectiveDisplacementFee, effectiveServicePriceDraft, financeExtraSubtotal]
  );

  const effectiveScheduleDiscount = useMemo(() => {
    const raw = Math.max(0, parsedScheduleDiscountValue ?? 0);
    if (params.scheduleDiscountType === "pct") {
      return Math.min(scheduleSubtotal, scheduleSubtotal * (raw / 100));
    }
    return Math.min(scheduleSubtotal, raw);
  }, [parsedScheduleDiscountValue, params.scheduleDiscountType, scheduleSubtotal]);

  const scheduleTotal = useMemo(
    () => Math.max(0, scheduleSubtotal - effectiveScheduleDiscount),
    [effectiveScheduleDiscount, scheduleSubtotal]
  );

  const effectiveSignalPercentageDraft = useMemo(
    () => Math.min(100, Math.max(0, Number(params.chargeNowSignalPercent || 0))),
    [params.chargeNowSignalPercent]
  );

  const chargeNowSuggestedSignalAmount = useMemo(() => {
    if (scheduleTotal <= 0) return 0;
    const rawSignal = scheduleTotal * (effectiveSignalPercentageDraft / 100);
    if (rawSignal <= 0) return 0;
    const minimumPix = params.chargeNowMethodDraft === "pix_mp" ? 1 : 0;
    return Math.min(scheduleTotal, Math.max(minimumPix, rawSignal));
  }, [params.chargeNowMethodDraft, effectiveSignalPercentageDraft, scheduleTotal]);

  const chargeNowDraftAmount = useMemo(() => {
    if (scheduleTotal <= 0) return 0;
    if (params.chargeNowAmountMode === "full") return scheduleTotal;
    const signalValue = Math.max(0, parsedChargeNowCustomAmount ?? 0);
    if (signalValue > 0) return Math.min(scheduleTotal, signalValue);
    return chargeNowSuggestedSignalAmount;
  }, [params.chargeNowAmountMode, chargeNowSuggestedSignalAmount, parsedChargeNowCustomAmount, scheduleTotal]);

  const chargeNowAmountError = useMemo(() => {
    if (params.collectionTimingDraft !== "charge_now") return null;
    if (params.chargeNowMethodDraft === "waiver") return null;
    if (scheduleTotal <= 0) return "Configure o financeiro antes de cobrar no agendamento.";
    if (params.chargeNowAmountMode === "signal") {
      const signalValue = Math.max(0, parsedChargeNowCustomAmount ?? 0);
      if (signalValue <= 0) return "Informe o valor do sinal.";
      if (signalValue > scheduleTotal) return "O valor do sinal não pode ser maior que o total do agendamento.";
      if (params.chargeNowMethodDraft === "pix_mp" && signalValue < 1) {
        return "Para PIX Mercado Pago, o valor mínimo é R$ 1,00.";
      }
    }
    return null;
  }, [
    params.chargeNowAmountMode,
    params.chargeNowMethodDraft,
    params.collectionTimingDraft,
    parsedChargeNowCustomAmount,
    scheduleTotal,
  ]);

  const createPriceOverrideValue = params.selectedService ? scheduleTotal.toFixed(2) : "";
  const createCheckoutServiceAmountValue = params.selectedService ? effectiveServicePriceDraft.toFixed(2) : "";
  const isCourtesyDraft =
    !params.isEditing && params.collectionTimingDraft === "charge_now" && params.chargeNowMethodDraft === "waiver";

  const createCheckoutExtraItemsJson = useMemo(
    () =>
      JSON.stringify(
        params.financeExtraItems.map((item) => ({
          type: item.type,
          label: item.label.trim(),
          qty: Math.max(1, Number(item.qty ?? 1)),
          amount: Math.max(0, Number(item.amount ?? 0)),
        }))
      ),
    [params.financeExtraItems]
  );

  const effectiveScheduleDiscountInputValue = useMemo(
    () => (parsedScheduleDiscountValue && parsedScheduleDiscountValue > 0 ? parsedScheduleDiscountValue : 0),
    [parsedScheduleDiscountValue]
  );

  return {
    effectiveDisplacementFee,
    effectiveScheduleDiscount,
    effectiveScheduleDiscountInputValue,
    effectiveSignalPercentageDraft,
    financeDraftItems,
    scheduleSubtotal,
    scheduleTotal,
    chargeNowSuggestedSignalAmount,
    chargeNowDraftAmount,
    chargeNowAmountError,
    createPriceOverrideValue,
    createCheckoutServiceAmountValue,
    isCourtesyDraft,
    createCheckoutExtraItemsJson,
  };
}
