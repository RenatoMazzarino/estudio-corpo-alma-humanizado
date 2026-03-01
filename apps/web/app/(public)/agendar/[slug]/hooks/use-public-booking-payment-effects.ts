import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { createCardPayment, getCardPaymentStatus, getPixPaymentStatus } from "../application/public-booking-service";
import { feedbackById, feedbackFromError } from "../../../../../src/shared/feedback/user-feedback";
import type {
  CardFormInstance,
  MercadoPagoConstructor,
  PaymentMethod,
  Service,
  Step,
} from "../booking-flow.types";
import type { ToastInput } from "../../../../../components/ui/toast";

interface UsePublicBookingPaymentEffectsParams {
  step: Step;
  paymentMethod: PaymentMethod;
  appointmentId: string | null;
  tenantId: string;
  pixPayment: { id: string } | null;
  cardAwaitingConfirmation: boolean;
  showToast: (input: string | ToastInput) => void;
  setStep: Dispatch<SetStateAction<Step>>;
  setPixStatus: Dispatch<SetStateAction<"idle" | "loading" | "error">>;
  setPixError: Dispatch<SetStateAction<string | null>>;
  setCardAwaitingConfirmation: Dispatch<SetStateAction<boolean>>;
  setCardStatus: Dispatch<SetStateAction<"idle" | "loading" | "error">>;
  setCardError: Dispatch<SetStateAction<string | null>>;
  pixFailureStatusRef: MutableRefObject<string | null>;
  cardFailureStatusRef: MutableRefObject<string | null>;
  cardFormRef: MutableRefObject<CardFormInstance | null>;
  cardSubmitInFlightRef: MutableRefObject<boolean>;
  mpInitToastShownRef: MutableRefObject<boolean>;
  mercadoPagoPublicKey: string | null;
  mpReady: boolean;
  payableSignalAmount: number;
  selectedService: Service | null;
  ensureAppointment: () => Promise<string | null>;
  normalizedClientEmail: string;
  resolvedClientFullName: string;
  clientPhone: string;
}

