"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Script from "next/script";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  CreditCard,
  MapPin,
  Phone,
  QrCode,
  Sparkles,
} from "lucide-react";
import { submitPublicAppointment } from "./public-actions/appointments";
import { lookupClientIdentity } from "./public-actions/clients";
import {
  createCardPayment,
  createPixPayment,
  getCardPaymentStatus,
  getPixPaymentStatus,
} from "./public-actions/payments";
import { getAvailableSlots } from "./availability";
import { fetchAddressByCep, normalizeCep } from "../../../../src/shared/address/cep";
import { MonthCalendar } from "../../../../components/agenda/month-calendar";
import { Toast, useToast } from "../../../../components/ui/toast";
import { formatBrazilPhone } from "../../../../src/shared/phone";
import { resolveClientNames } from "../../../../src/modules/clients/name-profile";
import { VoucherOverlay } from "./components/voucher-overlay";
import { formatCep, formatCountdown } from "./booking-flow-formatters";
import {
  downloadVoucherBlob,
  renderVoucherImageBlob,
  shareVoucherBlob,
} from "./voucher-export";
import {
  cardProcessingStages,
  footerSteps,
  minimumMercadoPagoAmount,
  progressSteps,
  stepLabels,
} from "./booking-flow-config";
import { feedbackById, feedbackFromError } from "../../../../src/shared/feedback/user-feedback";

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  accepts_home_visit: boolean;
  custom_buffer_minutes: number;
  description: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface BookingFlowProps {
  tenant: Tenant;
  services: Service[];
  signalPercentage?: number | null;
  whatsappNumber?: string | null;
  mercadoPagoPublicKey?: string | null;
}

type Step =
  | "WELCOME"
  | "IDENT"
  | "SERVICE"
  | "DATETIME"
  | "LOCATION"
  | "CONFIRM"
  | "PAYMENT"
  | "SUCCESS";

type PaymentMethod = "pix" | "card" | null;

type DisplacementEstimate = {
  distanceKm: number;
  fee: number;
  rule: "urban" | "road";
};

type CardFormData = {
  token: string;
  paymentMethodId: string;
  issuerId?: string;
  installments: string | number;
  identificationType?: string;
  identificationNumber?: string;
  cardholderEmail?: string;
};

type CardFormInstance = {
  getCardFormData: () => CardFormData;
  unmount?: () => void;
};

type AddressSearchResult = {
  id: string;
  placeId: string;
  label: string;
};

type CardFormOptions = {
  amount: string;
  iframe?: boolean;
  form: {
    id: string;
    cardNumber: { id: string; placeholder?: string };
    expirationDate: { id: string; placeholder?: string };
    securityCode: { id: string; placeholder?: string };
    cardholderName: { id: string; placeholder?: string };
    issuer: { id: string; placeholder?: string };
    installments: { id: string; placeholder?: string };
    identificationType: { id: string; placeholder?: string };
    identificationNumber: { id: string; placeholder?: string };
    cardholderEmail: { id: string; placeholder?: string };
  };
  callbacks?: {
    onFormMounted?: (error: unknown) => void;
    onSubmit?: (event: Event) => void;
    onFetching?: (resource: string) => void | (() => void);
  };
};

type MercadoPagoConstructor = new (
  publicKey: string,
  options?: { locale?: string }
) => {
  cardForm: (options: CardFormOptions) => CardFormInstance;
};

