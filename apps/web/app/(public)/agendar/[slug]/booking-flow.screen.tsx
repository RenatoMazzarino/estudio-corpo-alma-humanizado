"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import {
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import {
  createPixPayment,
  submitPublicAppointment,
} from "./application/public-booking-service";
import { usePublicBookingAvailability } from "./hooks/use-public-booking-availability";
import { usePublicBookingIdentity } from "./hooks/use-public-booking-identity";
import { usePublicBookingLocation } from "./hooks/use-public-booking-location";
import { usePublicBookingNavigation } from "./hooks/use-public-booking-navigation";
import { usePublicBookingPaymentEffects } from "./hooks/use-public-booking-payment-effects";
import { usePublicBookingPaymentUi } from "./hooks/use-public-booking-payment-ui";
import { usePublicBookingVoucherActions } from "./hooks/use-public-booking-voucher-actions";
import type {
  BookingFlowProps,
  CardFormInstance,
  MercadoPagoConstructor,
  PaymentMethod,
  Service,
  SuggestedClientLookup,
  Step,
} from "./booking-flow.types";
import { Toast, useToast } from "../../../../components/ui/toast";
import { resolveClientNames } from "../../../../src/modules/clients/name-profile";
import { VoucherOverlay } from "./components/voucher-overlay";
import {
  cardProcessingStages,
  stepLabels,
} from "./booking-flow-config";
import {
  buildWhatsAppLink,
  isValidCpfDigits,
  isValidEmailAddress,
  isValidPhoneDigits,
  normalizeCpfDigits,
  normalizePhoneDigits,
  resolveClientHeaderFirstName,
  resolvePositiveMinutes,
  resolvePublicClientFullName,
} from "./booking-flow.helpers";
import { BookingHeader } from "./components/booking-header";
import { BookingFooter } from "./components/booking-footer";
import { CardProcessingOverlay } from "./components/card-processing-overlay";
import { AddressSearchModal } from "./components/address-search-modal";
import { BookingStepContent } from "./components/booking-step-content";
import { feedbackById, feedbackFromError } from "../../../../src/shared/feedback/user-feedback";

declare global {
  interface Window {
    MercadoPago?: MercadoPagoConstructor;
  }
}