export function usePublicBookingPaymentEffects({
  step,
  paymentMethod,
  appointmentId,
  tenantId,
  pixPayment,
  cardAwaitingConfirmation,
  showToast,
  setStep,
  setPixStatus,
  setPixError,
  setCardAwaitingConfirmation,
  setCardStatus,
  setCardError,
  pixFailureStatusRef,
  cardFailureStatusRef,
  cardFormRef,
  cardSubmitInFlightRef,
  mpInitToastShownRef,
  mercadoPagoPublicKey,
  mpReady,
  payableSignalAmount,
  selectedService,
  ensureAppointment,
  normalizedClientEmail,
  resolvedClientFullName,
  clientPhone,
}: UsePublicBookingPaymentEffectsParams) {
  useEffect(() => {
    if (step !== "PAYMENT" || paymentMethod !== "pix" || !appointmentId || !pixPayment) {
      return;
    }

    let active = true;
    const poll = async () => {
      const result = await getPixPaymentStatus({
        appointmentId,
        tenantId,
      });
      if (!active || !result.ok) return;

      if (result.data.internal_status === "paid") {
        setPixError(null);
        pixFailureStatusRef.current = null;
        setStep("SUCCESS");
        return;
      }
      if (result.data.internal_status === "failed") {
        setPixStatus("error");
        setPixError("O Pix não foi aprovado. Volte e gere um novo pagamento.");
        if (pixFailureStatusRef.current !== "failed") {
          pixFailureStatusRef.current = "failed";
          showToast(feedbackById("payment_pix_failed", { kind: "banner", durationMs: 3200 }));
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 4000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [
    appointmentId,
    paymentMethod,
    pixFailureStatusRef,
    pixPayment,
    setPixError,
    setPixStatus,
    setStep,
    showToast,
    step,
    tenantId,
  ]);

  useEffect(() => {
    if (step !== "PAYMENT" || paymentMethod !== "card" || !appointmentId || !cardAwaitingConfirmation) {
      return;
    }

    let active = true;
    const poll = async () => {
      const result = await getCardPaymentStatus({
        appointmentId,
        tenantId,
      });
      if (!active || !result.ok) return;

      if (result.data.internal_status === "paid") {
        setCardAwaitingConfirmation(false);
        setCardError(null);
        cardFailureStatusRef.current = null;
        setStep("SUCCESS");
        return;
      }
      if (result.data.internal_status === "failed") {
        setCardAwaitingConfirmation(false);
        setCardStatus("error");
        setCardError("Pagamento recusado. Tente novamente com outro cartão.");
        if (cardFailureStatusRef.current !== "failed") {
          cardFailureStatusRef.current = "failed";
          showToast(feedbackById("payment_card_declined", { kind: "banner", durationMs: 3200 }));
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [
    appointmentId,
    cardAwaitingConfirmation,
    cardFailureStatusRef,
    paymentMethod,
    setCardAwaitingConfirmation,
    setCardError,
    setCardStatus,
    setStep,
    showToast,
    step,
    tenantId,
  ]);

  useEffect(() => {
    if (step !== "PAYMENT" || paymentMethod !== "card") {
      try {
        cardFormRef.current?.unmount?.();
      } catch {
        // ignore SDK teardown errors
      }
      cardFormRef.current = null;
      return;
    }
    const publicKey = mercadoPagoPublicKey ?? null;
    if (!publicKey) {
      setCardError("Chave pública do Mercado Pago ausente.");
      if (!mpInitToastShownRef.current) {
        mpInitToastShownRef.current = true;
        showToast(feedbackById("payment_service_unavailable", { kind: "banner", durationMs: 3200 }));
      }
      return;
    }
    mpInitToastShownRef.current = false;
    if (!mpReady) return;
    if (!(window as Window & { MercadoPago?: MercadoPagoConstructor }).MercadoPago) {
      setCardError("Não foi possível carregar o formulário de cartão.");
      if (!mpInitToastShownRef.current) {
        mpInitToastShownRef.current = true;
        showToast(feedbackById("payment_service_unavailable", { kind: "banner", durationMs: 3200 }));
      }
      return;
    }
    try {
      cardFormRef.current?.unmount?.();
    } catch {
      // ignore SDK teardown errors
    }
    cardFormRef.current = null;
    const mp = new (window as Window & { MercadoPago: MercadoPagoConstructor }).MercadoPago(publicKey, {
      locale: "pt-BR",
    });
    cardFormRef.current = mp.cardForm({
      amount: payableSignalAmount.toFixed(2),
      iframe: true,
      form: {
        id: "mp-card-form",
        cardNumber: { id: "mp-card-number", placeholder: "Número do cartão" },
        expirationDate: { id: "mp-card-expiration", placeholder: "MM/AA" },
        securityCode: { id: "mp-card-security", placeholder: "CVC" },
        cardholderName: { id: "mp-cardholder-name", placeholder: "Nome no cartão" },
        issuer: { id: "mp-card-issuer", placeholder: "Banco emissor" },
        installments: { id: "mp-card-installments", placeholder: "Parcelas" },
        identificationType: { id: "mp-card-identification-type", placeholder: "Tipo" },
        identificationNumber: { id: "mp-card-identification-number", placeholder: "CPF" },
        cardholderEmail: { id: "mp-card-email", placeholder: "Email" },
      },
      callbacks: {
        onFormMounted: (error) => {
          if (error) {
            setCardError("Não foi possível carregar o formulário de cartão.");
            showToast(feedbackById("payment_service_unavailable"));
          }
        },
        onSubmit: async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (cardSubmitInFlightRef.current) {
            return;
          }
          if (!selectedService) return;
          cardSubmitInFlightRef.current = true;
          const data = cardFormRef.current?.getCardFormData();
          if (!data?.token || !data.paymentMethodId) {
            const feedback = feedbackById("validation_required_fields");
            setCardError(feedback.message);
            showToast(feedback);
            setCardAwaitingConfirmation(false);
            cardSubmitInFlightRef.current = false;
            return;
          }
          setCardStatus("loading");
          setCardError(null);
          const ensuredId = appointmentId ?? (await ensureAppointment());
          if (!ensuredId) {
            setCardStatus("error");
            const feedback = feedbackById("booking_create_failed");
            setCardError(feedback.message);
            showToast(feedback);
            setCardAwaitingConfirmation(false);
            cardSubmitInFlightRef.current = false;
            return;
          }
          let result;
          try {
            result = await createCardPayment({
              appointmentId: ensuredId,
              tenantId,
              amount: payableSignalAmount,
              token: data.token,
              paymentMethodId: data.paymentMethodId,
              installments: Number(data.installments) || 1,
              payerEmail: data.cardholderEmail || normalizedClientEmail,
              payerName: resolvedClientFullName,
              payerPhone: clientPhone,
              identificationType: data.identificationType,
              identificationNumber: data.identificationNumber,
            });
          } catch (error) {
            console.error("[booking-flow] card payment submit failed", error);
            setCardStatus("error");
            const feedback = feedbackFromError(error, "payment_card");
            setCardError(feedback.message);
            showToast(feedback);
            setCardAwaitingConfirmation(false);
            cardSubmitInFlightRef.current = false;
            return;
          }

          if (!result.ok) {
            setCardStatus("error");
            const feedback = feedbackFromError(result.error, "payment_card");
            setCardError(feedback.message);
            showToast(feedback);
            setCardAwaitingConfirmation(false);
            cardSubmitInFlightRef.current = false;
            return;
          }
          if (result.data.internal_status === "paid") {
            setCardStatus("idle");
            setCardAwaitingConfirmation(false);
            showToast(feedbackById("payment_recorded", { durationMs: 1800 }));
            setStep("SUCCESS");
          } else if (result.data.internal_status === "failed") {
            setCardStatus("error");
            setCardAwaitingConfirmation(false);
            setCardError("Pagamento recusado. Tente novamente com outro cartão.");
            showToast(feedbackById("payment_card_declined", { kind: "banner", durationMs: 3200 }));
          } else {
            setCardStatus("idle");
            setCardAwaitingConfirmation(true);
            setCardError("Pagamento em processamento. Você receberá a confirmação assim que for aprovado.");
            showToast(feedbackById("payment_pending"));
          }
          cardSubmitInFlightRef.current = false;
        },
      },
    });

    return () => {
      try {
        cardFormRef.current?.unmount?.();
      } catch {
        // ignore SDK teardown errors
      }
      cardFormRef.current = null;
      cardSubmitInFlightRef.current = false;
    };
  }, [
    appointmentId,
    cardFormRef,
    cardSubmitInFlightRef,
    clientPhone,
    ensureAppointment,
    mercadoPagoPublicKey,
    mpInitToastShownRef,
    mpReady,
    normalizedClientEmail,
    payableSignalAmount,
    paymentMethod,
    resolvedClientFullName,
    selectedService,
    setCardAwaitingConfirmation,
    setCardError,
    setCardStatus,
    setStep,
    showToast,
    step,
    tenantId,
  ]);
}
