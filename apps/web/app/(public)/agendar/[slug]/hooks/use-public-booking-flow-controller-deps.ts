import { useCallback } from "react";
import { resolvePositiveMinutes } from "../booking-flow.helpers";
import { feedbackById, feedbackFromError } from "../../../../../src/shared/feedback/user-feedback";
import { AppError } from "../../../../../src/shared/errors/AppError";
import { fail } from "../../../../../src/shared/errors/result";
import { usePublicCheckoutController } from "../../../../../src/modules/payments/public-checkout/use-public-checkout-controller";
import { usePublicBookingAvailability } from "../hooks/use-public-booking-availability";
import {
  createCardPayment as submitPublicCardPayment,
  createPixPayment as submitPublicPixPayment,
  getCardPaymentStatus as getPublicCardPaymentStatus,
  getPixPaymentStatus as getPublicPixPaymentStatus,
  submitPublicAppointment,
} from "../application/public-booking-service";
import { usePublicBookingFlowDerived } from "../hooks/use-public-booking-flow-derived";
import { usePublicBookingIdentity } from "../hooks/use-public-booking-identity";
import { usePublicBookingLocation } from "../hooks/use-public-booking-location";
import { usePublicBookingNavigation } from "../hooks/use-public-booking-navigation";
import { usePublicBookingPaymentUi } from "../hooks/use-public-booking-payment-ui";
import { usePublicBookingServiceActions } from "../hooks/use-public-booking-service-actions";
import { usePublicBookingVoucherActions } from "../hooks/use-public-booking-voucher-actions";
import type {
  BookingFlowProps,
} from "../booking-flow.types";
import type { usePublicBookingFlowState } from "./use-public-booking-flow-state";

type Params = {
  tenant: BookingFlowProps["tenant"];
  signalPercentage: BookingFlowProps["signalPercentage"];
  publicBookingCutoffBeforeCloseMinutes: BookingFlowProps["publicBookingCutoffBeforeCloseMinutes"];
  publicBookingLastSlotBeforeCloseMinutes: BookingFlowProps["publicBookingLastSlotBeforeCloseMinutes"];
  whatsappNumber: BookingFlowProps["whatsappNumber"];
  mercadoPagoPublicKey: BookingFlowProps["mercadoPagoPublicKey"];
  state: ReturnType<typeof usePublicBookingFlowState>;
};

