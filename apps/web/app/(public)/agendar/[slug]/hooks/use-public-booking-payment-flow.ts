
import { useCallback, useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { CardFormInstance, PaymentMethod, Service, Step } from "../booking-flow.types";
import { createPixPayment, submitPublicAppointment } from "../application/public-booking-service";
import { feedbackById, feedbackFromError } from "../../../../../src/shared/feedback/user-feedback";

type PixPaymentData = {
  id: string;
  status: string;
  ticket_url: string | null;
  qr_code: string | null;
  qr_code_base64: string | null;
  transaction_amount: number;
  created_at: string;
  expires_at: string;
};

type UsePublicBookingPaymentFlowParams = {
  tenantId: string;
  tenantSlug: string;
  selectedService: Service | null;
  step: Step;
  date: string;
  selectedTime: string;
  resolvedClientFullName: string;
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  normalizedClientEmail: string;
  clientCpf: string;
  isHomeVisit: boolean;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  displacementEstimate: { fee?: number; distanceKm?: number } | null;
  isEmailValid: boolean;
  isPhoneValid: boolean;
  appointmentId: string | null;
  setAppointmentId: (value: string | null) => void;
  protocol: string;
  setProtocol: (value: string) => void;
  setIsSubmitting: (value: boolean) => void;
  pixPayment: PixPaymentData | null;
  setPixPayment: (value: PixPaymentData | null) => void;
  pixAttempt: number;
  setPixAttempt: (value: number) => void;
  pixStatus: "idle" | "loading" | "error";
  setPixStatus: (value: "idle" | "loading" | "error") => void;
  setPixError: Dispatch<SetStateAction<string | null>>;
  setPixNowMs: (value: number) => void;
  pixQrExpired: boolean;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (value: PaymentMethod) => void;
  payableSignalAmount: number;
  setCardStatus: (value: "idle" | "loading" | "error") => void;
  setCardError: (value: string | null) => void;
  setCardAwaitingConfirmation: (value: boolean) => void;
  showCardProcessingOverlay: boolean;
  setCardProcessingStageIndex: (value: number | ((prev: number) => number)) => void;
  setIsVoucherOpen: (value: boolean) => void;
  resetIdentityState: (options: { clearPhone: boolean; resetFlow: boolean; clearSuggestedClient: boolean }) => void;
  showToast: (feedback: { title?: string; message: string; tone?: "success" | "warning" | "error" | "info"; durationMs?: number }) => void;
  cardProcessingStagesLength: number;
  cardFormRef: MutableRefObject<CardFormInstance | null>;
  cardSubmitInFlightRef: MutableRefObject<boolean>;
  pixAutoRefreshByPaymentRef: MutableRefObject<string | null>;
  onClearCardSdk: () => void;
};

export function usePublicBookingPaymentFlow({
  tenantId,
  tenantSlug,
  selectedService,
  step,
  date,
  selectedTime,
  resolvedClientFullName,
  clientFirstName,
  clientLastName,
  clientPhone,
  normalizedClientEmail,
  clientCpf,
  isHomeVisit,
  cep,
  logradouro,
  numero,
  complemento,
  bairro,
  cidade,
  estado,
  displacementEstimate,
  isEmailValid,
  isPhoneValid,
  appointmentId,
  setAppointmentId,
  protocol,
  setProtocol,
  setIsSubmitting,
  pixPayment,
  setPixPayment,
  pixAttempt,
  setPixAttempt,
  pixStatus,
  setPixStatus,
  setPixError,
  setPixNowMs,
  pixQrExpired,
  paymentMethod,
  setPaymentMethod,
  payableSignalAmount,
  setCardStatus,
  setCardError,
  setCardAwaitingConfirmation,
  showCardProcessingOverlay,
  setCardProcessingStageIndex,
  setIsVoucherOpen,
  resetIdentityState,
  showToast,
  cardProcessingStagesLength,
  cardFormRef,
  cardSubmitInFlightRef,
  pixAutoRefreshByPaymentRef,
  onClearCardSdk,
}: UsePublicBookingPaymentFlowParams) {
  const ensureAppointment = useCallback(async () => {
    if (appointmentId) return appointmentId;
    if (
      !selectedService ||
      !date ||
      !selectedTime ||
      !resolvedClientFullName ||
      !isEmailValid ||
      !isPhoneValid
    ) {
      return null;
    }

    setIsSubmitting(true);
    try {
      const result = await submitPublicAppointment({
        tenantSlug,
        serviceId: selectedService.id,
        date,
        time: selectedTime,
        clientName: resolvedClientFullName,
        clientFirstName: clientFirstName.trim(),
        clientLastName: clientLastName.trim(),
        clientPhone,
        clientEmail: normalizedClientEmail,
        clientCpf,
        isHomeVisit,
        addressCep: cep,
        addressLogradouro: logradouro,
        addressNumero: numero,
        addressComplemento: complemento,
        addressBairro: bairro,
        addressCidade: cidade,
        addressEstado: estado,
        displacementFee: displacementEstimate?.fee,
        displacementDistanceKm: displacementEstimate?.distanceKm,
      });
      if (!result.ok) {
        showToast(feedbackFromError(result.error, "public_booking"));
        return null;
      }
      const createdId = result.data.appointmentId ?? null;
      setAppointmentId(createdId);
      showToast(feedbackById("booking_created", { durationMs: 1800 }));
      return createdId;
    } catch (error) {
      showToast(feedbackFromError(error, "public_booking"));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    appointmentId,
    bairro,
    cep,
    cidade,
    clientCpf,
    clientFirstName,
    clientLastName,
    normalizedClientEmail,
    clientPhone,
    complemento,
    date,
    displacementEstimate?.distanceKm,
    displacementEstimate?.fee,
    estado,
    isHomeVisit,
    isEmailValid,
    isPhoneValid,
    logradouro,
    numero,
    resolvedClientFullName,
    selectedService,
    selectedTime,
    setAppointmentId,
    setIsSubmitting,
    showToast,
    tenantSlug,
  ]);

  const handleCopyPix = useCallback(async () => {
    try {
      if (!pixPayment?.qr_code) {
        showToast(feedbackById("payment_pix_copy_unavailable"));
        return;
      }
      await navigator.clipboard.writeText(pixPayment.qr_code);
      showToast(feedbackById("payment_pix_copy_success", { durationMs: 1600 }));
    } catch {
      showToast(feedbackById("payment_pix_copy_unavailable"));
    }
  }, [pixPayment?.qr_code, showToast]);

  const handleCreatePix = useCallback(
    async (options?: { attempt?: number }) => {
      if (!selectedService) return;
      const ensuredId = appointmentId ?? (await ensureAppointment());
      if (!ensuredId) return;
      const normalizedAttempt =
        Number.isFinite(options?.attempt) && Number(options?.attempt) >= 0
          ? Math.floor(Number(options?.attempt))
          : pixAttempt;
      setPixStatus("loading");
      setPixError((current) => (current?.toLowerCase().includes("expirou") ? current : null));
      try {
        const result = await createPixPayment({
          appointmentId: ensuredId,
          tenantId,
          amount: payableSignalAmount,
          payerEmail: normalizedClientEmail,
          payerName: resolvedClientFullName,
          payerPhone: clientPhone,
          attempt: normalizedAttempt,
        });
        if (!result.ok) {
          setPixStatus("error");
          const feedback = feedbackFromError(result.error, "payment_pix");
          setPixError(feedback.message);
          showToast(feedback);
          return;
        }
        pixAutoRefreshByPaymentRef.current = null;
        setPixPayment(result.data);
        setPixNowMs(Date.now());
        setPixStatus("idle");
        if (normalizedAttempt === 0) {
          showToast(feedbackById("payment_pix_generated", { durationMs: 2200 }));
        }
      } catch {
        setPixStatus("error");
        const feedback = feedbackById("payment_service_unavailable");
        setPixError(feedback.message);
        showToast(feedback);
      }
    },
    [
      appointmentId,
      clientPhone,
      ensureAppointment,
      normalizedClientEmail,
      payableSignalAmount,
      pixAttempt,
      pixAutoRefreshByPaymentRef,
      resolvedClientFullName,
      selectedService,
      setPixError,
      setPixNowMs,
      setPixPayment,
      setPixStatus,
      showToast,
      tenantId,
    ]
  );

  useEffect(() => {
    if (paymentMethod === "pix") {
      setCardError(null);
      setCardStatus("idle");
      setCardAwaitingConfirmation(false);
    }
    if (paymentMethod === "card") {
      setPixPayment(null);
      setPixError(null);
      setPixStatus("idle");
    }
  }, [paymentMethod, setCardAwaitingConfirmation, setCardError, setCardStatus, setPixError, setPixPayment, setPixStatus]);

  useEffect(() => {
    if (!showCardProcessingOverlay) {
      setCardProcessingStageIndex(0);
      return;
    }

    setCardProcessingStageIndex(0);
    const interval = window.setInterval(() => {
      setCardProcessingStageIndex((current) => Math.min(current + 1, cardProcessingStagesLength - 1));
    }, 1700);

    return () => {
      window.clearInterval(interval);
    };
  }, [cardProcessingStagesLength, setCardProcessingStageIndex, showCardProcessingOverlay]);

  useEffect(() => {
    if (step !== "PAYMENT" || paymentMethod !== "pix" || pixStatus !== "idle" || pixPayment) return;
    void handleCreatePix({ attempt: pixAttempt });
  }, [handleCreatePix, paymentMethod, pixAttempt, pixPayment, pixStatus, step]);

  useEffect(() => {
    if (step !== "PAYMENT" || paymentMethod !== "pix" || !pixPayment || !pixQrExpired || pixStatus === "loading") return;
    if (pixAutoRefreshByPaymentRef.current === pixPayment.id) return;

    pixAutoRefreshByPaymentRef.current = pixPayment.id;
    const nextAttempt = pixAttempt + 1;
    setPixAttempt(nextAttempt);
    setPixError("QR Code expirou. Gerando um novo Pix automaticamente...");
    showToast(feedbackById("payment_pix_expired_regenerating"));
    void handleCreatePix({ attempt: nextAttempt });
  }, [handleCreatePix, paymentMethod, pixAttempt, pixAutoRefreshByPaymentRef, pixPayment, pixQrExpired, pixStatus, setPixAttempt, setPixError, showToast, step]);

  useEffect(() => {
    if (step !== "PAYMENT" || paymentMethod !== "pix" || !pixPayment) return;
    setPixNowMs(Date.now());
    const interval = window.setInterval(() => {
      setPixNowMs(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [paymentMethod, pixPayment, setPixNowMs, step]);

  useEffect(() => {
    if (!appointmentId) {
      setProtocol("");
      return;
    }
    setProtocol(`AGD-${appointmentId.slice(0, 6).toUpperCase()}`);
  }, [appointmentId, setProtocol]);

  const handleSelectPayment = useCallback(
    (method: PaymentMethod) => {
      if (method === paymentMethod) return;
      if (method === "pix") {
        try {
          cardFormRef.current?.unmount?.();
        } catch {
          // ignore SDK teardown errors
        }
        cardFormRef.current = null;
        cardSubmitInFlightRef.current = false;
        onClearCardSdk();
        setCardError(null);
        setCardStatus("idle");
      }
      if (method === "card") {
        setPixError(null);
        setPixStatus("idle");
      }
      setPaymentMethod(method);
    },
    [
      cardFormRef,
      cardSubmitInFlightRef,
      onClearCardSdk,
      paymentMethod,
      setCardError,
      setCardStatus,
      setPaymentMethod,
      setPixError,
      setPixStatus,
    ]
  );

  const handleReset = useCallback(() => {
    resetIdentityState({ clearPhone: true, resetFlow: true, clearSuggestedClient: true });
    setAppointmentId(null);
    setProtocol("");
    setPixPayment(null);
    setPixStatus("idle");
    setPixError(null);
    setPixAttempt(0);
    pixAutoRefreshByPaymentRef.current = null;
    setPaymentMethod(null);
    setCardStatus("idle");
    setCardError(null);
    setIsVoucherOpen(false);
  }, [
    pixAutoRefreshByPaymentRef,
    resetIdentityState,
    setAppointmentId,
    setCardError,
    setCardStatus,
    setIsVoucherOpen,
    setPaymentMethod,
    setPixAttempt,
    setPixError,
    setPixPayment,
    setPixStatus,
    setProtocol,
  ]);

  return {
    protocol,
    ensureAppointment,
    handleCopyPix,
    handleCreatePix,
    handleSelectPayment,
    handleReset,
  };
}