declare global {
  interface Window {
    MercadoPago?: MercadoPagoConstructor;
  }
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function BookingFlow({
  tenant,
  services,
  signalPercentage,
  whatsappNumber,
  mercadoPagoPublicKey,
}: BookingFlowProps) {
  const [step, setStep] = useState<Step>("WELCOME");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isHomeVisit, setIsHomeVisit] = useState(false);
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [activeMonth, setActiveMonth] = useState<Date>(startOfMonth(new Date()));
  const [monthAvailability, setMonthAvailability] = useState<Record<string, string[]>>({});
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCpf, setClientCpf] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [useSuggestedAddress, setUseSuggestedAddress] = useState<boolean | null>(null);
  const [addressMode, setAddressMode] = useState<"cep" | "text" | null>(null);
  const [isAddressSearchModalOpen, setIsAddressSearchModalOpen] = useState(false);
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [addressSearchResults, setAddressSearchResults] = useState<AddressSearchResult[]>([]);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [, setAddressSearchError] = useState<string | null>(null);
  const [displacementEstimate, setDisplacementEstimate] = useState<DisplacementEstimate | null>(
    null
  );
  const [displacementStatus, setDisplacementStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [, setDisplacementError] = useState<string | null>(null);
  const [, setCepStatus] = useState<"idle" | "loading" | "error" | "success">(
    "idle"
  );
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
  const displacementFailureNotifiedRef = useRef(false);
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
  const [suggestedClient, setSuggestedClient] = useState<{
    id: string;
    name: string | null;
    email: string | null;
    cpf: string | null;
    public_first_name?: string | null;
    public_last_name?: string | null;
    internal_reference?: string | null;
    address_cep: string | null;
    address_logradouro: string | null;
    address_numero: string | null;
    address_complemento: string | null;
    address_bairro: string | null;
    address_cidade: string | null;
    address_estado: string | null;
  } | null>(null);

  const formattedPhoneDigits = clientPhone.replace(/\D/g, "");
  const isPhoneValid = formattedPhoneDigits.length === 10 || formattedPhoneDigits.length === 11;
  const normalizedCpfDigits = clientCpf.replace(/\D/g, "").slice(0, 11);
  const isCpfValid = normalizedCpfDigits.length === 11;
  const normalizedClientEmail = clientEmail.trim().toLowerCase();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedClientEmail);
  const isExistingClientConfirmed = clientLookupStatus === "confirmed";
  const publicClientFullName = useMemo(() => clientName.trim(), [clientName]);
  const resolvedClientFullName = useMemo(() => {
    const candidate = (isExistingClientConfirmed ? clientName : publicClientFullName).trim();
    return candidate;
  }, [clientName, isExistingClientConfirmed, publicClientFullName]);
  const isIdentityNameReady =
    isExistingClientConfirmed
      ? resolvedClientFullName.length > 0
      : clientName.trim().length > 0;
  const clientHeaderFirstName = useMemo(() => {
    const full = (clientName || publicClientFullName || "").trim();
    if (!full) return "Visitante";
    return full.split(/\s+/)[0] ?? "Visitante";
  }, [clientName, publicClientFullName]);

  const totalPrice = useMemo(() => {
    if (!selectedService) return 0;
    const basePrice = Number(selectedService.price);
    const displacementFee = isHomeVisit ? Number(displacementEstimate?.fee ?? 0) : 0;
    return Number((basePrice + displacementFee).toFixed(2));
  }, [displacementEstimate?.fee, isHomeVisit, selectedService]);

  const normalizedSignalPercentage = Number.isFinite(Number(signalPercentage))
    ? Math.min(Math.max(Number(signalPercentage), 0), 100)
    : 30;
  const signalAmount = Number((totalPrice * (normalizedSignalPercentage / 100)).toFixed(2));
  const payableSignalAmount = Number(
    Math.max(signalAmount, minimumMercadoPagoAmount).toFixed(2)
  );
  const signalAmountWasAdjusted = payableSignalAmount > signalAmount;
  const whatsappLink = useMemo(() => {
    if (!whatsappNumber) return null;
    const digits = whatsappNumber.replace(/\D/g, "");
    if (!digits) return null;
    const normalized = digits.length <= 11 ? `55${digits}` : digits;
    const message = encodeURIComponent(
      "Olá! Gostaria de falar com a Flora sobre meu agendamento."
    );
    return `https://wa.me/${normalized}?text=${message}`;
  }, [whatsappNumber]);

  const selectedDateObj = useMemo(() => parseISO(`${date}T00:00:00`), [date]);

  const mapsQuery = [logradouro, numero, complemento, bairro, cidade, estado, cep]
    .filter((value) => value && value.trim().length > 0)
    .join(", ");
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
  const pixCreatedAtMs = pixPayment?.created_at ? Date.parse(pixPayment.created_at) : Number.NaN;
  const pixExpiresAtMs = pixPayment?.expires_at ? Date.parse(pixPayment.expires_at) : Number.NaN;
  const pixTotalMs =
    Number.isFinite(pixCreatedAtMs) && Number.isFinite(pixExpiresAtMs) && pixExpiresAtMs > pixCreatedAtMs
      ? pixExpiresAtMs - pixCreatedAtMs
      : 24 * 60 * 60 * 1000;
  const pixRemainingMs = Number.isFinite(pixExpiresAtMs)
    ? Math.max(0, pixExpiresAtMs - pixNowMs)
    : pixTotalMs;
  const pixProgressPct = Math.max(0, Math.min(100, (pixRemainingMs / pixTotalMs) * 100));
  const pixQrExpired = pixRemainingMs <= 0;
  const pixRemainingLabel = formatCountdown(pixRemainingMs);

  const hasSuggestedAddress = Boolean(
    suggestedClient?.address_logradouro || suggestedClient?.address_cep
  );

  const requiresAddress = Boolean(selectedService?.accepts_home_visit && isHomeVisit);
  const hasAddressFields = Boolean(logradouro && numero && bairro && cidade && estado);
  const addressComplete = !requiresAddress
    ? true
    : hasSuggestedAddress && useSuggestedAddress === null
      ? false
      : hasAddressFields;
  const displacementReady = !requiresAddress
    ? true
    : displacementStatus !== "loading" && Boolean(displacementEstimate);
  const showCardProcessingOverlay =
    step === "PAYMENT" &&
    paymentMethod === "card" &&
    (cardStatus === "loading" || cardAwaitingConfirmation);
  const currentCardProcessingStage =
    cardProcessingStages[Math.min(cardProcessingStageIndex, cardProcessingStages.length - 1)] ??
    cardProcessingStages[0];

  const progressIndex = progressSteps.indexOf(step as (typeof progressSteps)[number]);
  const showFooter = step !== "WELCOME" && step !== "SUCCESS";
  const showNextButton = step !== "PAYMENT";

  const availableSlots = monthAvailability[date] ?? [];

  const calculateDisplacement = useCallback(async () => {
    if (!requiresAddress || !addressComplete) {
      setDisplacementEstimate(null);
      setDisplacementStatus("idle");
      setDisplacementError(null);
      displacementFailureNotifiedRef.current = false;
      return;
    }

    setDisplacementStatus("loading");
    setDisplacementError(null);
    try {
      const response = await fetch("/api/displacement-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
        }),
      });
      const payload = (await response.json()) as
        | DisplacementEstimate
        | {
            error?: string;
          };
      if (!response.ok) {
        const errorPayload = payload as { error?: string };
        throw new Error(errorPayload.error || "Não foi possível calcular a taxa de deslocamento.");
      }
      if (
        !("fee" in payload) ||
        typeof payload.fee !== "number" ||
        typeof payload.distanceKm !== "number"
      ) {
        throw new Error("Não foi possível calcular a taxa de deslocamento.");
      }
      setDisplacementEstimate(payload);
      setDisplacementStatus("idle");
      displacementFailureNotifiedRef.current = false;
    } catch (error) {
      setDisplacementEstimate(null);
      setDisplacementStatus("error");
      const message =
        error instanceof Error ? error.message : "Não foi possível calcular a taxa de deslocamento.";
      setDisplacementError(message);
      if (!displacementFailureNotifiedRef.current) {
        displacementFailureNotifiedRef.current = true;
        showToast(feedbackById("displacement_calc_failed"));
      }
    }
  }, [
    addressComplete,
    bairro,
    cep,
    cidade,
    complemento,
    estado,
    logradouro,
    numero,
    requiresAddress,
    showToast,
  ]);

  const StepTabs = () => (
    <div className="mt-3 flex gap-1">
      {progressSteps.map((item, index) => (
        <div
          key={item}
          className={`h-1.5 flex-1 rounded-full ${
            index <= progressIndex ? "bg-studio-green" : "bg-studio-light"
          }`}
        />
      ))}
    </div>
  );

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
      setClientEmail("");
      setClientCpf("");
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
        setClientEmail("");
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
        if (result.data.client.phone) {
          setClientPhone(formatBrazilPhone(result.data.client.phone));
        }
        setClientEmail("");
        setClientCpf("");
        setIdentityCpfAttempts(0);
      } else {
        setSuggestedClient(null);
        setClientLookupStatus("not_found");
        setClientName("");
        setClientEmail("");
        setClientCpf("");
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
        setDate(format(today, "yyyy-MM-dd"));
        setActiveMonth(startOfMonth(today));
        setSelectedTime("");
        setMonthAvailability({});
        setClientName("");
        setClientEmail("");
        setClientPhone("");
        setClientCpf("");
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
    setClientEmail("");
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
    setUseSuggestedAddress(null);
    window.setTimeout(() => phoneInputRef.current?.focus(), 0);
  };

  const applySuggestedAddress = () => {
    if (!suggestedClient) return;
    setCep(suggestedClient.address_cep ?? "");
    setLogradouro(suggestedClient.address_logradouro ?? "");
    setNumero(suggestedClient.address_numero ?? "");
    setComplemento(suggestedClient.address_complemento ?? "");
    setBairro(suggestedClient.address_bairro ?? "");
    setCidade(suggestedClient.address_cidade ?? "");
    setEstado(suggestedClient.address_estado ?? "");
  };

  const clearAddressFields = () => {
    setCep("");
    setLogradouro("");
    setNumero("");
    setComplemento("");
    setBairro("");
    setCidade("");
    setEstado("");
    setCepStatus("idle");
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    if (!service.accepts_home_visit) {
      setIsHomeVisit(false);
      setDisplacementEstimate(null);
      setDisplacementStatus("idle");
      setDisplacementError(null);
    }
    setSelectedTime("");
  };

  const handleCepLookup = async () => {
    const normalized = normalizeCep(cep);
    if (normalized.length !== 8) {
      setCepStatus("error");
      showToast(feedbackById("address_cep_invalid"));
      return;
    }
    setCepStatus("loading");
    const result = await fetchAddressByCep(normalized);
    if (!result) {
      setCepStatus("error");
      showToast(feedbackById("address_cep_not_found"));
      return;
    }
    setLogradouro(result.logradouro);
    setBairro(result.bairro);
    setCidade(result.cidade);
    setEstado(result.estado);
    setCepStatus("success");
    showToast(feedbackById("address_cep_found"));
  };

  useEffect(() => {
    if (!isAddressSearchModalOpen) return;
    const query = addressSearchQuery.trim();
    if (query.length < 3) {
      setAddressSearchResults([]);
      setAddressSearchError(null);
      setAddressSearchLoading(false);
      return;
    }
    const controller = new AbortController();
    const runSearch = async () => {
      setAddressSearchLoading(true);
      setAddressSearchError(null);
      try {
        const response = await fetch(`/api/address-search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Falha na busca");
        }
        const data = (await response.json()) as AddressSearchResult[];
        setAddressSearchResults(Array.isArray(data) ? data : []);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        setAddressSearchResults([]);
        setAddressSearchError("Não foi possível buscar endereços. Tente novamente.");
        showToast(feedbackById("address_search_failed"));
      } finally {
        setAddressSearchLoading(false);
      }
    };
    runSearch();
    return () => controller.abort();
  }, [addressSearchQuery, isAddressSearchModalOpen, showToast]);

  useEffect(() => {
    if (!requiresAddress || !addressComplete) {
      setDisplacementEstimate(null);
      setDisplacementStatus("idle");
      setDisplacementError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void calculateDisplacement();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [addressComplete, calculateDisplacement, requiresAddress]);

  const closeAddressSearchModal = () => {
    setIsAddressSearchModalOpen(false);
    setAddressSearchQuery("");
    setAddressSearchResults([]);
    setAddressSearchLoading(false);
    setAddressSearchError(null);
  };

  const handleSelectAddressResult = async (result: AddressSearchResult) => {
    setAddressSearchLoading(true);
    setAddressSearchError(null);
    try {
      const response = await fetch(
        `/api/address-details?placeId=${encodeURIComponent(result.placeId)}`
      );
      if (!response.ok) {
        throw new Error("Falha ao carregar endereço");
      }
      const data = (await response.json()) as {
        cep?: string;
        logradouro?: string;
        numero?: string;
        bairro?: string;
        cidade?: string;
        estado?: string;
      };
      setCep(data.cep ?? "");
      setLogradouro(data.logradouro ?? "");
      setNumero(data.numero ?? "");
      setBairro(data.bairro ?? "");
      setCidade(data.cidade ?? "");
      setEstado(data.estado ?? "");
      setCepStatus(data.cep ? "success" : "idle");
      closeAddressSearchModal();
    } catch {
      setAddressSearchError("Não foi possível carregar o endereço. Tente novamente.");
      showToast(feedbackById("address_details_failed"));
      setAddressSearchLoading(false);
    }
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
    if (step !== "DATETIME" || !selectedService) return;
    let active = true;
    const today = startOfDay(new Date());
    const start = startOfMonth(activeMonth);
    const end = endOfMonth(activeMonth);

    const loadAvailability = async () => {
      setIsLoadingMonth(true);
      setMonthAvailability({});
      const days = eachDayOfInterval({ start, end });
      const results = await Promise.all(
        days.map(async (day) => {
          const iso = format(day, "yyyy-MM-dd");
          if (isBefore(day, today)) {
            return { date: iso, slots: [] as string[] };
          }
          try {
            const slots = await getAvailableSlots({
              tenantId: tenant.id,
              serviceId: selectedService.id,
              date: iso,
              isHomeVisit,
            });
            return { date: iso, slots };
          } catch {
            return { date: iso, slots: [] as string[] };
          }
        })
      );

      if (!active) return;
      const map: Record<string, string[]> = {};
      results.forEach(({ date: day, slots }) => {
        map[day] = slots;
      });
      setMonthAvailability(map);
      setIsLoadingMonth(false);
    };

    loadAvailability();

    return () => {
      active = false;
    };
  }, [activeMonth, isHomeVisit, selectedService, step, tenant.id]);

  useEffect(() => {
    if (!appointmentId) {
      setProtocol("");
      return;
    }
    setProtocol(`AGD-${appointmentId.slice(0, 6).toUpperCase()}`);
  }, [appointmentId]);

  const handleChangeMonth = (next: Date) => {
    setActiveMonth(next);
    setDate(format(next, "yyyy-MM-01"));
    setSelectedTime("");
  };

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

  const handleSelectDay = (day: Date) => {
    const iso = format(day, "yyyy-MM-dd");
    setDate(iso);
    setSelectedTime("");
  };

  const isDayDisabled = (day: Date) => {
    const iso = format(day, "yyyy-MM-dd");
    const isPast = isBefore(day, startOfDay(new Date()));
    const slots = monthAvailability[iso];
    if (!isSameMonth(day, activeMonth)) return true;
    if (isPast || isLoadingMonth) return true;
    return !slots || slots.length === 0;
  };

  const handleReset = () => {
    setStep("WELCOME");
    setSelectedService(null);
    setIsHomeVisit(false);
    const today = new Date();
    setDate(format(today, "yyyy-MM-dd"));
    setActiveMonth(startOfMonth(today));
    setSelectedTime("");
    setMonthAvailability({});
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setClientCpf("");
    setUseSuggestedAddress(null);
    setAddressMode(null);
    clearAddressFields();
    closeAddressSearchModal();
    setDisplacementEstimate(null);
    setDisplacementStatus("idle");
    setDisplacementError(null);
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
        return !isCpfValid || !isEmailValid || !isIdentityNameReady;
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
      return isSubmitting || !paymentMethod;
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
    selectedService,
    selectedTime,
    step,
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

      <header className="flex items-center justify-between px-6 py-4 bg-studio-bg/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-white shadow-soft border border-stone-100 flex items-center justify-center shrink-0">
            <Image
              src="/brand/logo.png"
              alt="Ícone Estúdio Corpo & Alma Humanizado"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Agendamento online
            </p>
            <p className="text-sm font-serif text-studio-text truncate">
              Estúdio Corpo & Alma Humanizado
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cliente</p>
          <p className="text-sm font-bold text-studio-text">{clientHeaderFirstName}</p>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col">
        {step === "WELCOME" && (
          <section className="flex-1 flex flex-col justify-between px-6 pb-10 pt-3 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="pt-8 text-center">
              <div className="mx-auto mb-8 flex items-center justify-center">
                <Image
                  src="/brand/logo.png"
                  alt="Estúdio Corpo & Alma Humanizado"
                  width={132}
                  height={132}
                  className="h-33 w-33 object-contain"
                  priority
                />
              </div>
              <h1 className="text-4xl font-serif font-medium text-studio-text mb-4 leading-tight">
                Seu momento de<br />pausa começa aqui.
              </h1>
              <p className="text-gray-400 text-sm leading-relaxed max-w-62.5 mx-auto font-medium">
                Agendamento simples, rápido e pensado no seu bem-estar.
              </p>
            </div>

            <div className="space-y-4 pb-6">
              <button
                type="button"
                onClick={() => setStep("IDENT")}
                className="w-full h-16 bg-studio-green-dark text-white rounded-2xl font-bold uppercase tracking-widest text-sm shadow-xl flex items-center justify-center hover:bg-studio-green transition-colors"
              >
                Agendar Agora
              </button>
              <button
                type="button"
                onClick={handleTalkToFlora}
                className="w-full py-4 text-studio-text font-bold text-sm hover:underline"
              >
                Falar com a Flora (Assistente)
              </button>

            </div>
          </section>
        )}

        {step === "IDENT" && (
          <section className="flex-1 flex flex-col px-6 pb-28 pt-3 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-right-6 duration-500">
            <div className="mb-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {stepLabels.IDENT}
              </span>
              <StepTabs />
              <h2 className="text-3xl font-serif text-studio-text mt-2">Quem é você?</h2>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 transition focus-within:border-studio-green focus-within:ring-4 focus-within:ring-studio-green/10">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  WhatsApp
                </label>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-studio-green" />
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    inputMode="numeric"
                    className="w-full bg-transparent text-lg font-bold text-studio-text placeholder:text-gray-300 outline-none"
                    placeholder="(00) 00000-0000"
                    value={clientPhone}
                    onChange={(event) => setClientPhone(formatBrazilPhone(event.target.value))}
                  />
                </div>
                <p className="mt-2 text-[11px] text-gray-500">
                  Digite seu WhatsApp para localizar seu cadastro e continuar o agendamento.
                </p>
              </div>

              {clientLookupStatus === "loading" && isPhoneValid && (
                <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600">
                  Buscando cadastro para este WhatsApp...
                </div>
              )}

              {(clientLookupStatus === "found" || clientLookupStatus === "declined") && suggestedClient && (
                <>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 transition focus-within:border-studio-green focus-within:ring-4 focus-within:ring-studio-green/10">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      CPF
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={14}
                      className="w-full bg-transparent text-lg font-bold text-studio-text placeholder:text-gray-300 outline-none"
                      placeholder="000.000.000-00"
                      value={clientCpf}
                      onChange={(event) => {
                        identityCpfLookupKeyRef.current = null;
                        setClientCpf(formatCpf(event.target.value));
                        setIdentityGuardNotice(null);
                        if (clientLookupStatus === "declined") {
                          setClientLookupStatus("found");
                        }
                      }}
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Encontramos um cadastro com este WhatsApp. Informe seu CPF para confirmar.
                    </p>
                  </div>

                  {identityCaptchaPrompt && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
                        Verificação de segurança
                      </p>
                      <p className="mt-1 text-sm text-amber-900">{identityCaptchaPrompt}</p>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-center text-base font-semibold text-studio-text outline-none focus:border-studio-green"
                        placeholder="Resposta"
                        value={identityCaptchaAnswer}
                        onChange={(event) => setIdentityCaptchaAnswer(event.target.value.replace(/\D/g, "").slice(0, 2))}
                      />
                    </div>
                  )}

                  {identityGuardNotice && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {identityGuardNotice}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleVerifyExistingClientCpf()}
                    disabled={
                      !isCpfValid ||
                      isVerifyingClientCpf ||
                      (!!identityCaptchaPrompt && identityCaptchaAnswer.trim().length === 0)
                    }
                    className="w-full rounded-2xl bg-studio-green-dark px-4 py-3 text-sm font-bold uppercase tracking-widest text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifyingClientCpf ? "Validando..." : "Confirmar CPF"}
                  </button>

                  {clientLookupStatus === "declined" && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      Não encontramos cliente com este WhatsApp e CPF. Confira e tente novamente.
                      {identityCpfAttempts > 0 && (
                        <span className="mt-1 block text-xs text-red-600">
                          Tentativa {Math.min(identityCpfAttempts, 3)} de 3.
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}

              {clientLookupStatus === "confirmed" && suggestedClient && (
                <>
                  <div className="relative overflow-hidden rounded-2xl border border-studio-green/30 bg-green-50 p-4 shadow-soft animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="absolute inset-y-0 right-0 w-16 bg-linear-to-l from-studio-green/15 to-transparent" />
                    <div className="relative z-10 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-studio-green text-sm font-bold text-white">
                          {suggestedClientInitials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-studio-green">
                            Olá
                          </p>
                          <p className="truncate text-base font-bold text-studio-text">
                            {resolveClientNames({
                              name: suggestedClient.name ?? null,
                              publicFirstName: suggestedClient.public_first_name ?? null,
                              publicLastName: suggestedClient.public_last_name ?? null,
                              internalReference: suggestedClient.internal_reference ?? null,
                            }).publicFullName}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-full bg-white p-1.5 text-studio-green shadow-sm">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-studio-green/20 bg-white px-4 py-3 text-center">
                    <p className="text-sm text-studio-text">
                      Tudo certo. Estamos te levando para a próxima etapa em{" "}
                      <span className="font-bold text-studio-green">
                        {identityWelcomeCountdown ?? 0}s
                      </span>
                      .
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setStep("SERVICE")}
                        className="w-full rounded-2xl bg-studio-green-dark px-4 py-3 text-sm font-bold uppercase tracking-widest text-white"
                      >
                        Ir agora
                      </button>
                    </div>
                  </div>

                  {!isEmailValid && (
                    <div>
                      <label className="block text-xs font-bold text-studio-green uppercase tracking-widest mb-2">
                        Seu Email
                      </label>
                      <input
                        type="email"
                        inputMode="email"
                        className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-center text-base font-semibold text-studio-text outline-none transition focus:border-studio-green"
                        placeholder="voce@exemplo.com"
                        value={clientEmail}
                        onChange={(event) => setClientEmail(event.target.value)}
                      />
                      <p className="mt-2 text-center text-xs text-gray-500">
                        Seu cadastro não tem email válido. Precisamos dele para concluir o agendamento.
                      </p>
                    </div>
                  )}

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleSwitchAccount}
                      className="text-xs font-bold text-gray-400 underline decoration-dotted underline-offset-2 hover:text-studio-text transition"
                    >
                      Não é {suggestedClientFirstName}? Trocar conta
                    </button>
                  </div>
                </>
              )}

              {clientLookupStatus === "not_found" && isPhoneValid && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Não encontramos cadastro com este WhatsApp. Como é seu primeiro agendamento, preencha
                  seus dados para continuar.
                </div>
              )}

              {clientLookupStatus === "not_found" && isPhoneValid && (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-studio-green uppercase tracking-widest mb-2">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-center text-base font-semibold text-studio-text outline-none transition focus:border-studio-green"
                      placeholder="Ex: Maria Silva Souza"
                      value={clientName}
                      onChange={(event) => setClientName(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-studio-green uppercase tracking-widest mb-2">
                      CPF
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={14}
                      className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-center text-base font-semibold text-studio-text outline-none transition focus:border-studio-green"
                      placeholder="000.000.000-00"
                      value={clientCpf}
                      onChange={(event) => setClientCpf(formatCpf(event.target.value))}
                    />
                    {clientCpf && !isCpfValid && (
                      <p className="mt-2 text-center text-xs text-red-500">
                        Informe um CPF válido com 11 números.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-studio-green uppercase tracking-widest mb-2">
                      Seu Email
                    </label>
                    <input
                      type="email"
                      inputMode="email"
                      className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-center text-base font-semibold text-studio-text outline-none transition focus:border-studio-green"
                      placeholder="voce@exemplo.com"
                      value={clientEmail}
                      onChange={(event) => setClientEmail(event.target.value)}
                    />
                    {clientEmail && !isEmailValid && (
                      <p className="mt-2 text-center text-xs text-red-500">
                        Informe um email válido para confirmar o agendamento.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {step === "SERVICE" && (
          <section className="flex-1 flex flex-col px-6 pb-28 pt-3 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-right-6 duration-500">
            <div className="mb-6">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {stepLabels.SERVICE}
              </span>
              <StepTabs />
              <h2 className="text-3xl font-serif text-studio-text mt-2">Escolha seu ritual</h2>
            </div>

            <div className="space-y-4">
              {services.map((service) => {
                const selected = selectedService?.id === service.id;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleServiceSelect(service)}
                    className={`w-full bg-white border rounded-3xl p-5 shadow-soft text-left transition ${
                      selected
                        ? "border-studio-green bg-stone-50"
                        : "border-stone-100 hover:border-studio-green/40"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${
                          selected ? "bg-studio-green text-white" : "bg-stone-50 text-gray-400"
                        }`}
                      >
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-studio-text text-lg leading-tight">
                          {service.name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {service.duration_minutes} min • R$ {service.price.toFixed(2)}
                        </p>
                        {service.description && (
                          <p className="text-xs text-gray-500 mt-2">{service.description}</p>
                        )}
                      </div>
                      {service.accepts_home_visit && (
                        <span className="text-[10px] font-bold bg-dom/20 text-dom-strong px-2 py-1 rounded-full uppercase">
                          Home
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === "DATETIME" && (
          <section className="flex-1 flex flex-col px-6 pb-28 pt-3 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-right-6 duration-500">
            <div className="mb-6">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {stepLabels.DATETIME}
              </span>
              <StepTabs />
              <h2 className="text-3xl font-serif text-studio-text mt-2">Reserve o tempo</h2>
            </div>

            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Serviço</p>
                <p className="font-serif font-bold text-studio-text text-lg">
                  {selectedService?.name ?? "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Valor</p>
                <p className="font-bold text-studio-green text-lg">
                  R$ {totalPrice.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <label className="block text-xs font-bold text-studio-green uppercase tracking-widest mb-3">
                  Escolha o Dia
                </label>
                <MonthCalendar
                  currentMonth={activeMonth}
                  selectedDate={selectedDateObj}
                  onSelectDay={handleSelectDay}
                  onChangeMonth={handleChangeMonth}
                  isDayDisabled={isDayDisabled}
                  enableSwipe
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-studio-green uppercase tracking-widest mb-3">
                  Horários Disponíveis
                </label>
                {isLoadingMonth && !availableSlots.length ? (
                  <div className="text-center text-gray-400 text-xs py-4">Carregando horários...</div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center text-gray-400 text-xs py-4">
                    Sem horários disponíveis para esta data.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {availableSlots.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`px-3 py-3 rounded-2xl border text-xs font-bold transition ${
                          selectedTime === time
                            ? "bg-studio-green-dark text-white border-studio-green-dark"
                            : "bg-white border-stone-200 text-gray-500 hover:border-studio-green hover:text-studio-green"
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {step === "LOCATION" && (
          <section className="flex-1 flex flex-col px-6 pb-28 pt-6 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-right-6 duration-500">
            <div className="mb-6">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {stepLabels.LOCATION}
              </span>
              <StepTabs />
              <h2 className="text-3xl font-serif text-studio-text mt-2">Onde será?</h2>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setIsHomeVisit(false);
                  setDisplacementEstimate(null);
                  setDisplacementStatus("idle");
                  setDisplacementError(null);
                }}
                className={`w-full bg-white border rounded-3xl p-5 shadow-soft text-left transition ${
                  !isHomeVisit ? "border-studio-green bg-green-50/50" : "border-stone-100"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-lg text-studio-text mb-1">No Estúdio</p>
                    <p className="text-xs text-gray-400">Endereço do estúdio</p>
                  </div>
                  <span className="font-bold text-studio-green">
                    R$ {Number(selectedService?.price ?? 0).toFixed(2)}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectedService?.accepts_home_visit && setIsHomeVisit(true)}
                className={`w-full bg-white border rounded-3xl p-5 shadow-soft text-left transition ${
                  isHomeVisit ? "border-studio-green bg-green-50/50" : "border-stone-100"
                } ${!selectedService?.accepts_home_visit ? "opacity-40 cursor-not-allowed" : ""}`}
                disabled={!selectedService?.accepts_home_visit}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-lg text-studio-text mb-1">Em Domicílio</p>
                    <p className="text-xs text-gray-400">Levamos a maca e materiais até você</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-studio-green block">
                      R$ {Number(totalPrice).toFixed(2)}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      {displacementEstimate
                        ? `Taxa R$ ${displacementEstimate.fee.toFixed(2)}`
                        : "Taxa calculada por endereço"}
                    </span>
                  </div>
                </div>
              </button>

              {isHomeVisit && (
                <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {hasSuggestedAddress && useSuggestedAddress === null && (
                    <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-soft space-y-3">
                      <div className="flex items-center gap-2 text-studio-green">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase">Endereço encontrado</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {suggestedClient?.address_logradouro}
                        {suggestedClient?.address_numero
                          ? `, ${suggestedClient.address_numero}`
                          : ""}
                        {suggestedClient?.address_bairro
                          ? ` - ${suggestedClient.address_bairro}`
                          : ""}
                      </p>
                      <p className="text-xs text-gray-400">Deseja usar este endereço?</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setUseSuggestedAddress(true);
                            applySuggestedAddress();
                            setAddressMode(null);
                          }}
                          className="flex-1 h-10 rounded-full bg-studio-green text-white text-xs font-bold uppercase tracking-widest"
                        >
                          Usar este
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUseSuggestedAddress(false);
                            clearAddressFields();
                            setAddressMode("cep");
                            setDisplacementEstimate(null);
                            setDisplacementStatus("idle");
                            setDisplacementError(null);
                          }}
                          className="flex-1 h-10 rounded-full border border-stone-200 text-xs font-bold text-gray-500 uppercase tracking-widest"
                        >
                          Outro
                        </button>
                      </div>
                    </div>
                  )}

                  {hasSuggestedAddress && useSuggestedAddress === true && (
                    <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-soft space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-studio-green">
                          <MapPin className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase">Endereço selecionado</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUseSuggestedAddress(false)}
                          className="text-[10px] font-bold text-gray-400 uppercase"
                        >
                          Alterar
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {logradouro}
                        {numero ? `, ${numero}` : ""}
                        {bairro ? ` - ${bairro}` : ""}
                      </p>
                    </div>
                  )}

                  {(!hasSuggestedAddress || useSuggestedAddress === false) && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-px bg-gray-200 flex-1" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          Preencha o Endereço
                        </span>
                        <div className="h-px bg-gray-200 flex-1" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setAddressMode("cep")}
                          className={`rounded-2xl border px-4 py-3 text-xs font-bold uppercase ${
                            addressMode === "cep"
                              ? "border-studio-green bg-green-50 text-studio-green"
                              : "border-stone-200 text-gray-500"
                          }`}
                        >
                          Buscar por CEP
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddressMode("text");
                            setIsAddressSearchModalOpen(true);
                          }}
                          className={`rounded-2xl border px-4 py-3 text-xs font-bold uppercase ${
                            addressMode === "text"
                              ? "border-studio-green bg-green-50 text-studio-green"
                              : "border-stone-200 text-gray-500"
                          }`}
                        >
                          Buscar endereço
                        </button>
                      </div>

                      {addressMode === "cep" && (
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                                CEP
                              </label>
                              <input
                                value={cep}
                                onChange={(event) => {
                                  setCep(formatCep(event.target.value));
                                  setCepStatus("idle");
                                }}
                                className="w-full bg-white border border-stone-100 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700"
                                inputMode="numeric"
                                placeholder="00000-000"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleCepLookup}
                              className="bg-gray-100 hover:bg-gray-200 text-studio-text font-bold rounded-2xl px-4 mt-5 transition-colors"
                            >
                              Buscar
                            </button>
                          </div>
                        </div>
                      )}

                      {addressMode === "text" && (
                        <div className="bg-white border border-stone-100 rounded-2xl p-4 text-sm text-gray-500">
                          <p>Procure seu endereço completo.</p>
                          <button
                            type="button"
                            onClick={() => setIsAddressSearchModalOpen(true)}
                            className="mt-3 text-xs font-bold text-studio-green uppercase tracking-widest"
                          >
                            Buscar endereço
                          </button>
                        </div>
                      )}

                      {addressMode && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                              Rua / Av
                            </label>
                            <input
                              value={logradouro}
                              onChange={(event) => setLogradouro(event.target.value)}
                              className="w-full bg-white border border-stone-100 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700"
                              placeholder="Endereço"
                            />
                          </div>

                          <div className="flex gap-3">
                            <div className="w-1/3">
                              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                                Número
                              </label>
                              <input
                                value={numero}
                                onChange={(event) => setNumero(event.target.value)}
                                className="w-full bg-white border border-stone-100 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700"
                                placeholder="Nº"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                                Complemento
                              </label>
                              <input
                                value={complemento}
                                onChange={(event) => setComplemento(event.target.value)}
                                className="w-full bg-white border border-stone-100 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700"
                                placeholder="Apto/Bloco"
                              />
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                                Bairro
                              </label>
                              <input
                                value={bairro}
                                onChange={(event) => setBairro(event.target.value)}
                                className="w-full bg-white border border-stone-100 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700"
                                placeholder="Bairro"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                                Cidade
                              </label>
                              <input
                                value={cidade}
                                onChange={(event) => setCidade(event.target.value)}
                                className="w-full bg-white border border-stone-100 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700"
                                placeholder="Cidade"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                              Estado
                            </label>
                            <input
                              value={estado}
                              onChange={(event) => setEstado(event.target.value.toUpperCase())}
                              maxLength={2}
                              className="w-full bg-white border border-stone-100 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 uppercase"
                              placeholder="UF"
                            />
                          </div>

                          {mapsQuery && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                mapsQuery
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-studio-green font-semibold"
                            >
                              Ver endereço no Maps
                            </a>
                          )}
                        </div>
                      )}

                      <div className="rounded-2xl border border-stone-100 bg-white p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                          Taxa de deslocamento
                        </p>
                        {displacementStatus === "loading" && (
                          <p className="text-sm font-semibold text-studio-text">
                            Calculando com base no trajeto de carro...
                          </p>
                        )}
                        {displacementStatus !== "loading" && displacementEstimate && (
                          <div className="space-y-1">
                            <p className="text-base font-bold text-studio-green">
                              R$ {displacementEstimate.fee.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Distância estimada: {displacementEstimate.distanceKm.toFixed(2)} km (
                              {displacementEstimate.rule === "urban" ? "regra urbana" : "regra rodoviária"}).
                            </p>
                          </div>
                        )}
                        {displacementStatus === "idle" && !displacementEstimate && (
                          <p className="text-xs text-gray-500">
                            Informe o endereço para calcular automaticamente a taxa.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {step === "CONFIRM" && (
          <section className="flex-1 flex flex-col px-6 pb-32 pt-3 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-right-6 duration-500">
            <div className="mb-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {stepLabels.CONFIRM}
              </span>
              <StepTabs />
              <h2 className="text-2xl font-serif text-studio-text mt-3">Tudo certo?</h2>
            </div>

            <div className="bg-white rounded-3xl shadow-soft border border-stone-100 p-6 space-y-5">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Cliente
                </p>
                <p className="text-base font-bold text-studio-text">
                  {resolvedClientFullName || "Cliente"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Serviço
                </p>
                <p className="font-serif text-lg text-studio-text">
                  {selectedService?.name}
                </p>
              </div>

              <div className="border-t-2 border-dashed border-gray-100" />

              <div className="space-y-2 text-sm text-gray-500 font-semibold">
                <div className="flex justify-between">
                  <span>Data</span>
                  <span>
                    {format(selectedDateObj, "dd/MM")} às {selectedTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Local</span>
                  <span>{isHomeVisit ? "Em Domicílio" : "No Estúdio"}</span>
                </div>
              </div>

              <div className="bg-white border border-stone-200 rounded-2xl px-4 py-3 flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Total
                </span>
                <span className="text-lg font-bold text-studio-green">
                  R$ {totalPrice.toFixed(2)}
                </span>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Forma de pagamento
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectPayment("pix")}
                    className={`py-3 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === "pix"
                        ? "bg-green-50 border-studio-green text-studio-green"
                        : "bg-white border-stone-200 text-gray-500"
                    }`}
                  >
                    <QrCode className="w-4 h-4" /> PIX
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPayment("card")}
                    className={`py-3 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === "card"
                        ? "bg-green-50 border-studio-green text-studio-green"
                        : "bg-white border-stone-200 text-gray-500"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" /> Cartão
                  </button>
                </div>
                {!paymentMethod && (
                  <p className="mt-2 text-xs text-gray-400">Selecione Pix ou Cartão para continuar.</p>
                )}
              </div>

              <p className="text-[10px] text-center text-gray-400">
                Protocolo: {protocol || "AGD-000"}
              </p>
            </div>
          </section>
        )}

        {step === "PAYMENT" && (
          <section className="flex-1 flex flex-col px-6 pb-32 pt-3 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-right-6 duration-500">

            <div className="mb-6">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Etapa Final
              </span>
              <h2 className="text-3xl font-serif text-studio-text mt-2">Pagamento</h2>
            </div>

            <div className="bg-white p-6 rounded-[28px] border border-stone-100 shadow-soft mb-6">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-bold text-gray-500">Total a pagar</span>
                <span className="text-2xl font-serif font-bold text-studio-text">
                  R$ {payableSignalAmount.toFixed(2)}
                </span>
              </div>
              {signalAmountWasAdjusted && (
                <p className="text-[11px] text-amber-700 mb-4">
                  Valor mínimo do Mercado Pago: R$ 1,00. O sinal foi ajustado para esse mínimo.
                </p>
              )}
              <p className="text-xs text-gray-400 mb-4">
                Método selecionado:{" "}
                <span className="font-bold text-studio-text">
                  {paymentMethod === "pix" ? "Pix" : "Cartão"}
                </span>
              </p>

              {paymentMethod === "pix" && (
                <div className="space-y-4">
                  <div className="text-center bg-stone-50 rounded-2xl p-6 border border-dashed border-gray-300">
                    {pixPayment?.qr_code_base64 ? (
                      <div className="w-32 h-32 bg-white mx-auto rounded-xl flex items-center justify-center shadow-sm mb-4">
                        <Image
                          src={`data:image/png;base64,${pixPayment.qr_code_base64}`}
                          alt="QR Code Pix"
                          width={160}
                          height={160}
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 bg-white mx-auto rounded-xl flex items-center justify-center shadow-sm mb-4">
                        <QrCode className="w-16 h-16 text-studio-text" />
                      </div>
                    )}
                    <p className="text-xs font-bold text-studio-green uppercase mb-2">
                      {pixStatus === "loading" ? "Gerando Pix..." : "Aguardando Pagamento"}
                    </p>
                    <p className="text-xs text-gray-400">QR Code do Mercado Pago</p>
                    {pixPayment && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <span>Tempo máximo para pagamento</span>
                          <span className="font-bold text-studio-text">{pixRemainingLabel}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                          <div
                            className="h-full bg-studio-green transition-[width] duration-1000"
                            style={{ width: `${pixProgressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {pixPayment?.qr_code && (
                    <div className="bg-white border border-gray-200 rounded-xl p-3 text-[11px] text-gray-600 wrap-break-word">
                      {pixPayment.qr_code}
                    </div>
                  )}

                  {pixQrExpired && <span className="sr-only">QR Code expirado</span>}

                  <button
                    type="button"
                    onClick={handleCopyPix}
                    disabled={!pixPayment?.qr_code || pixStatus === "loading" || pixQrExpired}
                    className="w-full border-2 border-dashed border-studio-green text-studio-green font-bold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <Copy className="w-4 h-4" /> Copiar chave Pix
                  </button>
                  <p className="text-[11px] text-center text-gray-500">
                    Assim que o Pix for aprovado, esta tela avança automaticamente.
                  </p>
                </div>
              )}

              {paymentMethod === "card" && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Pagamento com cartão
                  </p>

                  <form id="mp-card-form" className="grid gap-3">
                    <div
                      className="h-12 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm"
                      id="mp-card-number"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className="h-12 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm"
                        id="mp-card-expiration"
                      />
                      <div
                        className="h-12 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm"
                        id="mp-card-security"
                      />
                    </div>
                    <input
                      id="mp-cardholder-name"
                      name="cardholderName"
                      defaultValue={resolvedClientFullName}
                      placeholder="Nome no cartão"
                      className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-gray-700"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        id="mp-card-issuer"
                        name="issuer"
                        className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-gray-700"
                      />
                      <select
                        id="mp-card-installments"
                        name="installments"
                        className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-gray-700"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        id="mp-card-identification-type"
                        name="identificationType"
                        className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-gray-700"
                      />
                      <input
                        id="mp-card-identification-number"
                        name="identificationNumber"
                        placeholder="CPF"
                        className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-gray-700"
                      />
                    </div>
                    <input
                      id="mp-card-email"
                      name="cardholderEmail"
                      type="email"
                      readOnly
                      value={normalizedClientEmail}
                      className="hidden"
                    />
                    <button
                      type="submit"
                      className="w-full h-12 rounded-2xl bg-studio-green text-white font-bold text-sm uppercase tracking-wide"
                      disabled={cardStatus === "loading"}
                    >
                      {cardStatus === "loading" ? "Processando cartão..." : "Pagar com cartão"}
                    </button>
                  </form>
                </div>
              )}

              {appointmentId && (
                <p className="text-[10px] text-gray-400 mt-4">Agendamento #{appointmentId}</p>
              )}
            </div>
          </section>
        )}

        {step === "SUCCESS" && (
          <section className="flex-1 flex flex-col justify-center items-center text-center px-6 pb-10 pt-3 animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-studio-green mb-6 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-serif text-studio-text mb-4">Agendado!</h2>
            <p className="text-gray-500 text-sm max-w-70 leading-relaxed mb-8">
              Tudo pronto. Te esperamos para o seu momento de cuidado.
            </p>

            <div className="bg-white w-full p-6 rounded-2xl border border-gray-100 text-left mb-8 shadow-soft">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-xs font-bold text-gray-400 uppercase">Data</span>
                <span className="text-sm font-bold text-studio-text">
                  {format(selectedDateObj, "dd/MM")} - {selectedTime}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-xs font-bold text-gray-400 uppercase">Serviço</span>
                <span className="text-sm font-bold text-studio-text text-right truncate w-32">
                  {selectedService?.name}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-xs font-bold text-gray-400 uppercase">Protocolo</span>
                <span className="text-sm font-mono text-gray-500">{protocol || "AGD"}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsVoucherOpen(true)}
              className="w-full h-14 rounded-2xl bg-white border border-stone-100 text-studio-text font-bold uppercase tracking-widest text-xs hover:bg-stone-50 transition-colors mb-3"
            >
              Ver voucher
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="w-full h-14 rounded-2xl border border-stone-100 bg-white text-studio-text font-bold uppercase tracking-widest text-xs hover:bg-stone-50 transition-colors mb-4"
            >
              Novo Agendamento
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-studio-green"
            >
              Voltar ao Início
            </button>
          </section>
        )}
      </main>

      {showCardProcessingOverlay && (
        <div className="absolute inset-0 z-40 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-studio-text/45 backdrop-blur-[2px]" />
          <div className="relative w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-studio-green/10">
              <div className="h-7 w-7 rounded-full border-[3px] border-studio-green/30 border-t-studio-green animate-spin" />
            </div>
            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-studio-green">
              Processando pagamento
            </p>
            <h3 className="mt-2 text-center text-xl font-serif text-studio-text">
              {currentCardProcessingStage.title}
            </h3>
            <p className="mt-1 text-center text-xs text-gray-500">
              {currentCardProcessingStage.description}
            </p>

            <div className="mt-5 space-y-2">
              {cardProcessingStages.map((stage, index) => {
                const isDone = index < cardProcessingStageIndex;
                const isActive = index === cardProcessingStageIndex;
                return (
                  <div key={stage.title} className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                        isDone
                          ? "border-studio-green bg-studio-green"
                          : isActive
                            ? "border-studio-green bg-studio-green/20"
                            : "border-stone-300 bg-stone-100"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      ) : isActive ? (
                        <Sparkles className="h-2.5 w-2.5 text-studio-green animate-pulse" />
                      ) : null}
                    </span>
                    <span
                      className={`text-xs ${
                        isDone || isActive ? "text-studio-text font-semibold" : "text-gray-400"
                      }`}
                    >
                      {stage.title}
                    </span>
                  </div>
                );
              })}
            </div>

            {cardAwaitingConfirmation && (
              <p className="mt-4 text-center text-[11px] text-gray-500">
                Aguardando confirmação da operadora. Não feche esta tela.
              </p>
            )}
          </div>
        </div>
      )}

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

      {isAddressSearchModalOpen && (
        <div className="absolute inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={closeAddressSearchModal}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-4xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-studio-text">Buscar endereço</h3>
                <p className="text-xs text-gray-400">Digite rua, número, bairro...</p>
              </div>
              <button
                type="button"
                onClick={closeAddressSearchModal}
                className="w-9 h-9 bg-stone-50 rounded-full text-gray-400 flex items-center justify-center hover:bg-stone-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={addressSearchQuery}
                onChange={(event) => setAddressSearchQuery(event.target.value)}
                className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700"
                placeholder="Digite o endereço"
              />

              {addressSearchLoading && (
                <p className="text-xs text-gray-400">Buscando endereços...</p>
              )}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {addressSearchResults.map((result) => (
                  <button
                    key={result.placeId}
                    type="button"
                    onClick={() => handleSelectAddressResult(result)}
                    className="w-full text-left bg-white border border-stone-100 rounded-2xl px-4 py-3 text-sm text-gray-600 hover:border-studio-green hover:text-studio-green transition"
                  >
                    {result.label}
                  </button>
                ))}
                {!addressSearchLoading &&
                  addressSearchQuery.trim().length >= 3 &&
                  addressSearchResults.length === 0 && (
                    <p className="text-xs text-gray-400">Nenhum endereço encontrado.</p>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showFooter && (
        <footer className="absolute bottom-0 left-0 right-0 bg-studio-bg border-t border-stone-100 z-20">
          <div className={`flex gap-3 px-6 py-4 ${showNextButton ? "" : "justify-start"}`}>
            <button
              type="button"
              onClick={handleBack}
              className="w-12 h-12 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-studio-text transition-colors shadow-soft"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {showNextButton && (
              <button
                type="button"
                onClick={handleNext}
                disabled={isNextDisabled}
                className="flex-1 h-12 bg-studio-green-dark text-white rounded-full font-bold uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-2 hover:bg-studio-green transition-colors disabled:opacity-40"
              >
                <span>{nextLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </footer>
      )}

      <Toast toast={toast} />
    </div>
  );
}
