
import { useState } from "react";
import { buildDraftItemId } from "../appointment-form.helpers";
import { parseDecimalInput } from "../../../../src/shared/currency";
import type {
  BookingConfirmationStep,
  BookingPixPaymentData,
  BookingPointPaymentData,
  ChargeBookingState,
  ChargeNowAmountMode,
  ChargeNowMethodDraft,
  CollectionTimingDraft,
  FinanceDraftItem,
} from "../appointment-form.types";

type Params = {
  isEditing: boolean;
  signalPercentage?: number;
};

export function useAppointmentFinanceState({ isEditing, signalPercentage }: Params) {
  const [financeExtraItems, setFinanceExtraItems] = useState<FinanceDraftItem[]>([]);
  const [financeNewItemLabel, setFinanceNewItemLabel] = useState("");
  const [financeNewItemAmount, setFinanceNewItemAmount] = useState<string>("");
  const [scheduleDiscountType, setScheduleDiscountType] = useState<"value" | "pct">("value");
  const [scheduleDiscountValue, setScheduleDiscountValue] = useState<string>("");
  const [collectionTimingDraft, setCollectionTimingDraft] = useState<CollectionTimingDraft | null>(
    isEditing ? "at_attendance" : null
  );
  const [chargeNowAmountMode, setChargeNowAmountMode] = useState<ChargeNowAmountMode>("full");
  const [hasChargeNowAmountModeChoice, setHasChargeNowAmountModeChoice] = useState<boolean>(isEditing);
  const [chargeNowSignalPercent, setChargeNowSignalPercent] = useState<number>(Math.max(0, signalPercentage ?? 30));
  const [chargeNowCustomAmount, setChargeNowCustomAmount] = useState<string>("");
  const [chargeNowMethodDraft, setChargeNowMethodDraft] = useState<ChargeNowMethodDraft | null>(null);
  const [chargeNowSignalValueConfirmed, setChargeNowSignalValueConfirmed] = useState(false);
  const [confirmationSheetStep, setConfirmationSheetStep] = useState<BookingConfirmationStep>("review");
  const [creatingChargeBooking, setCreatingChargeBooking] = useState(false);
  const [runningChargeAction, setRunningChargeAction] = useState(false);
  const [chargeBookingState, setChargeBookingState] = useState<ChargeBookingState | null>(null);
  const [chargePixPayment, setChargePixPayment] = useState<BookingPixPaymentData | null>(null);
  const [chargePixAttempt, setChargePixAttempt] = useState(0);
  const [chargePixRemainingSeconds, setChargePixRemainingSeconds] = useState(0);
  const [chargePointPayment, setChargePointPayment] = useState<BookingPointPaymentData | null>(null);
  const [chargePointAttempt, setChargePointAttempt] = useState(0);
  const [chargeFlowError, setChargeFlowError] = useState<string | null>(null);
  const [chargeNotificationsDispatched, setChargeNotificationsDispatched] = useState(false);
  const [finishingChargeFlow, setFinishingChargeFlow] = useState(false);

  const handleAddFinanceItem = () => {
    const label = financeNewItemLabel.trim();
    const amount = Math.max(0, parseDecimalInput(financeNewItemAmount) ?? 0);
    if (!label) return;
    setFinanceExtraItems((current) => [
      ...current,
      {
        id: buildDraftItemId(),
        type: "addon",
        label,
        qty: 1,
        amount,
      },
    ]);
    setFinanceNewItemLabel("");
    setFinanceNewItemAmount("");
  };

  const handleRemoveFinanceItem = (itemId: string) => {
    setFinanceExtraItems((current) => current.filter((item) => item.id !== itemId));
  };

  return {
    financeExtraItems,
    setFinanceExtraItems,
    financeNewItemLabel,
    setFinanceNewItemLabel,
    financeNewItemAmount,
    setFinanceNewItemAmount,
    scheduleDiscountType,
    setScheduleDiscountType,
    scheduleDiscountValue,
    setScheduleDiscountValue,
    collectionTimingDraft,
    setCollectionTimingDraft,
    chargeNowAmountMode,
    setChargeNowAmountMode,
    hasChargeNowAmountModeChoice,
    setHasChargeNowAmountModeChoice,
    chargeNowSignalPercent,
    setChargeNowSignalPercent,
    chargeNowCustomAmount,
    setChargeNowCustomAmount,
    chargeNowMethodDraft,
    setChargeNowMethodDraft,
    chargeNowSignalValueConfirmed,
    setChargeNowSignalValueConfirmed,
    confirmationSheetStep,
    setConfirmationSheetStep,
    creatingChargeBooking,
    setCreatingChargeBooking,
    runningChargeAction,
    setRunningChargeAction,
    chargeBookingState,
    setChargeBookingState,
    chargePixPayment,
    setChargePixPayment,
    chargePixAttempt,
    setChargePixAttempt,
    chargePixRemainingSeconds,
    setChargePixRemainingSeconds,
    chargePointPayment,
    setChargePointPayment,
    chargePointAttempt,
    setChargePointAttempt,
    chargeFlowError,
    setChargeFlowError,
    chargeNotificationsDispatched,
    setChargeNotificationsDispatched,
    finishingChargeFlow,
    setFinishingChargeFlow,
    handleAddFinanceItem,
    handleRemoveFinanceItem,
  };
}