export function usePublicBookingFlowControllerDeps({
  tenant,
  signalPercentage,
  publicBookingCutoffBeforeCloseMinutes,
  publicBookingLastSlotBeforeCloseMinutes,
  whatsappNumber,
  mercadoPagoPublicKey,
  state,
}: Params) {
  const {
    step,
    setStep,
    selectedService,
    setSelectedService,
    isHomeVisit,
    setIsHomeVisit,
    date,
    setDate,
    selectedTime,
    setSelectedTime,
    activeMonth,
    setActiveMonth,
    clientName,
    setClientName,
    clientFirstName,
    setClientFirstName,
    clientLastName,
    setClientLastName,
    clientEmail,
    setClientEmail,
    clientPhone,
    setClientPhone,
    clientCpf,
    setClientCpf,
    acceptPrivacyPolicy,
    setAcceptPrivacyPolicy,
    acceptTermsOfService,
    setAcceptTermsOfService,
    acceptCommunicationConsent,
    setAcceptCommunicationConsent,
    isSubmitting,
    setIsSubmitting,
    appointmentId,
    setAppointmentId,
    protocol,
    setProtocol,
    clientLookupStatus,
    setClientLookupStatus,
    showToast,
    phoneInputRef,
    voucherRef,
    setIsVoucherOpen,
    identityCpfAttempts,
    setIdentityCpfAttempts,
    setIdentityWelcomeCountdown,
    identitySecuritySessionId,
    setIdentitySecuritySessionId,
    setIdentityCaptchaPrompt,
    identityCaptchaToken,
    setIdentityCaptchaToken,
    identityCaptchaAnswer,
    setIdentityCaptchaAnswer,
    setIdentityGuardNotice,
    isVerifyingClientCpf,
    setIsVerifyingClientCpf,
    suggestedClient,
    setSuggestedClient,
  } = state;

  const {
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    setLogradouro,
    setNumero,
    setComplemento,
    setBairro,
    setCidade,
    useSuggestedAddress,
    addressMode,
    isAddressSearchModalOpen,
    setIsAddressSearchModalOpen,
    addressSearchQuery,
    setAddressSearchQuery,
    addressSearchResults,
    addressSearchLoading,
    displacementEstimate,
    displacementStatus,
    mapsQuery,
    hasSuggestedAddress,
    suggestedAddressSummary,
    addressComplete,
    displacementReady,
    closeAddressSearchModal,
    handleSelectAddressResult,
    handleSelectStudioLocation,
    handleSelectHomeVisitLocation,
    handleUseSuggestedAddress,
    handleChooseOtherAddress,
    handleSelectLocationAddressMode,
    handleLocationCepChange,
    handleLocationStateChange,
    handleCepLookup,
    resetLocationState,
    enforceStudioLocationOnly,
  } = usePublicBookingLocation({
    tenantSlug: tenant.slug,
    isHomeVisit,
    setIsHomeVisit,
    homeVisitAllowed: Boolean(selectedService?.accepts_home_visit),
    suggestedClient,
    showToast,
  });

  const {
    formattedPhoneDigits,
    isPhoneValid,
    normalizedCpfDigits,
    isCpfValid,
    normalizedClientEmail,
    isEmailValid,
    resolvedClientFullName,
    isIdentityNameReady,
    clientHeaderFirstName,
    totalPrice,
    selectedDateObj,
    suggestedClientPublicName,
    suggestedClientFirstName,
    suggestedClientInitials,
  } = usePublicBookingFlowDerived({
    clientPhone,
    clientCpf,
    clientEmail,
    clientName,
    clientFirstName,
    clientLastName,
    clientLookupStatus,
    selectedService,
    isHomeVisit,
    displacementFee: displacementEstimate?.fee ?? 0,
    date,
    suggestedClient,
  });

  const onlineCutoffBeforeCloseMinutes = resolvePositiveMinutes(publicBookingCutoffBeforeCloseMinutes, 60);
  const onlineLastSlotBeforeCloseMinutes = resolvePositiveMinutes(publicBookingLastSlotBeforeCloseMinutes, 30);

  const {
    availableSlots,
    handleChangeMonth,
    handleSelectDay,
    isDayDisabled,
    isLoadingDaySlots,
    resetAvailability,
  } = usePublicBookingAvailability({
    activeMonth,
    date,
    enabled: Boolean(selectedService?.id),
    isHomeVisit,
    onlineCutoffBeforeCloseMinutes,
    onlineLastSlotBeforeCloseMinutes,
    selectedServiceId: selectedService?.id ?? null,
    setActiveMonth,
    setDate,
    setSelectedTime,
    tenantId: tenant.id,
  });

  const {
    handleVerifyExistingClientCpf,
    handleSwitchAccount,
    handleIdentityPhoneChange,
    handleIdentityCpfChange,
    handleIdentityCaptchaAnswerChange,
    handleNewClientFirstNameChange,
    handleNewClientLastNameChange,
    resetIdentityState,
  } = usePublicBookingIdentity({
    tenantId: tenant.id,
    step,
    formattedPhoneDigits,
    isPhoneValid,
    normalizedCpfDigits,
    isCpfValid,
    clientLookupStatus,
    suggestedClient,
    identityCpfAttempts,
    identitySecuritySessionId,
    identityCaptchaToken,
    identityCaptchaAnswer,
    isVerifyingClientCpf,
    clientFirstName,
    clientLastName,
    showToast,
    setStep,
    setSelectedService,
    setIsHomeVisit,
    resetAvailability,
    resetLocationState,
    phoneInputRef,
    setClientLookupStatus,
    setSuggestedClient,
    setClientName,
    setClientFirstName,
    setClientLastName,
    setClientEmail,
    setClientPhone,
    setClientCpf,
    setAcceptPrivacyPolicy,
    setAcceptTermsOfService,
    setAcceptCommunicationConsent,
    setIdentityCpfAttempts,
    setIdentityWelcomeCountdown,
    setIdentitySecuritySessionId,
    setIdentityCaptchaPrompt,
    setIdentityCaptchaToken,
    setIdentityCaptchaAnswer,
    setIdentityGuardNotice,
    setIsVerifyingClientCpf,
  });

  const {
    payableSignalAmount,
    isMercadoPagoMinimumInvalid,
  } = usePublicBookingPaymentUi({
    totalPrice,
    signalPercentage,
    pixPayment: null,
    pixNowMs: Date.now(),
    step,
    paymentMethod: null,
    cardStatus: "idle",
    cardAwaitingConfirmation: false,
    cardProcessingStageIndex: 0,
  });

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
        tenantSlug: tenant.slug,
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
      setProtocol(createdId ? `AGD-${createdId.slice(0, 6).toUpperCase()}` : "");
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
    clientPhone,
    complemento,
    date,
    displacementEstimate?.distanceKm,
    displacementEstimate?.fee,
    estado,
    isEmailValid,
    isHomeVisit,
    isPhoneValid,
    logradouro,
    normalizedClientEmail,
    numero,
    resolvedClientFullName,
    selectedService,
    selectedTime,
    setAppointmentId,
    setIsSubmitting,
    setProtocol,
    showToast,
    tenant.slug,
  ]);

  const checkout = usePublicCheckoutController({
    active: step === "PAYMENT" && !isMercadoPagoMinimumInvalid,
    initialPaymentMethod: null,
    amount: payableSignalAmount,
    payerName: resolvedClientFullName,
    payerEmail: normalizedClientEmail,
    mercadoPagoPublicKey: mercadoPagoPublicKey ?? null,
    createPixPayment: async ({ attempt }) => {
      const ensuredId = appointmentId ?? (await ensureAppointment());
      if (!ensuredId) {
        return fail(new AppError("Não foi possível criar o agendamento antes do pagamento.", "VALIDATION_ERROR", 400));
      }
      return submitPublicPixPayment({
        appointmentId: ensuredId,
        tenantId: tenant.id,
        amount: payableSignalAmount,
        payerEmail: normalizedClientEmail,
        payerName: resolvedClientFullName,
        payerPhone: clientPhone,
        attempt,
      });
    },
    getPixPaymentStatus: async () => {
      if (!appointmentId) {
        return fail(new AppError("Agendamento ainda não disponível para consultar Pix.", "VALIDATION_ERROR", 400));
      }
      return getPublicPixPaymentStatus({
        appointmentId,
        tenantId: tenant.id,
      });
    },
    createCardPayment: async ({ token, paymentMethodId, installments, identificationType, identificationNumber }) => {
      const ensuredId = appointmentId ?? (await ensureAppointment());
      if (!ensuredId) {
        return fail(new AppError("Não foi possível criar o agendamento antes do pagamento.", "VALIDATION_ERROR", 400));
      }
      return submitPublicCardPayment({
        appointmentId: ensuredId,
        tenantId: tenant.id,
        amount: payableSignalAmount,
        token,
        paymentMethodId,
        installments,
        payerEmail: normalizedClientEmail,
        payerName: resolvedClientFullName,
        payerPhone: clientPhone,
        identificationType,
        identificationNumber,
      });
    },
    getCardPaymentStatus: async () => {
      if (!appointmentId) {
        return fail(new AppError("Agendamento ainda não disponível para consultar cartão.", "VALIDATION_ERROR", 400));
      }
      return getPublicCardPaymentStatus({
        appointmentId,
        tenantId: tenant.id,
      });
    },
    onPaymentApproved: () => {
      setStep("SUCCESS");
    },
    onEvent: (event) => {
      if (event.type === "pix_generated") {
        showToast(feedbackById("payment_pix_generated", { durationMs: 2200 }));
        return;
      }
      if (event.type === "pix_copy_success") {
        showToast(feedbackById("payment_pix_copy_success", { durationMs: 1600 }));
        return;
      }
      if (event.type === "pix_copy_error") {
        showToast(feedbackById("payment_pix_copy_unavailable"));
        return;
      }
      if (event.type === "card_pending") {
        showToast(feedbackById("payment_pending"));
        return;
      }
      if (event.type === "payment_paid") {
        showToast(feedbackById("payment_recorded", { durationMs: 1800 }));
        return;
      }
      if (event.type === "pix_error" || event.type === "card_error") {
        showToast({
          message: event.message,
          tone: "error",
          durationMs: 3200,
        });
      }
    },
  });

  const handleReset = useCallback(() => {
    resetIdentityState({ clearPhone: true, resetFlow: true, clearSuggestedClient: true });
    setAppointmentId(null);
    setProtocol("");
    checkout.resetCheckout();
    setIsVoucherOpen(false);
  }, [checkout, resetIdentityState, setAppointmentId, setIsVoucherOpen, setProtocol]);

  const { voucherBusy, handleDownloadVoucher, handleShareVoucher } = usePublicBookingVoucherActions({
    protocol,
    showToast,
    voucherRef,
  });

  const { showFooter, showNextButton, isNextDisabled, nextLabel, handleBack, handleNext } =
    usePublicBookingNavigation({
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
      selectedServiceId: selectedService?.id ?? null,
      date,
      selectedTime,
      addressComplete,
      displacementReady,
      paymentMethod: checkout.paymentMethod,
      isMercadoPagoMinimumInvalid,
    });

  const { handleServiceSelect, handleTalkToFlora } = usePublicBookingServiceActions({
    whatsappNumber,
    setSelectedService,
    setSelectedTime,
    setStep,
    setProtocol,
    setAppointmentId,
    enforceStudioLocationOnly,
    showToast,
    resetCheckout: checkout.resetCheckout,
  });

  return {
    state,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    setLogradouro,
    setNumero,
    setComplemento,
    setBairro,
    setCidade,
    useSuggestedAddress,
    addressMode,
    isAddressSearchModalOpen,
    setIsAddressSearchModalOpen,
    addressSearchQuery,
    setAddressSearchQuery,
    addressSearchResults,
    addressSearchLoading,
    displacementEstimate,
    displacementStatus,
    mapsQuery,
    hasSuggestedAddress,
    suggestedAddressSummary,
    addressComplete,
    displacementReady,
    closeAddressSearchModal,
    handleSelectAddressResult,
    handleSelectStudioLocation,
    handleSelectHomeVisitLocation,
    handleUseSuggestedAddress,
    handleChooseOtherAddress,
    handleSelectLocationAddressMode,
    handleLocationCepChange,
    handleLocationStateChange,
    handleCepLookup,
    formattedPhoneDigits,
    isPhoneValid,
    normalizedCpfDigits,
    isCpfValid,
    normalizedClientEmail,
    isEmailValid,
    resolvedClientFullName,
    isIdentityNameReady,
    clientHeaderFirstName,
    totalPrice,
    selectedDateObj,
    suggestedClientPublicName,
    suggestedClientFirstName,
    suggestedClientInitials,
    availableSlots,
    handleChangeMonth,
    handleSelectDay,
    isDayDisabled,
    isLoadingDaySlots,
    handleVerifyExistingClientCpf,
    handleSwitchAccount,
    handleIdentityPhoneChange,
    handleIdentityCpfChange,
    handleIdentityCaptchaAnswerChange,
    handleNewClientFirstNameChange,
    handleNewClientLastNameChange,
    paymentMethod: checkout.paymentMethod,
    payableSignalAmount,
    pixPayment: checkout.pixPayment,
    pixStatus: checkout.pixStatus,
    pixQrExpired: checkout.pixQrExpired,
    pixRemainingLabel: checkout.pixRemainingLabel,
    pixProgressPct: checkout.pixProgressPct,
    cardStatus: checkout.cardStatus,
    checkoutStatusMessage: checkout.statusMessage,
    isMercadoPagoMinimumInvalid,
    showCardProcessingOverlay: checkout.showCardProcessingOverlay,
    cardProcessingStageIndex: checkout.cardProcessingStageIndex,
    cardAwaitingConfirmation: checkout.cardAwaitingConfirmation,
    currentCardProcessingStage: checkout.currentCardProcessingStage,
    ensureAppointment,
    handleCopyPix: checkout.handleCopyPix,
    handleCreatePix: checkout.handleRegeneratePix,
    handleSelectPayment: checkout.setPaymentMethod,
    handleReset,
    voucherBusy,
    handleDownloadVoucher,
    handleShareVoucher,
    showFooter,
    showNextButton,
    isNextDisabled,
    nextLabel,
    handleBack,
    handleNext,
    handleServiceSelect,
    handleTalkToFlora,
    setMpReady: checkout.setMpReady,
  };
}
