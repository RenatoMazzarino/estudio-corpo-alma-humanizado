
import { format, startOfMonth } from "date-fns";
import { useRef, useState } from "react";
import { useToast } from "../../../../../components/ui/toast";
import type {
  CardFormInstance,
  PaymentMethod,
  Service,
  Step,
  SuggestedClientLookup,
} from "../booking-flow.types";

export function usePublicBookingFlowState() {
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

  return {
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
    pixPayment,
    setPixPayment,
    pixStatus,
    setPixStatus,
    setPixError,
    pixAttempt,
    setPixAttempt,
    pixNowMs,
    setPixNowMs,
    paymentMethod,
    setPaymentMethod,
    cardStatus,
    setCardStatus,
    setCardError,
    cardAwaitingConfirmation,
    setCardAwaitingConfirmation,
    cardProcessingStageIndex,
    setCardProcessingStageIndex,
    mpReady,
    setMpReady,
    toast,
    showToast,
    phoneInputRef,
    cardFormRef,
    cardSubmitInFlightRef,
    pixAutoRefreshByPaymentRef,
    pixFailureStatusRef,
    cardFailureStatusRef,
    mpInitToastShownRef,
    voucherRef,
    isVoucherOpen,
    setIsVoucherOpen,
    identityCpfAttempts,
    setIdentityCpfAttempts,
    identityWelcomeCountdown,
    setIdentityWelcomeCountdown,
    identitySecuritySessionId,
    setIdentitySecuritySessionId,
    identityCaptchaPrompt,
    setIdentityCaptchaPrompt,
    identityCaptchaToken,
    setIdentityCaptchaToken,
    identityCaptchaAnswer,
    setIdentityCaptchaAnswer,
    identityGuardNotice,
    setIdentityGuardNotice,
    isVerifyingClientCpf,
    setIsVerifyingClientCpf,
    suggestedClient,
    setSuggestedClient,
  };
}

