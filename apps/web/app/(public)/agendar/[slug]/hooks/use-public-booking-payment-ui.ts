import { useMemo } from "react";
import { formatCountdown } from "../booking-flow-formatters";
import { computePixProgress, resolveSignalPercentage } from "../booking-flow.helpers";
import { cardProcessingStages } from "../booking-flow-config";
import type { PaymentMethod, Step } from "../booking-flow.types";

interface UsePublicBookingPaymentUiParams {
  totalPrice: number;
  signalPercentage?: number | null;
  pixPayment:
    | {
        created_at: string;
        expires_at: string;
      }
    | null;
  pixNowMs: number;
  step: Step;
  paymentMethod: PaymentMethod;
  cardStatus: "idle" | "loading" | "error";
  cardAwaitingConfirmation: boolean;
  cardProcessingStageIndex: number;
}

export function usePublicBookingPaymentUi(params: UsePublicBookingPaymentUiParams) {
  const {
    totalPrice,
    signalPercentage,
    pixPayment,
    pixNowMs,
    step,
    paymentMethod,
    cardStatus,
    cardAwaitingConfirmation,
    cardProcessingStageIndex,
  } = params;

  const normalizedSignalPercentage = useMemo(
    () => resolveSignalPercentage(signalPercentage),
    [signalPercentage]
  );
  const signalAmount = useMemo(
    () => Number((totalPrice * (normalizedSignalPercentage / 100)).toFixed(2)),
    [normalizedSignalPercentage, totalPrice]
  );
  const payableSignalAmount = useMemo(() => Number(signalAmount.toFixed(2)), [signalAmount]);
  const isMercadoPagoMinimumInvalid = payableSignalAmount > 0 && payableSignalAmount < 1;

  const pixProgress = useMemo(
    () =>
      computePixProgress({
        createdAt: pixPayment?.created_at ?? null,
        expiresAt: pixPayment?.expires_at ?? null,
        nowMs: pixNowMs,
      }),
    [pixNowMs, pixPayment?.created_at, pixPayment?.expires_at]
  );
  const pixRemainingMs = pixProgress.remainingMs;
  const pixProgressPct = pixProgress.progressPct;
  const pixQrExpired = pixProgress.isExpired;
  const pixRemainingLabel = formatCountdown(pixRemainingMs);

  const showCardProcessingOverlay =
    step === "PAYMENT" &&
    paymentMethod === "card" &&
    (cardStatus === "loading" || cardAwaitingConfirmation);
  const currentCardProcessingStage =
    cardProcessingStages[Math.min(cardProcessingStageIndex, cardProcessingStages.length - 1)] ??
    cardProcessingStages[0];

  return {
    normalizedSignalPercentage,
    signalAmount,
    payableSignalAmount,
    isMercadoPagoMinimumInvalid,
    pixProgressPct,
    pixQrExpired,
    pixRemainingLabel,
    showCardProcessingOverlay,
    currentCardProcessingStage,
  };
}
