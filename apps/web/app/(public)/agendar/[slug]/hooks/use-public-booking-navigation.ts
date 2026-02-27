import { useCallback, useMemo } from "react";
import { footerSteps } from "../booking-flow-config";
import type { PaymentMethod, Step } from "../booking-flow.types";

interface UsePublicBookingNavigationParams {
  step: Step;
  setStep: (step: Step) => void;
  isSubmitting: boolean;
  isPhoneValid: boolean;
  clientLookupStatus: "idle" | "loading" | "found" | "confirmed" | "declined" | "not_found";
  isEmailValid: boolean;
  isCpfValid: boolean;
  isIdentityNameReady: boolean;
  acceptPrivacyPolicy: boolean;
  acceptTermsOfService: boolean;
  acceptCommunicationConsent: boolean;
  selectedServiceId: string | null;
  date: string;
  selectedTime: string;
  addressComplete: boolean;
  displacementReady: boolean;
  paymentMethod: PaymentMethod;
  isMercadoPagoMinimumInvalid: boolean;
}

export function usePublicBookingNavigation(params: UsePublicBookingNavigationParams) {
  const {
    step,
    setStep,
    isSubmitting,
    isPhoneValid,
    clientLookupStatus,
    isEmailValid,
    isCpfValid,
    isIdentityNameReady,
    acceptPrivacyPolicy,
    acceptTermsOfService,
    acceptCommunicationConsent,
    selectedServiceId,
    date,
    selectedTime,
    addressComplete,
    displacementReady,
    paymentMethod,
    isMercadoPagoMinimumInvalid,
  } = params;

  const handleNext = useCallback(() => {
    if (step === "CONFIRM") {
      setStep("PAYMENT");
      return;
    }
    const currentIndex = footerSteps.indexOf(step as (typeof footerSteps)[number]);
    if (currentIndex >= 0 && currentIndex < footerSteps.length - 1) {
      const nextStep = footerSteps[currentIndex + 1];
      if (nextStep) {
        setStep(nextStep);
      }
    }
  }, [setStep, step]);

  const handleBack = useCallback(() => {
    if (step === "IDENT") {
      setStep("WELCOME");
      return;
    }
    if (step === "PAYMENT") {
      setStep("CONFIRM");
      return;
    }
    const currentIndex = footerSteps.indexOf(step as (typeof footerSteps)[number]);
    if (currentIndex > 0) {
      const previousStep = footerSteps[currentIndex - 1];
      if (previousStep) {
        setStep(previousStep);
      }
    }
  }, [setStep, step]);

  const isNextDisabled = useMemo(() => {
    if (step === "IDENT") {
      if (!isPhoneValid) return true;
      if (clientLookupStatus === "loading") return true;
      if (clientLookupStatus === "confirmed") {
        return !isEmailValid;
      }
      if (clientLookupStatus === "found" || clientLookupStatus === "declined") {
        return true;
      }
      if (clientLookupStatus === "not_found") {
        return (
          !isPhoneValid ||
          !isCpfValid ||
          !isEmailValid ||
          !isIdentityNameReady ||
          !acceptPrivacyPolicy ||
          !acceptTermsOfService ||
          !acceptCommunicationConsent
        );
      }
      return true;
    }
    if (step === "SERVICE") {
      return !selectedServiceId;
    }
    if (step === "DATETIME") {
      return !date || !selectedTime;
    }
    if (step === "LOCATION") {
      return !addressComplete || !displacementReady;
    }
    if (step === "CONFIRM") {
      return isSubmitting || !paymentMethod || isMercadoPagoMinimumInvalid;
    }
    return false;
  }, [
    acceptCommunicationConsent,
    acceptPrivacyPolicy,
    acceptTermsOfService,
    addressComplete,
    clientLookupStatus,
    date,
    displacementReady,
    isCpfValid,
    isEmailValid,
    isIdentityNameReady,
    isMercadoPagoMinimumInvalid,
    isPhoneValid,
    isSubmitting,
    paymentMethod,
    selectedServiceId,
    selectedTime,
    step,
  ]);

  const nextLabel = step === "CONFIRM" ? "Ir para Pagamento" : "Continuar";
  const showFooter = step !== "WELCOME" && step !== "SUCCESS";
  const showNextButton = step !== "PAYMENT";

  return {
    handleNext,
    handleBack,
    isNextDisabled,
    nextLabel,
    showFooter,
    showNextButton,
  };
}
