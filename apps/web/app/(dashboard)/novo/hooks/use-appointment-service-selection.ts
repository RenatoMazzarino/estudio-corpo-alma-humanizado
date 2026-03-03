import { useCallback, type ChangeEventHandler, type Dispatch, type SetStateAction } from "react";
import { formatCurrencyInput } from "../../../../src/shared/currency";
import type {
  BookingConfirmationStep,
  ChargeBookingState,
  DisplacementEstimate,
  FinanceDraftItem,
  Service,
} from "../appointment-form.types";

type Params = {
  services: Service[];
  isEditing: boolean;
  signalPercentage?: number;
  setSelectedServiceId: (value: string) => void;
  setPriceOverride: (value: string) => void;
  setFinanceExtraItems: Dispatch<SetStateAction<FinanceDraftItem[]>>;
  setFinanceNewItemLabel: (value: string) => void;
  setFinanceNewItemAmount: (value: string) => void;
  setScheduleDiscountType: (value: "value" | "pct") => void;
  setScheduleDiscountValue: (value: string) => void;
  setSelectedDate: (value: string) => void;
  setSelectedTime: (value: string) => void;
  setCollectionTimingDraft: (value: "charge_now" | "at_attendance" | null) => void;
  setChargeNowAmountMode: (value: "full" | "signal") => void;
  setHasChargeNowAmountModeChoice: (value: boolean) => void;
  setChargeNowSignalPercent: (value: number) => void;
  setChargeNowCustomAmount: (value: string) => void;
  setChargeNowMethodDraft: (value: "cash" | "pix_mp" | "card" | "waiver" | null) => void;
  setChargeNowSignalValueConfirmed: (value: boolean) => void;
  setConfirmationSheetStep: (value: BookingConfirmationStep) => void;
  setChargeBookingState: Dispatch<SetStateAction<ChargeBookingState | null>>;
  setChargeFlowError: (value: string | null) => void;
  setChargeNotificationsDispatched: (value: boolean) => void;
  setDisplayedPrice: (value: string) => void;
  setServicePriceDraft: (value: string) => void;
  setHasLocationChoice: (value: boolean) => void;
  setIsHomeVisit: (value: boolean) => void;
  setDisplacementEstimate: Dispatch<SetStateAction<DisplacementEstimate | null>>;
  setDisplacementStatus: (value: "idle" | "loading" | "error") => void;
  setDisplacementError: (value: string | null) => void;
  setManualDisplacementFee: (value: string) => void;
};

export function useAppointmentServiceSelection({
  services,
  isEditing,
  signalPercentage,
  setSelectedServiceId,
  setPriceOverride,
  setFinanceExtraItems,
  setFinanceNewItemLabel,
  setFinanceNewItemAmount,
  setScheduleDiscountType,
  setScheduleDiscountValue,
  setSelectedDate,
  setSelectedTime,
  setCollectionTimingDraft,
  setChargeNowAmountMode,
  setHasChargeNowAmountModeChoice,
  setChargeNowSignalPercent,
  setChargeNowCustomAmount,
  setChargeNowMethodDraft,
  setChargeNowSignalValueConfirmed,
  setConfirmationSheetStep,
  setChargeBookingState,
  setChargeFlowError,
  setChargeNotificationsDispatched,
  setDisplayedPrice,
  setServicePriceDraft,
  setHasLocationChoice,
  setIsHomeVisit,
  setDisplacementEstimate,
  setDisplacementStatus,
  setDisplacementError,
  setManualDisplacementFee,
}: Params) {
  const applyServiceSelection = useCallback(
    (serviceId: string) => {
      setSelectedServiceId(serviceId);
      setPriceOverride("");
      if (!isEditing) {
        setFinanceExtraItems([]);
        setFinanceNewItemLabel("");
        setFinanceNewItemAmount("");
        setScheduleDiscountType("value");
        setScheduleDiscountValue("");
        setSelectedDate("");
        setSelectedTime("");
        setCollectionTimingDraft(null);
        setChargeNowAmountMode("full");
        setHasChargeNowAmountModeChoice(false);
        setChargeNowSignalPercent(Math.max(0, signalPercentage ?? 30));
        setChargeNowCustomAmount("");
        setChargeNowMethodDraft(null);
        setChargeNowSignalValueConfirmed(false);
        setConfirmationSheetStep("review");
        setChargeBookingState(null);
        setChargeFlowError(null);
        setChargeNotificationsDispatched(false);
      }

      const service = services.find((s) => s.id === serviceId);
      if (service) {
        setDisplayedPrice(service.price.toFixed(2));
        if (!isEditing) {
          setServicePriceDraft(formatCurrencyInput(service.price));
        }
        if (service.accepts_home_visit) {
          if (isEditing) {
            setHasLocationChoice(true);
          } else {
            setHasLocationChoice(false);
            setIsHomeVisit(false);
            setDisplacementEstimate(null);
            setDisplacementStatus("idle");
            setDisplacementError(null);
            setManualDisplacementFee("");
          }
        } else {
          setHasLocationChoice(true);
          setIsHomeVisit(false);
          setDisplacementEstimate(null);
          setDisplacementStatus("idle");
          setDisplacementError(null);
          setManualDisplacementFee("");
        }
      } else {
        setDisplayedPrice("");
        if (!isEditing) {
          setServicePriceDraft("");
        }
        setHasLocationChoice(false);
        setIsHomeVisit(false);
        setDisplacementEstimate(null);
        setDisplacementStatus("idle");
        setDisplacementError(null);
        setManualDisplacementFee("");
      }
    },
    [
      isEditing,
      services,
      setSelectedServiceId,
      setPriceOverride,
      setFinanceExtraItems,
      setFinanceNewItemLabel,
      setFinanceNewItemAmount,
      setScheduleDiscountType,
      setScheduleDiscountValue,
      setSelectedDate,
      setSelectedTime,
      setCollectionTimingDraft,
      setChargeNowAmountMode,
      setHasChargeNowAmountModeChoice,
      setChargeNowSignalPercent,
      setChargeNowCustomAmount,
      setChargeNowMethodDraft,
      setChargeNowSignalValueConfirmed,
      setConfirmationSheetStep,
      setChargeBookingState,
      setChargeFlowError,
      setChargeNotificationsDispatched,
      signalPercentage,
      setDisplayedPrice,
      setServicePriceDraft,
      setHasLocationChoice,
      setIsHomeVisit,
      setDisplacementEstimate,
      setDisplacementStatus,
      setDisplacementError,
      setManualDisplacementFee,
    ]
  );

  const handleServiceChange: ChangeEventHandler<HTMLSelectElement> = useCallback(
    (event) => {
      applyServiceSelection(event.target.value);
    },
    [applyServiceSelection]
  );

  const handleClearSelectedService = useCallback(() => {
    applyServiceSelection("");
  }, [applyServiceSelection]);

  return {
    handleServiceChange,
    handleClearSelectedService,
  };
}
