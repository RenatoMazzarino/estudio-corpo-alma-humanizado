import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import { formatCurrencyLabel } from "../../../../src/shared/currency";
import { getRemainingSeconds } from "../../../../src/shared/datetime";
import {
  createBookingPixPayment,
  createBookingPointPayment,
  pollBookingPixPaymentStatus,
  pollBookingPointPaymentStatus,
} from "../appointment-actions";
import type {
  BookingPixPaymentData,
  BookingPointPaymentData,
  ChargeBookingState,
  ChargeNowMethodDraft,
  ChargePaymentStatus,
  ClientSelectionMode,
} from "../appointment-form.types";

interface UseAppointmentChargePaymentFlowParams {
  chargeBookingState: ChargeBookingState | null;
  chargeNowMethodDraft: ChargeNowMethodDraft | null;
  chargeNowDraftAmount: number;
  confirmationSheetStep: "review" | "creating_charge" | "charge_payment" | "charge_manual_prompt";
  chargePixPayment: BookingPixPaymentData | null;
  chargePointPayment: BookingPointPaymentData | null;
  chargePointAttempt: number;
  clientPublicFullNamePreview: string;
  clientName: string;
  resolvedClientPhone: string;
  clientPhone: string;
  clientEmail: string;
  selectedClientEmail: string | null;
  clientSelectionMode: ClientSelectionMode;
  selectedClientMessagingFirstName: string;
  clientFirstName: string;
  openWhatsappFromForm: (message: string) => boolean;
  showToast: (input: { title?: string; message: string; tone?: "success" | "error" | "warning" | "info"; durationMs?: number }) => void;
  refreshChargeBookingState: (appointmentId: string) => Promise<ChargeBookingState | null>;
  handleChargePaymentResolved: () => Promise<void>;
  setRunningChargeAction: Dispatch<SetStateAction<boolean>>;
  setChargeFlowError: Dispatch<SetStateAction<string | null>>;
  setChargePixAttempt: Dispatch<SetStateAction<number>>;
  setChargePixPayment: Dispatch<SetStateAction<BookingPixPaymentData | null>>;
  setChargePixRemainingSeconds: Dispatch<SetStateAction<number>>;
  setChargePointAttempt: Dispatch<SetStateAction<number>>;
  setChargePointPayment: Dispatch<SetStateAction<BookingPointPaymentData | null>>;
}

interface UseAppointmentChargePaymentFlowReturn {
  handleCreateChargePixNow: (attempt: number) => Promise<void>;
  handleCopyChargePixCode: () => Promise<void>;
  handleSendChargePixViaWhatsapp: () => void;
  handleStartChargeCard: (cardMode: "debit" | "credit") => Promise<void>;
  handleVerifyChargeCardNow: () => Promise<void>;
  handleVerifyChargePixNow: () => Promise<void>;
}