export function BookingFlow({
  tenant,
  services,
  signalPercentage,
  publicBookingCutoffBeforeCloseMinutes,
  publicBookingLastSlotBeforeCloseMinutes,
  whatsappNumber,
  mercadoPagoPublicKey,
}: BookingFlowProps) {
  const [step, setStep] = useState<Step>("WELCOME");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isHomeVisit, setIsHomeVisit] = useState(false);
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [activeMonth, setActiveMonth] = useState<Date>(startOfMonth(new Date()));
  const [clientName, setClientName] = useState("");
  const [clientFirstName, setClientFirstName] = useState("");
  const [clientLastName, setClientLastName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCpf, setClientCpf] = useState("");
  const [acceptPrivacyPolicy, setAcceptPrivacyPolicy] = useState(false);
  const [acceptTermsOfService, setAcceptTermsOfService] = useState(false);
  const [acceptCommunicationConsent, setAcceptCommunicationConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<string>("");
  const [clientLookupStatus, setClientLookupStatus] = useState<
    "idle" | "loading" | "found" | "confirmed" | "declined" | "not_found"
  >("idle");
  const [pixPayment, setPixPayment] = useState<{
    id: string;
    status: string;
    ticket_url: string | null;
    qr_code: string | null;
    qr_code_base64: string | null;
    transaction_amount: number;
    created_at: string;
    expires_at: string;
  } | null>(null);
  const [pixStatus, setPixStatus] = useState<"idle" | "loading" | "error">("idle");
  const [, setPixError] = useState<string | null>(null);
  const [pixAttempt, setPixAttempt] = useState(0);
  const [pixNowMs, setPixNowMs] = useState(() => Date.now());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [cardStatus, setCardStatus] = useState<"idle" | "loading" | "error">("idle");
  const [, setCardError] = useState<string | null>(null);
  const [cardAwaitingConfirmation, setCardAwaitingConfirmation] = useState(false);
  const [cardProcessingStageIndex, setCardProcessingStageIndex] = useState(0);
  const [mpReady, setMpReady] = useState(false);
  const { toast, showToast } = useToast(2600);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const cardFormRef = useRef<CardFormInstance | null>(null);
  const cardSubmitInFlightRef = useRef(false);
  const pixAutoRefreshByPaymentRef = useRef<string | null>(null);
  const pixFailureStatusRef = useRef<string | null>(null);
  const cardFailureStatusRef = useRef<string | null>(null);
  const mpInitToastShownRef = useRef(false);
  const voucherRef = useRef<HTMLDivElement | null>(null);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [identityCpfAttempts, setIdentityCpfAttempts] = useState(0);
  const [identityWelcomeCountdown, setIdentityWelcomeCountdown] = useState<number | null>(null);
  const [identitySecuritySessionId, setIdentitySecuritySessionId] = useState("");
  const [identityCaptchaPrompt, setIdentityCaptchaPrompt] = useState<string | null>(null);
  const [identityCaptchaToken, setIdentityCaptchaToken] = useState<string | null>(null);
  const [identityCaptchaAnswer, setIdentityCaptchaAnswer] = useState("");
  const [identityGuardNotice, setIdentityGuardNotice] = useState<string | null>(null);
  const [isVerifyingClientCpf, setIsVerifyingClientCpf] = useState(false);
  const [suggestedClient, setSuggestedClient] = useState<SuggestedClientLookup | null>(null);
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
    isHomeVisit,
    setIsHomeVisit,
    homeVisitAllowed: Boolean(selectedService?.accepts_home_visit),
    suggestedClient,
    showToast,
  });

  const formattedPhoneDigits = normalizePhoneDigits(clientPhone);
  const isPhoneValid = isValidPhoneDigits(formattedPhoneDigits);
  const normalizedCpfDigits = normalizeCpfDigits(clientCpf);
  const isCpfValid = isValidCpfDigits(normalizedCpfDigits);
  const normalizedClientEmail = clientEmail.trim().toLowerCase();
  const isEmailValid = isValidEmailAddress(normalizedClientEmail);
  const isExistingClientConfirmed = clientLookupStatus === "confirmed";
  const publicClientFullName = useMemo(
    () =>
      resolvePublicClientFullName({
        firstName: clientFirstName,
        lastName: clientLastName,
        fallbackName: clientName,
      }),
    [clientFirstName, clientLastName, clientName]
  );
  const resolvedClientFullName = useMemo(() => {
    const candidate = (isExistingClientConfirmed ? clientName : publicClientFullName).trim();
    return candidate;
  }, [clientName, isExistingClientConfirmed, publicClientFullName]);
  const isIdentityNameReady =
    isExistingClientConfirmed
      ? resolvedClientFullName.length > 0
      : clientFirstName.trim().length > 0 && clientLastName.trim().length > 0;
  const clientHeaderFirstName = useMemo(
    () => resolveClientHeaderFirstName(clientName || publicClientFullName || ""),
    [clientName, publicClientFullName]
  );

  const totalPrice = useMemo(() => {
    if (!selectedService) return 0;
    const basePrice = Number(selectedService.price);
    const displacementFee = isHomeVisit ? Number(displacementEstimate?.fee ?? 0) : 0;
    return Number((basePrice + displacementFee).toFixed(2));
  }, [displacementEstimate?.fee, isHomeVisit, selectedService]);

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
    enabled: step === "DATETIME",
    isHomeVisit,
    onlineCutoffBeforeCloseMinutes,
    onlineLastSlotBeforeCloseMinutes,
    selectedServiceId: selectedService?.id ?? null,
    setActiveMonth,
    setDate,
    setSelectedTime,
    tenantId: tenant.id,
  });
  const whatsappLink = useMemo(() => buildWhatsAppLink(whatsappNumber), [whatsappNumber]);

  const selectedDateObj = useMemo(() => parseISO(`${date}T00:00:00`), [date]);

  const suggestedClientPublicName = useMemo(
    () =>
      resolveClientNames({
        name: suggestedClient?.name ?? null,
        publicFirstName: suggestedClient?.public_first_name ?? null,
        publicLastName: suggestedClient?.public_last_name ?? null,
        internalReference: suggestedClient?.internal_reference ?? null,
      }).publicFullName,
    [
      suggestedClient?.internal_reference,
      suggestedClient?.name,
      suggestedClient?.public_first_name,
      suggestedClient?.public_last_name,
    ]
  );
  const suggestedClientFirstName = useMemo(() => {
    const names = resolveClientNames({
      name: suggestedClient?.name ?? null,
      publicFirstName: suggestedClient?.public_first_name ?? null,
      publicLastName: suggestedClient?.public_last_name ?? null,
      internalReference: suggestedClient?.internal_reference ?? null,
    });
    const name = names.publicFirstName.trim();
    if (!name) return "cliente";
    return name.split(/\s+/)[0] ?? "cliente";
  }, [
    suggestedClient?.internal_reference,
    suggestedClient?.name,
    suggestedClient?.public_first_name,
    suggestedClient?.public_last_name,
  ]);
  const suggestedClientInitials = useMemo(() => {
    const name = resolveClientNames({
      name: suggestedClient?.name ?? null,
      publicFirstName: suggestedClient?.public_first_name ?? null,
      publicLastName: suggestedClient?.public_last_name ?? null,
      internalReference: suggestedClient?.internal_reference ?? null,
    }).publicFullName.trim();
    if (!name) return "CL";
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "CL";
    const [first, second] = parts;
    return `${first?.[0] ?? ""}${second?.[0] ?? first?.[1] ?? ""}`.toUpperCase();
  }, [
    suggestedClient?.internal_reference,
    suggestedClient?.name,
    suggestedClient?.public_first_name,
    suggestedClient?.public_last_name,
  ]);
  const {
    payableSignalAmount,
    isMercadoPagoMinimumInvalid,
    pixProgressPct,
    pixQrExpired,
    pixRemainingLabel,
    showCardProcessingOverlay,
    currentCardProcessingStage,
  } = usePublicBookingPaymentUi({
    totalPrice,
    signalPercentage,
    pixPayment: pixPayment
      ? {
          created_at: pixPayment.created_at,
          expires_at: pixPayment.expires_at,
        }
      : null,
    pixNowMs,
    step,
    paymentMethod,
    cardStatus,
    cardAwaitingConfirmation,
    cardProcessingStageIndex,
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

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    if (!service.accepts_home_visit) {
      enforceStudioLocationOnly();
    }
    setSelectedTime("");
  };

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
    logradouro,
    numero,
    resolvedClientFullName,
    selectedService,
    selectedTime,
    tenant.slug,
    isEmailValid,
    isPhoneValid,
    showToast,
  ]);

  const handleCopyPix = async () => {
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
  };

  const handleCreatePix = useCallback(async (options?: { attempt?: number }) => {
    if (!selectedService) return;
    const ensuredId = appointmentId ?? (await ensureAppointment());
    if (!ensuredId) return;
    const normalizedAttempt =
      Number.isFinite(options?.attempt) && Number(options?.attempt) >= 0
        ? Math.floor(Number(options?.attempt))
        : pixAttempt;
    setPixStatus("loading");
    setPixError((current) =>
      current?.toLowerCase().includes("expirou") ? current : null
    );
    try {
      const result = await createPixPayment({
        appointmentId: ensuredId,
        tenantId: tenant.id,
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
      pixFailureStatusRef.current = null;
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
  }, [
    appointmentId,
    clientPhone,
    ensureAppointment,
    normalizedClientEmail,
    payableSignalAmount,
    pixAttempt,
    resolvedClientFullName,
    selectedService,
    showToast,
    tenant.id,
  ]);

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
  }, [paymentMethod]);

  useEffect(() => {
    if (!showCardProcessingOverlay) {
      setCardProcessingStageIndex(0);
      return;
    }

    setCardProcessingStageIndex(0);
    const interval = window.setInterval(() => {
      setCardProcessingStageIndex((current) =>
        Math.min(current + 1, cardProcessingStages.length - 1)
      );
    }, 1700);

    return () => {
      window.clearInterval(interval);
    };
  }, [showCardProcessingOverlay]);

  useEffect(() => {
    if (step !== "PAYMENT" || paymentMethod !== "pix") {
      return;
    }
    if (pixPayment || pixStatus !== "idle") {
      return;
    }
    void handleCreatePix({ attempt: pixAttempt });
  }, [handleCreatePix, paymentMethod, pixAttempt, pixPayment, pixStatus, step]);

  useEffect(() => {
    if (
      step !== "PAYMENT" ||
      paymentMethod !== "pix" ||
      !pixPayment ||
      !pixQrExpired ||
      pixStatus === "loading"
    ) {
      return;
    }

    if (pixAutoRefreshByPaymentRef.current === pixPayment.id) {
      return;
    }

    pixAutoRefreshByPaymentRef.current = pixPayment.id;
    const nextAttempt = pixAttempt + 1;
    setPixAttempt(nextAttempt);
    setPixError("QR Code expirou. Gerando um novo Pix automaticamente...");
    showToast(feedbackById("payment_pix_expired_regenerating"));
    void handleCreatePix({ attempt: nextAttempt });
  }, [handleCreatePix, paymentMethod, pixAttempt, pixPayment, pixQrExpired, pixStatus, showToast, step]);

  useEffect(() => {
    if (step !== "PAYMENT" || paymentMethod !== "pix" || !pixPayment) {
      return;
    }
    setPixNowMs(Date.now());
    const interval = window.setInterval(() => {
      setPixNowMs(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [paymentMethod, pixPayment, step]);

  usePublicBookingPaymentEffects({
    step,
    paymentMethod,
    appointmentId,
    tenantId: tenant.id,
    pixPayment: pixPayment ? { id: pixPayment.id } : null,
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
    mercadoPagoPublicKey: mercadoPagoPublicKey ?? null,
    mpReady,
    payableSignalAmount,
    selectedService,
    ensureAppointment,
    normalizedClientEmail,
    resolvedClientFullName,
    clientPhone,
  });

  useEffect(() => {
    if (!appointmentId) {
      setProtocol("");
      return;
    }
    setProtocol(`AGD-${appointmentId.slice(0, 6).toUpperCase()}`);
  }, [appointmentId]);

  const handleSelectPayment = (method: PaymentMethod) => {
    if (method === paymentMethod) return;
    if (method === "pix") {
      try {
        cardFormRef.current?.unmount?.();
      } catch {
        // ignore SDK teardown errors
      }
      cardFormRef.current = null;
      cardSubmitInFlightRef.current = false;
      setCardError(null);
      setCardStatus("idle");
    }
    if (method === "card") {
      setPixError(null);
      setPixStatus("idle");
    }
    setPaymentMethod(method);
  };

  const { voucherBusy, handleDownloadVoucher, handleShareVoucher } = usePublicBookingVoucherActions({
    protocol,
    showToast,
    voucherRef,
  });

  const handleReset = () => {
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
  };

  const {
    handleNext,
    handleBack,
    isNextDisabled,
    nextLabel,
    showFooter,
    showNextButton,
  } = usePublicBookingNavigation({
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
    paymentMethod,
    isMercadoPagoMinimumInvalid,
  });

  const handleTalkToFlora = () => {
    if (whatsappLink) {
      window.open(whatsappLink, "_blank");
    } else {
      showToast(feedbackById("contact_whatsapp_unavailable"));
    }
  };

  return (
    <div className="h-full flex flex-col bg-studio-bg relative">
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onLoad={() => setMpReady(true)}
      />

      <BookingHeader clientName={clientHeaderFirstName} />

      <main className="flex-1 relative overflow-hidden flex flex-col">
        <BookingStepContent
          step={step}
          stepLabels={stepLabels}
          onStartWelcome={() => setStep("IDENT")}
          onTalkToAssistant={handleTalkToFlora}
          phoneInputRef={phoneInputRef}
          clientLookupStatus={clientLookupStatus}
          clientPhone={clientPhone}
          onPhoneChange={handleIdentityPhoneChange}
          isPhoneValid={isPhoneValid}
          suggestedClient={suggestedClient}
          clientCpf={clientCpf}
          onClientCpfChange={handleIdentityCpfChange}
          identityCaptchaPrompt={identityCaptchaPrompt}
          identityCaptchaAnswer={identityCaptchaAnswer}
          onCaptchaAnswerChange={handleIdentityCaptchaAnswerChange}
          identityGuardNotice={identityGuardNotice}
          onVerifyExistingClientCpf={() => void handleVerifyExistingClientCpf()}
          isCpfValid={isCpfValid}
          isVerifyingClientCpf={isVerifyingClientCpf}
          identityCpfAttempts={identityCpfAttempts}
          suggestedClientInitials={suggestedClientInitials}
          suggestedClientPublicName={suggestedClientPublicName}
          identityWelcomeCountdown={identityWelcomeCountdown}
          onGoServiceNow={() => setStep("SERVICE")}
          isEmailValid={isEmailValid}
          clientEmail={clientEmail}
          onClientEmailChange={setClientEmail}
          onSwitchAccount={handleSwitchAccount}
          suggestedClientFirstName={suggestedClientFirstName}
          clientFirstName={clientFirstName}
          onClientFirstNameChange={handleNewClientFirstNameChange}
          clientLastName={clientLastName}
          onClientLastNameChange={handleNewClientLastNameChange}
          acceptPrivacyPolicy={acceptPrivacyPolicy}
          onAcceptPrivacyPolicyChange={setAcceptPrivacyPolicy}
          acceptTermsOfService={acceptTermsOfService}
          onAcceptTermsOfServiceChange={setAcceptTermsOfService}
          acceptCommunicationConsent={acceptCommunicationConsent}
          onAcceptCommunicationConsentChange={setAcceptCommunicationConsent}
          services={services}
          selectedService={selectedService}
          onSelectService={handleServiceSelect}
          totalPrice={totalPrice}
          activeMonth={activeMonth}
          selectedDateObj={selectedDateObj}
          onSelectDay={handleSelectDay}
          onChangeMonth={handleChangeMonth}
          isDayDisabled={isDayDisabled}
          isLoadingDaySlots={isLoadingDaySlots}
          availableSlots={availableSlots}
          selectedTime={selectedTime}
          onSelectTime={setSelectedTime}
          isHomeVisit={isHomeVisit}
          displacementEstimate={displacementEstimate}
          displacementStatus={displacementStatus}
          hasSuggestedAddress={hasSuggestedAddress}
          useSuggestedAddress={Boolean(useSuggestedAddress)}
          suggestedAddressSummary={suggestedAddressSummary}
          addressMode={addressMode}
          cep={cep}
          logradouro={logradouro}
          numero={numero}
          complemento={complemento}
          bairro={bairro}
          cidade={cidade}
          estado={estado}
          mapsQuery={mapsQuery}
          onSelectStudio={handleSelectStudioLocation}
          onSelectHomeVisit={handleSelectHomeVisitLocation}
          onUseSuggestedAddress={handleUseSuggestedAddress}
          onChooseOtherAddress={handleChooseOtherAddress}
          onSelectAddressMode={handleSelectLocationAddressMode}
          onChangeCep={handleLocationCepChange}
          onLookupCep={() => void handleCepLookup()}
          onOpenSearchModal={() => setIsAddressSearchModalOpen(true)}
          onChangeLogradouro={setLogradouro}
          onChangeNumero={setNumero}
          onChangeComplemento={setComplemento}
          onChangeBairro={setBairro}
          onChangeCidade={setCidade}
          onChangeEstado={handleLocationStateChange}
          resolvedClientFullName={resolvedClientFullName}
          paymentMethod={paymentMethod}
          isMercadoPagoMinimumInvalid={isMercadoPagoMinimumInvalid}
          protocol={protocol}
          onSelectPayment={handleSelectPayment}
          payableSignalAmount={payableSignalAmount}
          pixPayment={pixPayment}
          pixStatus={pixStatus}
          pixRemainingLabel={pixRemainingLabel}
          pixProgressPct={pixProgressPct}
          pixQrExpired={pixQrExpired}
          cardStatus={cardStatus}
          normalizedClientEmail={normalizedClientEmail}
          appointmentId={appointmentId}
          onCopyPix={handleCopyPix}
          onReset={handleReset}
          onOpenVoucher={() => setIsVoucherOpen(true)}
        />
      </main>

      <CardProcessingOverlay
        open={showCardProcessingOverlay}
        stages={cardProcessingStages}
        stageIndex={cardProcessingStageIndex}
        awaitingConfirmation={cardAwaitingConfirmation}
        currentStage={currentCardProcessingStage}
      />

      <VoucherOverlay
        open={isVoucherOpen}
        busy={voucherBusy}
        onClose={() => setIsVoucherOpen(false)}
        onDownload={handleDownloadVoucher}
        onShare={handleShareVoucher}
        voucherRef={voucherRef}
        clientName={resolvedClientFullName || clientName}
        formattedDate={format(selectedDateObj, "dd/MM/yyyy")}
        selectedTime={selectedTime}
        selectedServiceName={selectedService?.name ?? "Serviço"}
        isHomeVisit={isHomeVisit}
        mapsQuery={mapsQuery}
        protocol={protocol}
      />

      <AddressSearchModal
        open={isAddressSearchModalOpen}
        query={addressSearchQuery}
        results={addressSearchResults}
        loading={addressSearchLoading}
        onClose={closeAddressSearchModal}
        onQueryChange={setAddressSearchQuery}
        onSelectResult={handleSelectAddressResult}
      />

      <BookingFooter
        visible={showFooter}
        showNextButton={showNextButton}
        isNextDisabled={isNextDisabled}
        nextLabel={nextLabel}
        onBack={handleBack}
        onNext={handleNext}
      />

      <Toast toast={toast} />
    </div>
  );
}
