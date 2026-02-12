"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Script from "next/script";
import html2canvas from "html2canvas";
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
  QrCode,
  Sparkles,
} from "lucide-react";
import { submitPublicAppointment } from "./public-actions/appointments";
import { lookupClientByPhone } from "./public-actions/clients";
import { createCardPayment, createPixPayment } from "./public-actions/payments";
import { getAvailableSlots } from "./availability";
import { fetchAddressByCep, normalizeCep } from "../../../../src/shared/address/cep";
import { MonthCalendar } from "../../../../components/agenda/month-calendar";
import { formatBrazilPhone } from "../../../../src/shared/phone";
import { VoucherOverlay } from "./components/voucher-overlay";

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
  issuerId: string;
  installments: string | number;
  identificationType: string;
  identificationNumber: string;
  cardholderEmail: string;
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

const progressSteps: Step[] = ["IDENT", "SERVICE", "DATETIME", "LOCATION", "CONFIRM"];

const footerSteps: Step[] = ["IDENT", "SERVICE", "DATETIME", "LOCATION", "CONFIRM"];

const stepLabels: Partial<Record<Step, string>> = {
  IDENT: "Passo 1 de 5",
  SERVICE: "Passo 2 de 5",
  DATETIME: "Passo 3 de 5",
  LOCATION: "Passo 4 de 5",
  CONFIRM: "Passo 5 de 5",
};