export function useAppointmentChargePaymentFlow({
  chargeBookingState,
  chargeNowMethodDraft,
  chargeNowDraftAmount,
  confirmationSheetStep,
  chargePixPayment,
  chargePointPayment,
  chargePointAttempt,
  clientPublicFullNamePreview,
  clientName,
  resolvedClientPhone,
  clientPhone,
  clientEmail,
  selectedClientEmail,
  clientSelectionMode,
  selectedClientMessagingFirstName,
  clientFirstName,
  openWhatsappFromForm,
  showToast,
  refreshChargeBookingState,
  handleChargePaymentResolved,
  setRunningChargeAction,
  setChargeFlowError,
  setChargePixAttempt,
  setChargePixPayment,
  setChargePixRemainingSeconds,
  setChargePointAttempt,
  setChargePointPayment,
}: UseAppointmentChargePaymentFlowParams): UseAppointmentChargePaymentFlowReturn {
  const handleChargeCreatePixPayment = useCallback(
    async (appointmentId: string, amount: number, attempt: number) => {
      const result = await createBookingPixPayment({
        appointmentId,
        amount,
        payerName: clientPublicFullNamePreview || clientName || "Cliente",
        payerPhone: resolvedClientPhone || clientPhone,
        payerEmail: clientEmail || selectedClientEmail || null,
        attempt,
      });
      if (!result.ok || !result.data) {
        return { ok: false as const };
      }
      return { ok: true as const, data: result.data as BookingPixPaymentData };
    },
    [
      clientEmail,
      clientName,
      clientPhone,
      clientPublicFullNamePreview,
      resolvedClientPhone,
      selectedClientEmail,
    ]
  );

  const handleChargePollPixStatus = useCallback(async (appointmentId: string) => {
    const result = await pollBookingPixPaymentStatus({ appointmentId });
    if (!result.ok) {
      return { ok: false as const, status: "pending" as ChargePaymentStatus };
    }
    return { ok: true as const, status: result.data.internal_status as ChargePaymentStatus };
  }, []);

  const handleChargeCreatePointPayment = useCallback(
    async (appointmentId: string, amount: number, cardMode: "debit" | "credit", attempt: number) => {
      const result = await createBookingPointPayment({
        appointmentId,
        amount,
        cardMode,
        attempt,
      });
      if (!result.ok || !result.data) {
        return { ok: false as const };
      }
      return { ok: true as const, data: result.data as BookingPointPaymentData };
    },
    []
  );

  const handleChargePollPointStatus = useCallback(async (appointmentId: string, orderId: string) => {
    const result = await pollBookingPointPaymentStatus({
      appointmentId,
      orderId,
    });
    if (!result.ok) {
      return { ok: false as const, status: "pending" as ChargePaymentStatus, paymentId: null };
    }
    return {
      ok: true as const,
      status: result.data.internal_status as ChargePaymentStatus,
      paymentId: result.data.id,
    };
  }, []);

  const handleCreateChargePixNow = useCallback(
    async (attempt: number) => {
      if (!chargeBookingState) return;
      setRunningChargeAction(true);
      setChargeFlowError(null);
      try {
        const result = await handleChargeCreatePixPayment(chargeBookingState.appointmentId, chargeNowDraftAmount, attempt);
        if (!result.ok) {
          setChargeFlowError("Não foi possível gerar o PIX agora.");
          return;
        }
        setChargePixAttempt(attempt);
        setChargePixPayment(result.data);
        setChargePixRemainingSeconds(getRemainingSeconds(result.data.expires_at));
      } finally {
        setRunningChargeAction(false);
      }
    },
    [
      chargeBookingState,
      chargeNowDraftAmount,
      handleChargeCreatePixPayment,
      setChargeFlowError,
      setChargePixAttempt,
      setChargePixPayment,
      setChargePixRemainingSeconds,
      setRunningChargeAction,
    ]
  );

  const handleCopyChargePixCode = useCallback(async () => {
    if (!chargePixPayment?.qr_code) return;
    try {
      await navigator.clipboard.writeText(chargePixPayment.qr_code);
      showToast({
        title: "PIX",
        message: "Código copiado.",
        tone: "success",
        durationMs: 1600,
      });
    } catch {
      showToast({
        title: "PIX",
        message: "Não foi possível copiar o código agora.",
        tone: "warning",
        durationMs: 2200,
      });
    }
  }, [chargePixPayment?.qr_code, showToast]);

  const handleSendChargePixViaWhatsapp = useCallback(() => {
    if (!chargePixPayment?.qr_code) {
      showToast({
        title: "PIX",
        message: "Gere o QR Code antes de enviar a chave por WhatsApp.",
        tone: "warning",
        durationMs: 2200,
      });
      return;
    }

    const firstName =
      clientSelectionMode === "existing"
        ? selectedClientMessagingFirstName || "cliente"
        : clientFirstName.trim() || "cliente";
    const pixAmountLabel = formatCurrencyLabel(chargeNowDraftAmount);
    const message = `Olá, ${firstName}! Segue a chave PIX para confirmar seu agendamento.\n\nValor: R$ ${pixAmountLabel}\n\nCódigo PIX (copia e cola):\n${chargePixPayment.qr_code}\n\nAssim que pagar, me avise por aqui.`;
    openWhatsappFromForm(message);
  }, [
    chargeNowDraftAmount,
    chargePixPayment?.qr_code,
    clientFirstName,
    clientSelectionMode,
    openWhatsappFromForm,
    selectedClientMessagingFirstName,
    showToast,
  ]);

  const handleVerifyChargePixNow = useCallback(async () => {
    if (!chargeBookingState) return;
    const result = await handleChargePollPixStatus(chargeBookingState.appointmentId);
    if (!result.ok) return;
    if (result.status === "failed") {
      setChargeFlowError("O PIX não foi aprovado. Gere um novo QR Code para continuar.");
      return;
    }
    if (result.status === "paid") {
      await refreshChargeBookingState(chargeBookingState.appointmentId);
      setChargePixPayment(null);
      await handleChargePaymentResolved();
    }
  }, [
    chargeBookingState,
    handleChargePaymentResolved,
    handleChargePollPixStatus,
    refreshChargeBookingState,
    setChargeFlowError,
    setChargePixPayment,
  ]);

  const handleStartChargeCard = useCallback(
    async (cardMode: "debit" | "credit") => {
      if (!chargeBookingState) return;
      setRunningChargeAction(true);
      setChargeFlowError(null);
      try {
        const nextAttempt = chargePointAttempt + 1;
        const result = await handleChargeCreatePointPayment(
          chargeBookingState.appointmentId,
          chargeNowDraftAmount,
          cardMode,
          nextAttempt
        );
        if (!result.ok) {
          setChargeFlowError("Não foi possível iniciar a cobrança no cartão.");
          return;
        }
        setChargePointAttempt(nextAttempt);
        setChargePointPayment(result.data);
        if (result.data.internal_status === "paid") {
          await refreshChargeBookingState(chargeBookingState.appointmentId);
          setChargePointPayment(null);
          await handleChargePaymentResolved();
        }
        if (result.data.internal_status === "failed") {
          setChargeFlowError("A maquininha recusou a cobrança. Tente novamente.");
        }
      } finally {
        setRunningChargeAction(false);
      }
    },
    [
      chargeBookingState,
      chargeNowDraftAmount,
      chargePointAttempt,
      handleChargeCreatePointPayment,
      handleChargePaymentResolved,
      refreshChargeBookingState,
      setChargeFlowError,
      setChargePointAttempt,
      setChargePointPayment,
      setRunningChargeAction,
    ]
  );

  const handleVerifyChargeCardNow = useCallback(async () => {
    if (!chargeBookingState || !chargePointPayment) return;
    const result = await handleChargePollPointStatus(chargeBookingState.appointmentId, chargePointPayment.order_id);
    if (!result.ok) return;
    if (result.status === "failed") {
      setChargeFlowError("Cobrança não concluída na maquininha. Tente novamente.");
      return;
    }
    if (result.status === "paid") {
      await refreshChargeBookingState(chargeBookingState.appointmentId);
      setChargePointPayment(null);
      await handleChargePaymentResolved();
    }
  }, [
    chargeBookingState,
    chargePointPayment,
    handleChargePaymentResolved,
    handleChargePollPointStatus,
    refreshChargeBookingState,
    setChargeFlowError,
    setChargePointPayment,
  ]);

  useEffect(() => {
    if (!chargePixPayment) {
      setChargePixRemainingSeconds(0);
      return;
    }
    setChargePixRemainingSeconds(getRemainingSeconds(chargePixPayment.expires_at));
    const interval = window.setInterval(() => {
      setChargePixRemainingSeconds(getRemainingSeconds(chargePixPayment.expires_at));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [chargePixPayment, setChargePixRemainingSeconds]);

  useEffect(() => {
    if (confirmationSheetStep !== "charge_payment") return;
    if (chargeNowMethodDraft !== "pix_mp") return;
    if (!chargeBookingState || !chargePixPayment) return;

    const interval = window.setInterval(() => {
      void handleVerifyChargePixNow();
    }, 4000);
    return () => window.clearInterval(interval);
  }, [
    chargeBookingState,
    chargeNowMethodDraft,
    chargePixPayment,
    confirmationSheetStep,
    handleVerifyChargePixNow,
  ]);

  useEffect(() => {
    if (confirmationSheetStep !== "charge_payment") return;
    if (chargeNowMethodDraft !== "card") return;
    if (!chargeBookingState || !chargePointPayment) return;

    const interval = window.setInterval(() => {
      void handleVerifyChargeCardNow();
    }, 3500);
    return () => window.clearInterval(interval);
  }, [
    chargeBookingState,
    chargeNowMethodDraft,
    chargePointPayment,
    confirmationSheetStep,
    handleVerifyChargeCardNow,
  ]);

  return {
    handleCreateChargePixNow,
    handleCopyChargePixCode,
    handleSendChargePixViaWhatsapp,
    handleStartChargeCard,
    handleVerifyChargeCardNow,
    handleVerifyChargePixNow,
  };
}
