"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import {
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import { submitPublicAppointment } from "./public-actions/appointments";
import { lookupClientIdentity } from "./public-actions/clients";
import {
  createCardPayment,
  createPixPayment,
  getCardPaymentStatus,
  getPixPaymentStatus,
} from "./public-actions/payments";
import { usePublicBookingAvailability } from "./hooks/use-public-booking-availability";
import { usePublicBookingLocation } from "./hooks/use-public-booking-location";
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
import { formatCpf } from "../../../../src/shared/cpf";
import { formatBrazilPhone } from "../../../../src/shared/phone";
import { resolveClientNames } from "../../../../src/modules/clients/name-profile";
import { VoucherOverlay } from "./components/voucher-overlay";
import { formatCountdown } from "./booking-flow-formatters";
import {
  downloadVoucherBlob,
  renderVoucherImageBlob,
  shareVoucherBlob,
} from "./voucher-export";
import {
  cardProcessingStages,
  footerSteps,
  stepLabels,
} from "./booking-flow-config";
import {
  buildWhatsAppLink,
  computePixProgress,
  isValidCpfDigits,
  isValidEmailAddress,
  isValidPhoneDigits,
  normalizeCpfDigits,
  normalizePhoneDigits,
  resolveClientHeaderFirstName,
  resolvePositiveMinutes,
  resolvePublicClientFullName,
  resolveSignalPercentage,
} from "./booking-flow.helpers";
import { DatetimeStep } from "./components/datetime-step";
import { BookingHeader } from "./components/booking-header";
import { BookingFooter } from "./components/booking-footer";
import { CardProcessingOverlay } from "./components/card-processing-overlay";
import { ConfirmStep } from "./components/confirm-step";
import { PaymentStep } from "./components/payment-step";
import { ServiceStep } from "./components/service-step";
import { AddressSearchModal } from "./components/address-search-modal";
import { IdentityStep } from "./components/identity-step";
import { LocationStep } from "./components/location-step";
import { SuccessStep } from "./components/success-step";
import { WelcomeStep } from "./components/welcome-step";
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
  const identityCpfLookupKeyRef = useRef<string | null>(null);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [voucherBusy, setVoucherBusy] = useState(false);
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

  const normalizedSignalPercentage = resolveSignalPercentage(signalPercentage);
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
  const signalAmount = Number((totalPrice * (normalizedSignalPercentage / 100)).toFixed(2));
  const payableSignalAmount = Number(signalAmount.toFixed(2));
  const isMercadoPagoMinimumInvalid =
    payableSignalAmount > 0 && payableSignalAmount < 1;
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

  const showFooter = step !== "WELCOME" && step !== "SUCCESS";
  const showNextButton = step !== "PAYMENT";

  useEffect(() => {
    if (identitySecuritySessionId) return;
    try {
      const storageKey = `public-booking-lookup-session:${tenant.id}`;
      const existing = window.sessionStorage.getItem(storageKey);
      if (existing) {
        setIdentitySecuritySessionId(existing);
        return;
      }
      const nextId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(storageKey, nextId);
      setIdentitySecuritySessionId(nextId);
    } catch {
      setIdentitySecuritySessionId(`${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    }
  }, [identitySecuritySessionId, tenant.id]);

  useEffect(() => {
    identityCpfLookupKeyRef.current = null;
    setIdentityWelcomeCountdown(null);
    setIdentityCaptchaPrompt(null);
    setIdentityCaptchaToken(null);
    setIdentityCaptchaAnswer("");
    setIdentityGuardNotice(null);
    setIsVerifyingClientCpf(false);

    if (!isPhoneValid) {
      setClientLookupStatus("idle");
      setSuggestedClient(null);
      setClientName("");
      setClientFirstName("");
      setClientLastName("");
      setClientEmail("");
      setClientCpf("");
      setAcceptPrivacyPolicy(false);
      setAcceptTermsOfService(false);
      setAcceptCommunicationConsent(false);
      setIdentityCpfAttempts(0);
      return;
    }

    const lookupPhone = formattedPhoneDigits;
    const timer = window.setTimeout(async () => {
      setClientLookupStatus("loading");
      setSuggestedClient(null);
      const result = await lookupClientIdentity({
        tenantId: tenant.id,
        phone: lookupPhone,
      });

      if (lookupPhone !== formattedPhoneDigits) {
        return;
      }

      if (!result.ok) {
        setSuggestedClient(null);
        setClientLookupStatus("not_found");
        setClientName("");
        setClientFirstName("");
        setClientLastName("");
        setClientEmail("");
        setAcceptPrivacyPolicy(false);
        setAcceptTermsOfService(false);
        setAcceptCommunicationConsent(false);
        setIdentityCpfAttempts(0);
        return;
      }

      if (result.data.client) {
        setSuggestedClient({
          id: result.data.client.id,
          name: result.data.client.name ?? null,
          email: result.data.client.email ?? null,
          cpf: result.data.client.cpf ?? null,
          public_first_name: result.data.client.public_first_name ?? null,
          public_last_name: result.data.client.public_last_name ?? null,
          internal_reference: result.data.client.internal_reference ?? null,
          address_cep: result.data.client.address_cep ?? null,
          address_logradouro: result.data.client.address_logradouro ?? null,
          address_numero: result.data.client.address_numero ?? null,
          address_complemento: result.data.client.address_complemento ?? null,
          address_bairro: result.data.client.address_bairro ?? null,
          address_cidade: result.data.client.address_cidade ?? null,
          address_estado: result.data.client.address_estado ?? null,
        });
        setClientLookupStatus("found");
        setClientName("");
        setClientFirstName("");
        setClientLastName("");
        if (result.data.client.phone) {
          setClientPhone(formatBrazilPhone(result.data.client.phone));
        }
        setClientEmail("");
        setClientCpf("");
        setAcceptPrivacyPolicy(false);
        setAcceptTermsOfService(false);
        setAcceptCommunicationConsent(false);
        setIdentityCpfAttempts(0);
      } else {
        setSuggestedClient(null);
        setClientLookupStatus("not_found");
        setClientName("");
        setClientFirstName("");
        setClientLastName("");
        setClientEmail("");
        setClientCpf("");
        setAcceptPrivacyPolicy(false);
        setAcceptTermsOfService(false);
        setAcceptCommunicationConsent(false);
        setIdentityCpfAttempts(0);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [formattedPhoneDigits, isPhoneValid, tenant.id]);

  const handleVerifyExistingClientCpf = useCallback(async () => {
    if (!suggestedClient || !(clientLookupStatus === "found" || clientLookupStatus === "declined")) return;
    if (!isCpfValid || !isPhoneValid || isVerifyingClientCpf) return;

    setIsVerifyingClientCpf(true);
    setIdentityGuardNotice(null);
    const result = await lookupClientIdentity({
      tenantId: tenant.id,
      phone: formattedPhoneDigits,
      cpf: normalizedCpfDigits,
      securitySessionId: identitySecuritySessionId,
      captchaToken: identityCaptchaToken ?? undefined,
      captchaAnswer: identityCaptchaAnswer || undefined,
    });
    setIsVerifyingClientCpf(false);

    if (!result.ok) {
      setClientLookupStatus("declined");
      setIdentityGuardNotice("Não foi possível validar seus dados agora. Tente novamente.");
      return;
    }

    const guard = result.data.guard;
    if (guard?.status === "captcha_required") {
      setIdentityCaptchaPrompt(guard.captcha?.prompt ?? "Confirme a verificação.");
      setIdentityCaptchaToken(guard.captcha?.token ?? null);
      setIdentityCaptchaAnswer("");
      setIdentityGuardNotice("Antes de continuar, confirme a verificação de segurança.");
      return;
    }

    if (guard?.status === "cooldown" || guard?.status === "blocked") {
      const message =
        guard.status === "blocked"
          ? "Detectamos muitas tentativas. Reiniciamos a tela e bloqueamos novas tentativas neste aparelho por 24h."
          : "Muitas tentativas. Reiniciamos a tela por segurança. Tente novamente em alguns minutos.";
      setIdentityGuardNotice(message);
      showToast(feedbackById("validation_invalid_data", { message, durationMs: 3200 }));
      window.setTimeout(() => {
        setStep("WELCOME");
        setSelectedService(null);
        setIsHomeVisit(false);
        const today = new Date();
        resetAvailability(today);
        setClientName("");
        setClientFirstName("");
        setClientLastName("");
        setClientEmail("");
        setClientPhone("");
        setClientCpf("");
        setAcceptPrivacyPolicy(false);
        setAcceptTermsOfService(false);
        setAcceptCommunicationConsent(false);
        setSuggestedClient(null);
        setClientLookupStatus("idle");
        setIdentityCpfAttempts(0);
        setIdentityWelcomeCountdown(null);
        setIdentityCaptchaPrompt(null);
        setIdentityCaptchaToken(null);
        setIdentityCaptchaAnswer("");
        setIdentityGuardNotice(null);
        window.setTimeout(() => phoneInputRef.current?.focus(), 0);
      }, 300);
      return;
    }

    if (!result.data.client || result.data.client.id !== suggestedClient.id) {
      setClientLookupStatus("declined");
      setIdentityWelcomeCountdown(null);
      setIdentityCaptchaAnswer("");
      setIdentityCaptchaToken(null);
      setIdentityCaptchaPrompt(null);
      setIdentityCpfAttempts(Math.min(guard?.attemptsInCycle ?? identityCpfAttempts + 1, 3));
      setIdentityGuardNotice("Não encontramos cliente com este WhatsApp e CPF. Confira e tente novamente.");
      return;
    }

    const names = resolveClientNames({
      name: result.data.client.name ?? null,
      publicFirstName: result.data.client.public_first_name ?? null,
      publicLastName: result.data.client.public_last_name ?? null,
      internalReference: result.data.client.internal_reference ?? null,
    });
    setSuggestedClient((current) =>
      current && current.id === result.data.client?.id
        ? {
            ...current,
            email: result.data.client.email ?? current.email ?? null,
            cpf: result.data.client.cpf ?? current.cpf ?? null,
            public_first_name: result.data.client.public_first_name ?? current.public_first_name ?? null,
            public_last_name: result.data.client.public_last_name ?? current.public_last_name ?? null,
            internal_reference: result.data.client.internal_reference ?? current.internal_reference ?? null,
          }
        : current
    );
    setClientFirstName(names.publicFirstName);
    setClientLastName(names.publicLastName);
    setClientName(names.publicFullName || result.data.client.name || "Cliente");
    setClientEmail(result.data.client.email ?? "");
    setClientCpf(formatCpf(result.data.client.cpf ?? normalizedCpfDigits));
    setClientLookupStatus("confirmed");
    setIdentityCpfAttempts(0);
    setIdentityGuardNotice(null);
    setIdentityCaptchaPrompt(null);
    setIdentityCaptchaToken(null);
    setIdentityCaptchaAnswer("");
  }, [
    clientLookupStatus,
    formattedPhoneDigits,
    identityCaptchaAnswer,
    identityCaptchaToken,
    identityCpfAttempts,
    identitySecuritySessionId,
    isCpfValid,
    isPhoneValid,
    isVerifyingClientCpf,
    normalizedCpfDigits,
    resetAvailability,
    showToast,
    suggestedClient,
    tenant.id,
  ]);

  useEffect(() => {
    if (step !== "IDENT" || clientLookupStatus !== "confirmed" || !suggestedClient) {
      setIdentityWelcomeCountdown(null);
      return;
    }
    setIdentityWelcomeCountdown(4);
    const interval = window.setInterval(() => {
      setIdentityWelcomeCountdown((value) => {
        if (value === null) return value;
        if (value <= 1) {
          window.clearInterval(interval);
          setStep("SERVICE");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [clientLookupStatus, step, suggestedClient]);

  const handleSwitchAccount = () => {
    setClientPhone("");
    setClientCpf("");
    setClientName("");
    setClientFirstName("");
    setClientLastName("");
    setClientEmail("");
    setAcceptPrivacyPolicy(false);
    setAcceptTermsOfService(false);
    setAcceptCommunicationConsent(false);
    setSuggestedClient(null);
    setClientLookupStatus("idle");
    setIdentityCpfAttempts(0);
    setIdentityWelcomeCountdown(null);
    setIdentityCaptchaPrompt(null);
    setIdentityCaptchaToken(null);
    setIdentityCaptchaAnswer("");
    setIdentityGuardNotice(null);
    setIsVerifyingClientCpf(false);
    identityCpfLookupKeyRef.current = null;
    resetLocationState();
    window.setTimeout(() => phoneInputRef.current?.focus(), 0);
  };

  const handleIdentityPhoneChange = (value: string) => {
    setClientPhone(formatBrazilPhone(value));
  };

  const handleIdentityCpfChange = (value: string) => {
    identityCpfLookupKeyRef.current = null;
    setClientCpf(formatCpf(value));
    setIdentityGuardNotice(null);
    if (clientLookupStatus === "declined") {
      setClientLookupStatus("found");
    }
  };

  const handleIdentityCaptchaAnswerChange = (value: string) => {
    setIdentityCaptchaAnswer(value.replace(/\D/g, "").slice(0, 2));
  };

  const handleNewClientFirstNameChange = (value: string) => {
    setClientFirstName(value);
    setClientName([value.trim(), clientLastName.trim()].filter(Boolean).join(" "));
  };

  const handleNewClientLastNameChange = (value: string) => {
    setClientLastName(value);
    setClientName([clientFirstName.trim(), value.trim()].filter(Boolean).join(" "));
  };

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

  useEffect(() => {
    if (step !== "PAYMENT" || paymentMethod !== "pix" || !appointmentId || !pixPayment) {
      return;
    }

    let active = true;
    const poll = async () => {
      const result = await getPixPaymentStatus({
        appointmentId,
        tenantId: tenant.id,
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
  }, [appointmentId, paymentMethod, pixPayment, showToast, step, tenant.id]);

  useEffect(() => {
    if (
      step !== "PAYMENT" ||
      paymentMethod !== "card" ||
      !appointmentId ||
      !cardAwaitingConfirmation
    ) {
      return;
    }

    let active = true;
    const poll = async () => {
      const result = await getCardPaymentStatus({
        appointmentId,
        tenantId: tenant.id,
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
  }, [appointmentId, cardAwaitingConfirmation, paymentMethod, showToast, step, tenant.id]);

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
    if (!window.MercadoPago) {
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
    const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
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
              tenantId: tenant.id,
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
            setCardError(
              "Pagamento em processamento. Você receberá a confirmação assim que for aprovado."
            );
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
    clientPhone,
    mercadoPagoPublicKey,
    ensureAppointment,
    normalizedClientEmail,
    mpReady,
    paymentMethod,
    selectedService,
    payableSignalAmount,
    resolvedClientFullName,
    showToast,
    step,
    tenant.id,
  ]);

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

  const buildVoucherBlob = useCallback(async () => {
    if (!voucherRef.current) return null;
    setVoucherBusy(true);
    try {
      return await renderVoucherImageBlob(voucherRef.current);
    } catch (error) {
      console.error("Falha ao gerar imagem do voucher", error);
      return null;
    } finally {
      setVoucherBusy(false);
    }
  }, []);

  const handleDownloadVoucher = useCallback(async () => {
    const blob = await buildVoucherBlob();
    if (!blob) {
      showToast(feedbackById("voucher_generation_failed"));
      return;
    }
    downloadVoucherBlob(blob, `voucher-${protocol || "agendamento"}.png`, window.navigator.userAgent);
  }, [buildVoucherBlob, protocol, showToast]);

  const handleShareVoucher = useCallback(async () => {
    const blob = await buildVoucherBlob();
    if (!blob) return;
    await shareVoucherBlob(
      blob,
      `voucher-${protocol || "agendamento"}.png`,
      "Segue o voucher do seu agendamento. Baixe a imagem e envie pelo WhatsApp."
    );
  }, [buildVoucherBlob, protocol]);

  const handleReset = () => {
    setStep("WELCOME");
    setSelectedService(null);
    setIsHomeVisit(false);
    const today = new Date();
    resetAvailability(today);
    setClientName("");
    setClientFirstName("");
    setClientLastName("");
    setClientEmail("");
    setClientPhone("");
    setClientCpf("");
    setAcceptPrivacyPolicy(false);
    setAcceptTermsOfService(false);
    setAcceptCommunicationConsent(false);
    resetLocationState();
    setAppointmentId(null);
    setProtocol("");
    setSuggestedClient(null);
    setClientLookupStatus("idle");
    setIdentityCpfAttempts(0);
    setIdentityWelcomeCountdown(null);
    setIdentityCaptchaPrompt(null);
    setIdentityCaptchaToken(null);
    setIdentityCaptchaAnswer("");
    setIdentityGuardNotice(null);
    setIsVerifyingClientCpf(false);
    identityCpfLookupKeyRef.current = null;
    setPixPayment(null);
    setPixStatus("idle");
    setPixError(null);
    setPixAttempt(0);
    pixAutoRefreshByPaymentRef.current = null;
    setPaymentMethod(null);
    setCardStatus("idle");
    setCardError(null);
    setIsVoucherOpen(false);
    setVoucherBusy(false);
  };

  const handleNext = () => {
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
  };

  const handleBack = () => {
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
  };

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
      return !selectedService;
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
    addressComplete,
    isEmailValid,
    isCpfValid,
    displacementReady,
    isIdentityNameReady,
    clientLookupStatus,
    date,
    isPhoneValid,
    isSubmitting,
    paymentMethod,
    isMercadoPagoMinimumInvalid,
    selectedService,
    selectedTime,
    step,
    acceptPrivacyPolicy,
    acceptTermsOfService,
    acceptCommunicationConsent,
  ]);

  const nextLabel = step === "CONFIRM" ? "Ir para Pagamento" : "Continuar";

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
        {step === "WELCOME" && (
          <WelcomeStep
            onStart={() => setStep("IDENT")}
            onTalkToAssistant={handleTalkToFlora}
          />
        )}

        {step === "IDENT" && (
          <IdentityStep
            label={stepLabels.IDENT}
            clientLookupStatus={clientLookupStatus}
            phoneInputRef={phoneInputRef}
            clientPhone={clientPhone}
            onPhoneChange={handleIdentityPhoneChange}
            isPhoneValid={isPhoneValid}
            hasSuggestedClient={Boolean(suggestedClient)}
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
          />
        )}

        {step === "SERVICE" && (
          <ServiceStep
            label={stepLabels.SERVICE}
            services={services}
            selectedServiceId={selectedService?.id ?? null}
            onSelectService={handleServiceSelect}
          />
        )}

        {step === "DATETIME" && (
          <DatetimeStep
            label={stepLabels.DATETIME}
            serviceName={selectedService?.name ?? "—"}
            totalPrice={totalPrice}
            activeMonth={activeMonth}
            selectedDate={selectedDateObj}
            onSelectDay={handleSelectDay}
            onChangeMonth={handleChangeMonth}
            isDayDisabled={isDayDisabled}
            isLoadingDaySlots={isLoadingDaySlots}
            availableSlots={availableSlots}
            selectedTime={selectedTime}
            onSelectTime={setSelectedTime}
          />
        )}

        {step === "LOCATION" && (
          <LocationStep
            label={stepLabels.LOCATION}
            isHomeVisit={isHomeVisit}
            homeVisitAllowed={Boolean(selectedService?.accepts_home_visit)}
            selectedServicePrice={Number(selectedService?.price ?? 0)}
            totalPrice={totalPrice}
            displacementEstimate={displacementEstimate}
            displacementStatus={displacementStatus}
            hasSuggestedAddress={hasSuggestedAddress}
            useSuggestedAddress={useSuggestedAddress}
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
          />
        )}

        {step === "CONFIRM" && (
          <ConfirmStep
            label={stepLabels.CONFIRM}
            clientName={resolvedClientFullName || "Cliente"}
            serviceName={selectedService?.name ?? "Serviço"}
            selectedDate={selectedDateObj}
            selectedTime={selectedTime}
            isHomeVisit={isHomeVisit}
            totalPrice={totalPrice}
            paymentMethod={paymentMethod}
            isMercadoPagoMinimumInvalid={isMercadoPagoMinimumInvalid}
            protocol={protocol}
            onSelectPayment={handleSelectPayment}
          />
        )}

        {step === "PAYMENT" && (
          <PaymentStep
            payableSignalAmount={payableSignalAmount}
            paymentMethod={paymentMethod}
            pixPayment={pixPayment}
            pixStatus={pixStatus}
            pixRemainingLabel={pixRemainingLabel}
            pixProgressPct={pixProgressPct}
            pixQrExpired={pixQrExpired}
            cardStatus={cardStatus}
            resolvedClientFullName={resolvedClientFullName}
            normalizedClientEmail={normalizedClientEmail}
            appointmentId={appointmentId}
            onCopyPix={handleCopyPix}
          />
        )}

        {step === "SUCCESS" && (
          <SuccessStep
            date={selectedDateObj}
            selectedTime={selectedTime}
            serviceName={selectedService?.name ?? "Serviço"}
            protocol={protocol}
            onOpenVoucher={() => setIsVoucherOpen(true)}
            onReset={handleReset}
          />
        )}
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