export function BookingFlow({
  tenant,
  services,
  signalPercentage,
  whatsappNumber,
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
  const [clientPhone, setClientPhone] = useState("");
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
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const [displacementEstimate, setDisplacementEstimate] = useState<DisplacementEstimate | null>(
    null
  );
  const [displacementStatus, setDisplacementStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [displacementError, setDisplacementError] = useState<string | null>(null);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error" | "success">(
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
  } | null>(null);
  const [pixStatus, setPixStatus] = useState<"idle" | "loading" | "error">("idle");
  const [pixError, setPixError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [cardStatus, setCardStatus] = useState<"idle" | "loading" | "error">("idle");
  const [cardError, setCardError] = useState<string | null>(null);
  const [mpReady, setMpReady] = useState(false);
  const cardFormRef = useRef<CardFormInstance | null>(null);
  const voucherRef = useRef<HTMLDivElement | null>(null);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [voucherBusy, setVoucherBusy] = useState(false);
  const [suggestedClient, setSuggestedClient] = useState<{
    name: string | null;
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
  void signalAmount;
  const cardholderEmail = useMemo(() => {
    const digits = clientPhone.replace(/\D/g, "");
    return `cliente+${digits || "anon"}@corpoealmahumanizado.com.br`;
  }, [clientPhone]);

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

  const progressIndex = progressSteps.indexOf(step);
  const showFooter = step !== "WELCOME" && step !== "SUCCESS";
  const showNextButton = step !== "PAYMENT";

  const availableSlots = monthAvailability[date] ?? [];

  const calculateDisplacement = useCallback(async () => {
    if (!requiresAddress || !addressComplete) {
      setDisplacementEstimate(null);
      setDisplacementStatus("idle");
      setDisplacementError(null);
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
    } catch (error) {
      setDisplacementEstimate(null);
      setDisplacementStatus("error");
      setDisplacementError(
        error instanceof Error ? error.message : "Não foi possível calcular a taxa de deslocamento."
      );
    }
  }, [addressComplete, bairro, cep, cidade, complemento, estado, logradouro, numero, requiresAddress]);

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
    if (!isPhoneValid) {
      setClientLookupStatus("idle");
      setSuggestedClient(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      const lookupPhone = formattedPhoneDigits;
      setClientLookupStatus("loading");
      setSuggestedClient(null);
      const result = await lookupClientByPhone({ tenantId: tenant.id, phone: lookupPhone });
      if (lookupPhone !== formattedPhoneDigits) {
        return;
      }
      if (!result.ok) {
        setClientLookupStatus("not_found");
        return;
      }
      if (result.data.client) {
        setSuggestedClient({
          name: result.data.client.name ?? null,
          address_cep: result.data.client.address_cep ?? null,
          address_logradouro: result.data.client.address_logradouro ?? null,
          address_numero: result.data.client.address_numero ?? null,
          address_complemento: result.data.client.address_complemento ?? null,
          address_bairro: result.data.client.address_bairro ?? null,
          address_cidade: result.data.client.address_cidade ?? null,
          address_estado: result.data.client.address_estado ?? null,
        });
        setClientLookupStatus("found");
      } else {
        setClientLookupStatus("not_found");
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [formattedPhoneDigits, isPhoneValid, tenant.id]);

  const handleConfirmSuggestedClient = () => {
    if (!suggestedClient) return;
    setClientName(suggestedClient.name ?? "");
    setClientLookupStatus("confirmed");
    setUseSuggestedAddress(null);
  };

  const handleDeclineSuggestedClient = () => {
    setSuggestedClient(null);
    setClientLookupStatus("declined");
    setClientName("");
    setUseSuggestedAddress(null);
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
      return;
    }
    setCepStatus("loading");
    const result = await fetchAddressByCep(normalized);
    if (!result) {
      setCepStatus("error");
      return;
    }
    setLogradouro(result.logradouro);
    setBairro(result.bairro);
    setCidade(result.cidade);
    setEstado(result.estado);
    setCepStatus("success");
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
      } finally {
        setAddressSearchLoading(false);
      }
    };
    runSearch();
    return () => controller.abort();
  }, [addressSearchQuery, isAddressSearchModalOpen]);

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
      setAddressSearchLoading(false);
    }
  };

  const ensureAppointment = useCallback(async () => {
    if (appointmentId) return appointmentId;
    if (!selectedService || !date || !selectedTime || !clientName) return null;

    setIsSubmitting(true);
    try {
      const result = await submitPublicAppointment({
        tenantSlug: tenant.slug,
        serviceId: selectedService.id,
        date,
        time: selectedTime,
        clientName,
        clientPhone,
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
        alert(result.error.message);
        return null;
      }
      const createdId = result.data.appointmentId ?? null;
      setAppointmentId(createdId);
      return createdId;
    } catch {
      alert("Erro ao agendar. Tente novamente.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    appointmentId,
    bairro,
    cep,
    cidade,
    clientName,
    clientPhone,
    complemento,
    date,
    displacementEstimate?.distanceKm,
    displacementEstimate?.fee,
    estado,
    isHomeVisit,
    logradouro,
    numero,
    selectedService,
    selectedTime,
    tenant.slug,
  ]);

  const handleCopyPix = async () => {
    try {
      if (!pixPayment?.qr_code) {
        window.alert("Gere o Pix antes de copiar a chave.");
        return;
      }
      await navigator.clipboard.writeText(pixPayment.qr_code);
      window.alert("Chave Pix copiada!");
    } catch {
      window.alert("Copiar chave Pix ainda não está disponível.");
    }
  };

  const handleCreatePix = async () => {
    if (!selectedService) return;
    const ensuredId = appointmentId ?? (await ensureAppointment());
    if (!ensuredId) return;
    setPixStatus("loading");
    setPixError(null);
    try {
      const result = await createPixPayment({
        appointmentId: ensuredId,
        tenantId: tenant.id,
        amount: signalAmount,
        description: `Sinal ${selectedService.name}`,
        payerName: clientName,
        payerPhone: clientPhone,
      });
      if (!result.ok) {
        setPixStatus("error");
        setPixError(result.error.message);
        return;
      }
      setPixPayment(result.data);
      setPixStatus("idle");
    } catch {
      setPixStatus("error");
      setPixError("Erro ao gerar Pix. Tente novamente.");
    }
  };

  useEffect(() => {
    if (paymentMethod === "pix") {
      setCardError(null);
      setCardStatus("idle");
    }
    if (paymentMethod === "card") {
      setPixError(null);
      setPixStatus("idle");
    }
  }, [paymentMethod]);

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
    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
    if (!publicKey) {
      setCardError("Chave pública do Mercado Pago ausente.");
      return;
    }
    if (!mpReady) return;
    if (!window.MercadoPago) {
      setCardError("Não foi possível carregar o formulário de cartão.");
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
      amount: signalAmount.toFixed(2),
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
          }
        },
        onSubmit: async (event) => {
          event.preventDefault();
          if (!selectedService) return;
          const data = cardFormRef.current?.getCardFormData();
          if (!data?.token || !data.paymentMethodId) {
            setCardError("Preencha os dados do cartão para continuar.");
            return;
          }
          setCardStatus("loading");
          setCardError(null);
          const ensuredId = appointmentId ?? (await ensureAppointment());
          if (!ensuredId) {
            setCardStatus("error");
            setCardError("Não foi possível registrar o agendamento.");
            return;
          }
          const result = await createCardPayment({
            appointmentId: ensuredId,
            tenantId: tenant.id,
            amount: signalAmount,
            description: `Sinal ${selectedService.name}`,
            token: data.token,
            paymentMethodId: data.paymentMethodId,
            issuerId: data.issuerId,
            installments: Number(data.installments) || 1,
            payerEmail: data.cardholderEmail || cardholderEmail,
            payerName: clientName,
            payerPhone: clientPhone,
            identificationType: data.identificationType,
            identificationNumber: data.identificationNumber,
          });
          if (!result.ok) {
            setCardStatus("error");
            setCardError(result.error.message);
            return;
          }
          setCardStatus("idle");
          if (result.data.status === "approved") {
            setStep("SUCCESS");
          } else {
            setCardError(
              "Pagamento em processamento. Você receberá a confirmação assim que for aprovado."
            );
          }
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
    };
  }, [
    appointmentId,
    cardholderEmail,
    clientName,
    clientPhone,
    ensureAppointment,
    mpReady,
    paymentMethod,
    selectedService,
    signalAmount,
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

  const handleFinalizePix = async () => {
    if (!appointmentId) {
      const ensuredId = await ensureAppointment();
      if (!ensuredId) return;
    }
    setStep("SUCCESS");
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
      setCardError(null);
      setCardStatus("idle");
    }
    if (method === "card") {
      setPixError(null);
      setPixStatus("idle");
    }
    setPaymentMethod(method);
  };

  const renderVoucherCanvas = async () => {
    if (!voucherRef.current) return null;
    setVoucherBusy(true);
    try {
      if (typeof document !== "undefined" && document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const canvas = await html2canvas(voucherRef.current, {
        backgroundColor: "#faf9f6",
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: -window.scrollY,
        onclone: (doc) => {
          const clone = doc.querySelector("[data-voucher-capture='true']") as HTMLElement | null;
          if (!clone) return;

          const normalizeColor = (value: string) => {
            if (!value) return value;
            if (!/oklab|color-mix/i.test(value)) return value;
            const helper = doc.createElement("div");
            helper.style.color = value;
            doc.body.appendChild(helper);
            const resolved = doc.defaultView?.getComputedStyle(helper).color;
            helper.remove();
            return resolved || value;
          };

          const normalizeShadow = (value: string) => {
            if (!value) return value;
            return /oklab|color-mix/i.test(value) ? "none" : value;
          };

          const elements = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
          elements.forEach((el) => {
            const style = doc.defaultView?.getComputedStyle(el);
            if (!style) return;
            el.style.setProperty("background-color", normalizeColor(style.backgroundColor));
            el.style.setProperty("color", normalizeColor(style.color));
            el.style.setProperty("border-color", normalizeColor(style.borderColor));
            el.style.setProperty("box-shadow", normalizeShadow(style.boxShadow));
            el.style.setProperty("font-family", style.fontFamily);
            el.style.setProperty("font-size", style.fontSize);
            el.style.setProperty("font-weight", style.fontWeight);
            el.style.setProperty("border-radius", style.borderRadius);
          });
        },
      });
      return canvas;
    } catch {
      return null;
    } finally {
      setVoucherBusy(false);
    }
  };

  const handleDownloadVoucher = async () => {
    const canvas = await renderVoucherCanvas();
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), "image/png")
    );
    if (!blob) return;

    const objectUrl = URL.createObjectURL(blob);
    const isIOS = /iPad|iPhone|iPod/i.test(window.navigator.userAgent);
    try {
      if (isIOS) {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
        return;
      }

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `voucher-${protocol || "agendamento"}.png`;
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    }
  };

  const handleShareVoucher = async () => {
    const canvas = await renderVoucherCanvas();
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), "image/png")
    );
    if (!blob) return;

    const file = new File([blob], `voucher-${protocol || "agendamento"}.png`, {
      type: "image/png",
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Voucher do Agendamento",
          text: "Segue o voucher do seu agendamento.",
        });
        return;
      } catch {
        // fallback below
      }
    }

    const message = encodeURIComponent(
      "Segue o voucher do seu agendamento. Baixe a imagem e envie pelo WhatsApp."
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

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
    setClientPhone("");
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
    setPixPayment(null);
    setPixStatus("idle");
    setPixError(null);
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
    const currentIndex = footerSteps.indexOf(step);
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
    const currentIndex = footerSteps.indexOf(step);
    if (currentIndex > 0) {
      const previousStep = footerSteps[currentIndex - 1];
      if (previousStep) {
        setStep(previousStep);
      }
    }
  };

  const isNextDisabled = useMemo(() => {
    if (step === "IDENT") {
      return !isPhoneValid || !clientName.trim() || clientLookupStatus === "found";
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
      return isSubmitting;
    }
    return false;
  }, [
    addressComplete,
    displacementReady,
    clientLookupStatus,
    clientName,
    date,
    isPhoneValid,
    isSubmitting,
    selectedService,
    selectedTime,
    step,
  ]);

  const nextLabel = step === "CONFIRM" ? "Ir para Pagamento" : "Continuar";

  const handleTalkToFlora = () => {
    if (whatsappLink) {
      window.open(whatsappLink, "_blank");
    } else {
      alert("WhatsApp ainda não configurado pelo estúdio.");
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center">
            <Image
              src="/brand/logo.png"
              alt="Estúdio Corpo & Alma Humanizado"
              width={22}
              height={22}
              className="h-5 w-5 object-contain"
              priority
            />
          </div>
          <div className="leading-tight">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Agendamento online
            </p>
            <p className="text-sm font-serif text-studio-text">
              Estúdio Corpo & Alma Humanizado
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cliente</p>
          <p className="text-sm font-bold text-studio-text">{clientName || "Visitante"}</p>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col">
        {step === "WELCOME" && (
          <section className="flex-1 flex flex-col justify-between px-6 pb-10 pt-3 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="pt-8 text-center">
              <div className="w-20 h-20 bg-white rounded-full mx-auto mb-8 flex items-center justify-center shadow-soft">
                <Image
                  src="/brand/logo.png"
                  alt="Estúdio Corpo & Alma Humanizado"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
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

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-studio-green uppercase tracking-widest mb-2">
                  Seu WhatsApp
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  className="w-full bg-transparent border-b-2 border-gray-200 py-4 text-center text-2xl font-serif text-studio-text outline-none transition focus:border-studio-green"
                  placeholder="(00) 00000-0000"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(formatBrazilPhone(event.target.value))}
                />
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Vamos buscar seu cadastro pelo número.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-100 flex items-start gap-3">
                <span className="text-lg">💡</span>
                <p className="text-xs text-gray-400 leading-relaxed text-left">
                  Já é cliente? Digite seu WhatsApp e preencheremos tudo para você.
                </p>
              </div>

              {clientLookupStatus === "loading" && (
                <p className="text-xs text-gray-400 text-center">Verificando cadastro...</p>
              )}

              {clientLookupStatus === "found" && suggestedClient && (
                <div className="bg-white border border-stone-100 rounded-2xl p-4 shadow-soft flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Você é</p>
                    <p className="text-sm font-bold text-gray-800">{suggestedClient.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmSuggestedClient}
                      className="px-3 py-1.5 rounded-full bg-studio-green text-white text-[11px] font-bold"
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={handleDeclineSuggestedClient}
                      className="px-3 py-1.5 rounded-full border border-stone-200 text-[11px] font-bold text-gray-500"
                    >
                      Não
                    </button>
                  </div>
                </div>
              )}

              {clientLookupStatus === "confirmed" && (
                <div className="bg-green-50 text-studio-green text-xs font-bold p-3 rounded-xl text-center">
                  👋 Cadastro confirmado. Bem-vindo(a) de volta!
                </div>
              )}
              {clientLookupStatus === "not_found" && (
                <div className="bg-stone-50 text-gray-400 text-xs font-bold p-3 rounded-xl text-center">
                  ✨ Criando novo cadastro para você.
                </div>
              )}
              {clientLookupStatus === "declined" && (
                <div className="bg-stone-50 text-gray-400 text-xs font-bold p-3 rounded-xl text-center">
                  Tudo bem! Informe seus dados abaixo.
                </div>
              )}

              {clientLookupStatus !== "found" && isPhoneValid && (
                <div className="transition-opacity duration-500">
                  <label className="block text-xs font-bold text-studio-green uppercase tracking-widest mb-2">
                    Seu Nome
                  </label>
                  <input
                    type="text"
                    className="w-full bg-transparent border-b-2 border-gray-200 py-4 text-center text-2xl font-serif text-studio-text outline-none transition focus:border-studio-green"
                    placeholder="Como te chamamos?"
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                  />
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
                        <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded-full uppercase">
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
                          {cepStatus === "error" && (
                            <span className="text-xs text-red-400 font-bold">
                              CEP não encontrado.
                            </span>
                          )}
                          {cepStatus === "success" && (
                            <span className="text-xs text-green-600 font-bold">
                              Endereço encontrado!
                            </span>
                          )}
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
                        {displacementStatus === "error" && (
                          <p className="text-xs text-red-500">{displacementError}</p>
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
                  {clientName || "Cliente"}
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
                  R$ {signalAmount.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-4">Selecione o método:</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
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
                <div className="bg-stone-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center text-xs text-gray-400">
                  Escolha Pix ou Cartão para continuar.
                </div>
              )}

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
                  </div>

                  {pixPayment?.qr_code && (
                    <div className="bg-white border border-gray-200 rounded-xl p-3 text-[11px] text-gray-600 wrap-break-word">
                      {pixPayment.qr_code}
                    </div>
                  )}

                  {pixError && <p className="text-xs text-red-500">{pixError}</p>}

                  <button
                    type="button"
                    onClick={handleCreatePix}
                    className="w-full bg-studio-green text-white font-bold py-3 rounded-2xl"
                    disabled={pixStatus === "loading"}
                  >
                    {pixStatus === "loading" ? "Gerando Pix..." : "Gerar Pix"}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="w-full border-2 border-dashed border-studio-green text-studio-green font-bold py-3 rounded-2xl flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" /> Copiar chave Pix
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalizePix}
                    className="w-full bg-studio-green-dark text-white font-bold py-3 rounded-2xl"
                  >
                    Já fiz o Pix! Finalizar
                  </button>
                </div>
              )}

              {paymentMethod === "card" && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Pagamento com cartão
                  </p>

                  {cardError && <p className="text-xs text-red-500">{cardError}</p>}

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
                      defaultValue={clientName}
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
                      value={cardholderEmail}
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

      <VoucherOverlay
        open={isVoucherOpen}
        busy={voucherBusy}
        onClose={() => setIsVoucherOpen(false)}
        onDownload={handleDownloadVoucher}
        onShare={handleShareVoucher}
        voucherRef={voucherRef}
        clientName={clientName}
        clientPhone={clientPhone}
        formattedDate={format(selectedDateObj, "dd/MM/yyyy")}
        selectedTime={selectedTime}
        selectedServiceName={selectedService?.name ?? "Serviço"}
        selectedServiceDurationMinutes={selectedService?.duration_minutes ?? 0}
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
              {addressSearchError && (
                <p className="text-xs text-red-400">{addressSearchError}</p>
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
                  !addressSearchError &&
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
    </div>
  );
}

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
};
