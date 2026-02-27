"use client";

import {
  Sparkles,
  Phone,
  MapPin,
  Search,
  ChevronDown,
  Building2,
  Car,
  Check,
  X,
  CreditCard,
  Banknote,
  Gift,
} from "lucide-react";
import { eachDayOfInterval, endOfMonth, format, isBefore, isSameMonth, parseISO, startOfDay, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MonthCalendar } from "../../../components/agenda/month-calendar";
import { AttendancePaymentModal } from "../atendimento/[id]/components/attendance-payment-modal";
import {
  createAppointment,
  createAppointmentForImmediateCharge,
  finalizeCreatedAppointmentNotifications,
  getBookingChargeContext,
  getClientAddresses,
  pollBookingPixPaymentStatus,
  pollBookingPointPaymentStatus,
  recordBookingChargePayment,
  recordManualCreatedMessage,
  recordManualPaymentReceiptMessage,
  saveBookingChargeItems,
  saveClientAddress,
  setBookingChargeDiscount,
  createBookingPixPayment,
  createBookingPointPayment,
  updateAppointment,
} from "./appointment-actions"; // Ação importada do arquivo renomeado
import { getAvailableSlots, getDateBlockStatus } from "./availability";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { Toast, useToast } from "../../../components/ui/toast";
import { fetchAddressByCep, normalizeCep } from "../../../src/shared/address/cep";
import type { AutoMessageTemplates } from "../../../src/shared/auto-messages.types";
import { applyAutoMessageTemplate } from "../../../src/shared/auto-messages.utils";
import { feedbackById } from "../../../src/shared/feedback/user-feedback";
import { formatBrazilPhone } from "../../../src/shared/phone";
import { buildAppointmentReceiptPath } from "../../../src/shared/public-links";
import {
  composeInternalClientName,
  normalizeReferenceLabel,
  resolveClientNames,
} from "../../../src/modules/clients/name-profile";
import type { CheckoutItem, CheckoutRow, PaymentRow } from "../../../lib/attendance/attendance-types";

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  accepts_home_visit?: boolean | null;
  custom_buffer_minutes?: number | null;
  description?: string | null;
}

interface AppointmentFormProps {
  services: Service[];
  clients: {
    id: string;
    name: string;
    phone: string | null;
    email?: string | null;
    cpf?: string | null;
    public_first_name?: string | null;
    public_last_name?: string | null;
    internal_reference?: string | null;
  }[];
  safeDate: string;
  initialAppointment?: InitialAppointment | null;
  returnTo?: string;
  messageTemplates: AutoMessageTemplates;
  signalPercentage: number;
  pointEnabled: boolean;
  pointTerminalName: string;
  pointTerminalModel: string;
  publicBaseUrl: string;
  pixKeyValue: string;
  pixKeyType: "cnpj" | "cpf" | "email" | "phone" | "evp" | null;
}

interface ClientAddress {
  id: string;
  label: string;
  is_primary: boolean;
  address_cep: string | null;
  address_logradouro: string | null;
  address_numero: string | null;
  address_complemento: string | null;
  address_bairro: string | null;
  address_cidade: string | null;
  address_estado: string | null;
}

interface AddressSearchResult {
  id: string;
  label: string;
  placeId: string;
}

interface DisplacementEstimate {
  distanceKm: number;
  fee: number;
  rule: "urban" | "road";
}

type AddressModalStep = "chooser" | "cep" | "search" | "form";
type ClientSelectionMode = "idle" | "existing" | "new";
type FinanceDraftItemType = "service" | "fee" | "addon" | "adjustment";
type CollectionTimingDraft = "at_attendance" | "charge_now";
type ChargeNowAmountMode = "full" | "signal";
type ChargeNowMethodDraft = "cash" | "pix_mp" | "card" | "waiver";
type BookingConfirmationStep = "review" | "creating_charge" | "charge_payment" | "charge_manual_prompt";

interface FinanceDraftItem {
  id: string;
  type: FinanceDraftItemType;
  label: string;
  qty: number;
  amount: number;
}

interface ChargeBookingState {
  appointmentId: string;
  date: string;
  startTimeIso: string;
  attendanceCode: string | null;
  appointmentPaymentStatus: string | null;
  checkout: CheckoutRow | null;
  checkoutItems: CheckoutItem[];
  payments: PaymentRow[];
}

type ClientRecordLite = {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  cpf?: string | null;
  public_first_name?: string | null;
  public_last_name?: string | null;
  internal_reference?: string | null;
};

interface InitialAppointment {
  id: string;
  serviceId: string | null;
  date: string;
  time: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string | null;
  isHomeVisit: boolean;
  clientAddressId: string | null;
  addressCep: string | null;
  addressLogradouro: string | null;
  addressNumero: string | null;
  addressComplemento: string | null;
  addressBairro: string | null;
  addressCidade: string | null;
  addressEstado: string | null;
  internalNotes: string | null;
  priceOverride: number | null;
  displacementFee?: number | null;
  displacementDistanceKm?: number | null;
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function normalizeCpfDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(0, 11);
}

function normalizePhoneSearchDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(0, 13);
}

function isValidEmailAddress(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function splitSeedName(value: string) {
  const cleaned = value.trim();
  if (!cleaned) {
    return { firstName: "", lastName: "", reference: "" };
  }
  const match = cleaned.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  const base = (match?.[1] ?? cleaned).trim();
  const reference = normalizeReferenceLabel(match?.[2] ?? "");
  const [firstName, ...rest] = base.split(/\s+/).filter(Boolean);
  return {
    firstName: firstName ?? "",
    lastName: rest.join(" "),
    reference,
  };
}

function parseDecimalText(value: string): number | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;

  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatCurrencyInput(value: number) {
  return Number.isFinite(value) ? value.toFixed(2).replace(".", ",") : "0,00";
}

function formatCurrencyLabel(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildDraftItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildAddressQuery(payload: {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}) {
  const parts = [
    payload.logradouro,
    payload.numero,
    payload.complemento,
    payload.bairro,
    payload.cidade,
    payload.estado,
    payload.cep,
  ].filter((value) => value && value.trim().length > 0);
  return parts.join(", ");
}

function resolvePublicBaseUrl(rawBaseUrl: string) {
  const trimmed = rawBaseUrl.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, "");
  return `https://${trimmed.replace(/\/$/, "")}`;
}

function normalizePhoneForWhatsapp(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function formatClientAddress(address: ClientAddress) {
  const parts = [
    address.address_logradouro,
    address.address_numero,
    address.address_complemento,
    address.address_bairro,
    address.address_cidade,
    address.address_estado,
    address.address_cep,
  ].filter((value) => value && value.trim().length > 0);
  return parts.join(", ");
}

function buildCreatedMessage(params: {
  clientName: string;
  date: string;
  time: string;
  serviceName: string;
  locationLine?: string;
  template: string;
}) {
  const name = params.clientName.trim();
  const greeting = name ? `Olá, ${name}!` : "Olá!";
  const dateTime = params.date && params.time ? `${params.date}T${params.time}:00` : params.date;
  const startDate = dateTime ? parseISO(dateTime) : new Date();
  const dayOfWeek = format(startDate, "EEEE", { locale: ptBR });
  const dayOfWeekLabel = dayOfWeek ? `${dayOfWeek[0]?.toUpperCase() ?? ""}${dayOfWeek.slice(1)}` : "";
  const dateLabel = params.date
    ? format(parseISO(params.date), "dd/MM", { locale: ptBR })
    : format(startDate, "dd/MM", { locale: ptBR });
  const timeLabel = params.time || format(startDate, "HH:mm", { locale: ptBR });
  const dateLine = [dayOfWeekLabel, dateLabel].filter(Boolean).join(", ");
  const serviceSegment = params.serviceName ? ` 💆‍♀️ Serviço: ${params.serviceName}` : "";

  return applyAutoMessageTemplate(params.template, {
    greeting,
    date_line: dateLine,
    time: timeLabel,
    service_name: params.serviceName,
    location_line: params.locationLine || "No estúdio",
    service_segment: serviceSegment,
  }).trim();
}

function buildGoogleMapsSearchHref(query: string | null | undefined) {
  const normalized = (query ?? "").trim();
  if (!normalized) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalized)}`;
}

function GoogleMapsAddressButton({ query }: { query: string | null | undefined }) {
  const href = buildGoogleMapsSearchHref(query);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="shrink-0 w-9 h-9 rounded-xl border border-dom/35 bg-white text-dom-strong hover:bg-dom/15 transition flex items-center justify-center"
      aria-label="Abrir endereço no Google Maps"
      title="Ver no Google Maps"
    >
      <Image
        src="/icons/google-maps-icon-official.svg"
        alt=""
        width={18}
        height={18}
        className="h-4.5 w-4.5"
      />
    </a>
  );
}

export function AppointmentForm({
  services,
  clients,
  safeDate,
  initialAppointment,
  returnTo,
  messageTemplates,
  signalPercentage,
  pointEnabled,
  pointTerminalName,
  pointTerminalModel,
  publicBaseUrl,
  pixKeyValue,
  pixKeyType,
}: AppointmentFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialAppointment);
  const formRef = useRef<HTMLFormElement | null>(null);
  const sendMessageInputRef = useRef<HTMLInputElement | null>(null);
  const sendMessageTextInputRef = useRef<HTMLInputElement | null>(null);
  const clientPhoneInputRef = useRef<HTMLInputElement | null>(null);
  const clientCpfInputRef = useRef<HTMLInputElement | null>(null);
  const clientCreateFirstNameInputRef = useRef<HTMLInputElement | null>(null);
  const [isSendPromptOpen, setIsSendPromptOpen] = useState(false);
  const sectionCardClass = "bg-white rounded-2xl shadow-sm p-5 border border-stone-100";
  const sectionHeaderTextClass = "text-xs font-bold text-gray-400 uppercase tracking-widest";
  const sectionNumberClass =
    "w-5 h-5 rounded-full bg-studio-green/10 text-studio-green flex items-center justify-center text-[10px] font-bold";
  const labelClass = "block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 ml-1";
  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-100 focus:outline-none focus:ring-1 focus:ring-studio-green focus:border-studio-green text-sm text-gray-700 font-medium";
  const inputWithIconClass =
    "w-full pl-11 pr-4 py-3 rounded-xl bg-stone-50 border border-stone-100 focus:outline-none focus:ring-1 focus:ring-studio-green focus:border-studio-green text-sm text-gray-700 font-medium";
  const selectClass =
    "w-full pl-4 pr-10 py-3 rounded-xl bg-stone-50 border border-stone-100 focus:outline-none focus:ring-1 focus:ring-studio-green focus:border-studio-green text-sm text-gray-700 font-medium appearance-none transition-all";
  const initialTimeRef = useRef(initialAppointment?.time ?? "");
  const selectedTimeRef = useRef(initialAppointment?.time ?? "");
  const previousClientIdRef = useRef<string | null>(initialAppointment?.clientId ?? null);
  const hasInitialManualAddress =
    !!initialAppointment?.isHomeVisit &&
    !initialAppointment?.clientAddressId &&
    (initialAppointment?.addressCep ||
      initialAppointment?.addressLogradouro ||
      initialAppointment?.addressNumero ||
      initialAppointment?.addressComplemento ||
      initialAppointment?.addressBairro ||
      initialAppointment?.addressCidade ||
      initialAppointment?.addressEstado);
  const initialAddressMode: "none" | "existing" | "new" = initialAppointment?.clientAddressId
    ? "existing"
    : hasInitialManualAddress
      ? "new"
      : "none";

  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialAppointment?.serviceId ?? "");
  const [displayedPrice, setDisplayedPrice] = useState<string>("");
  const [priceOverride, setPriceOverride] = useState<string>(
    initialAppointment?.priceOverride != null
      ? initialAppointment.priceOverride.toFixed(2).replace(".", ",")
      : ""
  );
  const [servicePriceDraft, setServicePriceDraft] = useState<string>(
    initialAppointment?.priceOverride != null
      ? Math.max(
          initialAppointment.priceOverride - Math.max(initialAppointment.displacementFee ?? 0, 0),
          0
        )
          .toFixed(2)
          .replace(".", ",")
      : ""
  );
  const [financeExtraItems, setFinanceExtraItems] = useState<FinanceDraftItem[]>([]);
  const [financeNewItemLabel, setFinanceNewItemLabel] = useState("");
  const [financeNewItemAmount, setFinanceNewItemAmount] = useState<string>("");
  const [scheduleDiscountType, setScheduleDiscountType] = useState<"value" | "pct">("value");
  const [scheduleDiscountValue, setScheduleDiscountValue] = useState<string>("");
  const [collectionTimingDraft, setCollectionTimingDraft] = useState<CollectionTimingDraft | null>(
    isEditing ? "at_attendance" : null
  );
  const [chargeNowAmountMode, setChargeNowAmountMode] = useState<ChargeNowAmountMode>("full");
  const [hasChargeNowAmountModeChoice, setHasChargeNowAmountModeChoice] = useState<boolean>(isEditing);
  const [chargeNowSignalPercent, setChargeNowSignalPercent] = useState<number>(Math.max(0, signalPercentage ?? 30));
  const [chargeNowCustomAmount, setChargeNowCustomAmount] = useState<string>("");
  const [chargeNowMethodDraft, setChargeNowMethodDraft] = useState<ChargeNowMethodDraft | null>(null);
  const [chargeNowSignalValueConfirmed, setChargeNowSignalValueConfirmed] = useState(false);
  const [confirmationSheetStep, setConfirmationSheetStep] = useState<BookingConfirmationStep>("review");
  const [creatingChargeBooking, setCreatingChargeBooking] = useState(false);
  const [chargeBookingState, setChargeBookingState] = useState<ChargeBookingState | null>(null);
  const [chargeFlowError, setChargeFlowError] = useState<string | null>(null);
  const [chargeNotificationsDispatched, setChargeNotificationsDispatched] = useState(false);
  const [finishingChargeFlow, setFinishingChargeFlow] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(initialAppointment?.date ?? "");
  const [selectedTime, setSelectedTime] = useState<string>(initialAppointment?.time ?? "");
  const [activeMonth, setActiveMonth] = useState<Date>(() =>
    startOfMonth(parseISO(`${(initialAppointment?.date ?? safeDate)}T00:00:00`))
  );
  const [monthAvailability, setMonthAvailability] = useState<Record<string, string[]>>({});
  const [isLoadingMonthAvailability, setIsLoadingMonthAvailability] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialAppointment?.clientId ?? null);
  const [clientSelectionMode, setClientSelectionMode] = useState<ClientSelectionMode>(
    initialAppointment?.clientId ? "existing" : "idle"
  );
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientName, setClientName] = useState(initialAppointment?.clientName ?? "");
  const [clientPhone, setClientPhone] = useState(
    initialAppointment?.clientPhone ? formatBrazilPhone(initialAppointment.clientPhone) : ""
  );
  const [clientCpf, setClientCpf] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientFirstName, setClientFirstName] = useState("");
  const [clientLastName, setClientLastName] = useState("");
  const [clientReference, setClientReference] = useState("");
  const [isClientCreateModalOpen, setIsClientCreateModalOpen] = useState(false);
  const [clientCreateError, setClientCreateError] = useState<string | null>(null);
  const [isHomeVisit, setIsHomeVisit] = useState(initialAppointment?.isHomeVisit ?? false);
  const [hasLocationChoice, setHasLocationChoice] = useState<boolean>(Boolean(initialAppointment));
  const [hasBlocks, setHasBlocks] = useState(false);
  const [hasShiftBlock, setHasShiftBlock] = useState(false);
  const [blockStatus, setBlockStatus] = useState<"idle" | "loading">("idle");
  const [clientAddresses, setClientAddresses] = useState<ClientAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    initialAppointment?.clientAddressId ?? null
  );
  const [addressMode, setAddressMode] = useState<"none" | "existing" | "new">(initialAddressMode);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressModalStep, setAddressModalStep] = useState<AddressModalStep>("chooser");
  const [showAddressSelectionList, setShowAddressSelectionList] = useState(false);
  const [addressConfirmed, setAddressConfirmed] = useState(
    Boolean(initialAppointment?.clientAddressId || hasInitialManualAddress)
  );
  const [cepDraft, setCepDraft] = useState("");
  const [cepDraftStatus, setCepDraftStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [addressSearchResults, setAddressSearchResults] = useState<AddressSearchResult[]>([]);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const [addressSavePending, setAddressSavePending] = useState(false);
  const [addressSaveError, setAddressSaveError] = useState<string | null>(null);
  const [addressIsPrimaryDraft, setAddressIsPrimaryDraft] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [addressLabel, setAddressLabel] = useState("Principal");
  const [cep, setCep] = useState(initialAppointment?.addressCep ?? "");
  const [logradouro, setLogradouro] = useState(initialAppointment?.addressLogradouro ?? "");
  const [numero, setNumero] = useState(initialAppointment?.addressNumero ?? "");
  const [complemento, setComplemento] = useState(initialAppointment?.addressComplemento ?? "");
  const [bairro, setBairro] = useState(initialAppointment?.addressBairro ?? "");
  const [cidade, setCidade] = useState(initialAppointment?.addressCidade ?? "");
  const [estado, setEstado] = useState(initialAppointment?.addressEstado ?? "");
  const [displacementEstimate, setDisplacementEstimate] = useState<DisplacementEstimate | null>(null);
  const [displacementStatus, setDisplacementStatus] = useState<"idle" | "loading" | "error">("idle");
  const [displacementError, setDisplacementError] = useState<string | null>(null);
  const [manualDisplacementFee, setManualDisplacementFee] = useState(
    initialAppointment?.displacementFee != null
      ? initialAppointment.displacementFee.toFixed(2).replace(".", ",")
      : ""
  );
  const [internalNotes, setInternalNotes] = useState(initialAppointment?.internalNotes ?? "");
  const { toast, showToast } = useToast();
  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [selectedServiceId, services]
  );
  const selectedDateObj = useMemo(
    () => (selectedDate ? parseISO(`${selectedDate}T00:00:00`) : null),
    [selectedDate]
  );
  const selectedServiceBufferMinutes = Math.max(0, Number(selectedService?.custom_buffer_minutes ?? 0));
  const selectedServiceTotalMinutes = (selectedService?.duration_minutes ?? 0) + selectedServiceBufferMinutes;

  useEffect(() => {
    selectedTimeRef.current = selectedTime;
  }, [selectedTime]);

  useEffect(() => {
    setPortalTarget(document.getElementById("app-frame"));
  }, []);

  useEffect(() => {
    if (previousClientIdRef.current && previousClientIdRef.current !== selectedClientId) {
      setAddressMode("none");
      setSelectedAddressId(null);
      setShowAddressSelectionList(false);
      setAddressConfirmed(false);
      setIsAddressModalOpen(false);
      setAddressModalStep("chooser");
      setCep("");
      setLogradouro("");
      setNumero("");
      setComplemento("");
      setBairro("");
      setCidade("");
      setEstado("");
      setAddressLabel("Principal");
      setAddressIsPrimaryDraft(false);
      setAddressSaveError(null);
      setDisplacementEstimate(null);
      setDisplacementStatus("idle");
      setDisplacementError(null);
    }
    previousClientIdRef.current = selectedClientId ?? null;
  }, [selectedClientId]);

  const filteredClients = useMemo(() => {
    if (!clientName.trim()) return [];
    const query = clientName.trim();
    const lower = query.toLowerCase();
    const digits = query.replace(/\D/g, "");
    return clients
      .filter((client) => {
        const byName = client.name.toLowerCase().includes(lower);
        if (byName) return true;
        if (!digits) return false;
        const phoneDigits = normalizePhoneSearchDigits(client.phone);
        const cpfDigits = normalizeCpfDigits(client.cpf ?? null);
        return (
          (phoneDigits.length > 0 && phoneDigits.includes(digits)) ||
          (cpfDigits.length > 0 && cpfDigits.includes(digits))
        );
      })
      .slice(0, 8);
  }, [clientName, clients]);

  const exactClientMatch = useMemo(() => {
    const trimmed = clientName.trim();
    if (!trimmed) return null;
    return clients.find((client) => client.name.trim().toLowerCase() === trimmed.toLowerCase()) ?? null;
  }, [clientName, clients]);

  const handleSelectClient = (client: ClientRecordLite) => {
    setClientName(client.name);
    setClientPhone(client.phone ? formatBrazilPhone(client.phone) : "");
    setClientCpf(formatCpf(client.cpf ?? ""));
    setClientEmail(client.email?.trim().toLowerCase() ?? "");
    const names = resolveClientNames({
      name: client.name,
      publicFirstName: client.public_first_name ?? null,
      publicLastName: client.public_last_name ?? null,
      internalReference: client.internal_reference ?? null,
    });
    setClientFirstName(names.publicFirstName);
    setClientLastName(names.publicLastName);
    setClientReference(names.reference);
    setSelectedClientId(client.id);
    setClientSelectionMode("existing");
    setIsClientDropdownOpen(false);
    setClientCreateError(null);
  };

  const handleCreateNewClientFromName = () => {
    const normalizedName = clientName.trim();
    const seed = splitSeedName(normalizedName);
    setClientCreateError(null);
    setClientFirstName(seed.firstName);
    setClientLastName(seed.lastName);
    setClientReference(seed.reference);
    setClientPhone("");
    setClientEmail("");
    setClientCpf("");
    setIsClientDropdownOpen(false);
    setIsClientCreateModalOpen(true);
    window.setTimeout(() => {
      clientCreateFirstNameInputRef.current?.focus();
    }, 40);
  };

  const clearSelectedClient = () => {
    setSelectedClientId(null);
    setClientSelectionMode("idle");
    setClientName("");
    setClientPhone("");
    setClientCpf("");
    setClientEmail("");
    setClientFirstName("");
    setClientLastName("");
    setClientReference("");
    setIsClientDropdownOpen(false);
    setClientCreateError(null);
    window.setTimeout(() => {
      formRef.current?.querySelector<HTMLInputElement>('input[name="clientName"]')?.focus();
    }, 30);
  };

  const handleSaveClientDraftFromModal = () => {
    const firstName = clientFirstName.trim();
    const lastName = clientLastName.trim();
    const reference = normalizeReferenceLabel(clientReference);
    const phoneDigits = clientPhone.replace(/\D/g, "");
    const emailValue = clientEmail.trim().toLowerCase();
    const cpfDigits = normalizeCpfDigits(clientCpf);

    if (!firstName) {
      setClientCreateError("Informe o primeiro nome do cliente.");
      clientCreateFirstNameInputRef.current?.focus();
      return;
    }
    if (!lastName) {
      setClientCreateError("Informe o sobrenome do cliente.");
      return;
    }
    if (phoneDigits.length > 0 && !(phoneDigits.length === 10 || phoneDigits.length === 11)) {
      setClientCreateError("WhatsApp inválido. Informe um número com DDD.");
      clientPhoneInputRef.current?.focus();
      return;
    }
    if (emailValue && !isValidEmailAddress(emailValue)) {
      setClientCreateError("Email inválido. Verifique e tente novamente.");
      return;
    }
    if (clientCpf.trim() && cpfDigits.length !== 11) {
      setClientCreateError("CPF inválido. Informe os 11 números do CPF.");
      clientCpfInputRef.current?.focus();
      return;
    }

    setClientName(composeInternalClientName(firstName, lastName, reference || null));
    setClientPhone(phoneDigits ? formatBrazilPhone(phoneDigits) : "");
    setClientEmail(emailValue);
    setClientCpf(cpfDigits.length === 11 ? formatCpf(cpfDigits) : "");
    setClientFirstName(firstName);
    setClientLastName(lastName);
    setClientReference(reference);
    setSelectedClientId(null);
    setClientSelectionMode("new");
    setIsClientCreateModalOpen(false);
    setClientCreateError(null);
  };

  const handleLinkExistingClientByCpf = () => {
    if (!duplicateCpfClient) return;
    handleSelectClient(duplicateCpfClient);
    showToast(
      {
        title: "CPF já cadastrado",
        message: `Agendamento vinculado ao cliente existente: ${duplicateCpfClient.name}.`,
        tone: "warning",
      }
    );
  };

  const handleChangeCpfAfterConflict = () => {
    setClientCpf("");
    window.setTimeout(() => {
      clientCpfInputRef.current?.focus();
    }, 40);
  };

  const applyServiceSelection = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setPriceOverride("");
      if (!isEditing) {
        setFinanceExtraItems([]);
        setFinanceNewItemLabel("");
        setFinanceNewItemAmount("");
        setScheduleDiscountType("value");
        setScheduleDiscountValue("");
        setSelectedDate("");
        setSelectedTime("");
        setCollectionTimingDraft(null);
        setChargeNowAmountMode("full");
        setHasChargeNowAmountModeChoice(false);
        setChargeNowSignalPercent(Math.max(0, signalPercentage ?? 30));
        setChargeNowCustomAmount("");
        setChargeNowMethodDraft(null);
        setChargeNowSignalValueConfirmed(false);
        setConfirmationSheetStep("review");
        setChargeBookingState(null);
        setChargeFlowError(null);
        setChargeNotificationsDispatched(false);
      }

    const service = services.find((s) => s.id === serviceId);
    if (service) {
      setDisplayedPrice(service.price.toFixed(2));
      if (!isEditing) {
        setServicePriceDraft(formatCurrencyInput(service.price));
      }
      if (service.accepts_home_visit) {
        if (isEditing) {
          setHasLocationChoice(true);
        } else {
          setHasLocationChoice(false);
          setIsHomeVisit(false);
          setDisplacementEstimate(null);
          setDisplacementStatus("idle");
          setDisplacementError(null);
          setManualDisplacementFee("");
        }
      } else {
        setHasLocationChoice(true);
        setIsHomeVisit(false);
        setDisplacementEstimate(null);
        setDisplacementStatus("idle");
        setDisplacementError(null);
        setManualDisplacementFee("");
      }
    } else {
      setDisplayedPrice("");
      if (!isEditing) {
        setServicePriceDraft("");
      }
      setHasLocationChoice(false);
      setIsHomeVisit(false);
      setDisplacementEstimate(null);
      setDisplacementStatus("idle");
      setDisplacementError(null);
      setManualDisplacementFee("");
    }
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    applyServiceSelection(e.target.value);
  };

  const handleClearSelectedService = () => {
    applyServiceSelection("");
  };

  const handleSelectScheduleDay = (day: Date) => {
    const iso = format(day, "yyyy-MM-dd");
    setSelectedDate(iso);
    setSelectedTime("");
  };

  const handleChangeScheduleMonth = (nextMonth: Date) => {
    setActiveMonth(startOfMonth(nextMonth));
    setSelectedTime("");
  };

  const isScheduleDayDisabled = (day: Date) => {
    if (!isSameMonth(day, activeMonth)) return true;
    if (isBefore(day, startOfDay(new Date()))) return true;
    if (!selectedServiceId) return true;
    if (selectedService?.accepts_home_visit && !hasLocationChoice) return true;
    const iso = format(day, "yyyy-MM-dd");
    const slots = monthAvailability[iso];
    if (!slots) return isLoadingMonthAvailability;
    return slots.length === 0;
  };

  const handleAddFinanceItem = () => {
    const label = financeNewItemLabel.trim();
    const amount = Math.max(0, parseDecimalText(financeNewItemAmount) ?? 0);
    if (!label) return;
    setFinanceExtraItems((current) => [
      ...current,
      {
        id: buildDraftItemId(),
        type: "addon",
        label,
        qty: 1,
        amount,
      },
    ]);
    setFinanceNewItemLabel("");
    setFinanceNewItemAmount("");
  };

  const handleRemoveFinanceItem = (itemId: string) => {
    setFinanceExtraItems((current) => current.filter((item) => item.id !== itemId));
  };

  const parsedManualDisplacementFee = useMemo(
    () => parseDecimalText(manualDisplacementFee),
    [manualDisplacementFee]
  );
  const effectiveDisplacementFee = isHomeVisit
    ? Math.max(0, parsedManualDisplacementFee ?? displacementEstimate?.fee ?? 0)
    : 0;
  const parsedServicePriceDraft = useMemo(() => parseDecimalText(servicePriceDraft), [servicePriceDraft]);
  const effectiveServicePriceDraft = useMemo(() => {
    const serviceCatalogPrice = Number(selectedService?.price ?? 0);
    return Math.max(0, parsedServicePriceDraft ?? serviceCatalogPrice);
  }, [parsedServicePriceDraft, selectedService?.price]);
  const parsedScheduleDiscountValue = useMemo(
    () => parseDecimalText(scheduleDiscountValue),
    [scheduleDiscountValue]
  );
  const parsedChargeNowCustomAmount = useMemo(
    () => parseDecimalText(chargeNowCustomAmount),
    [chargeNowCustomAmount]
  );
  const financeExtraSubtotal = useMemo(
    () =>
      financeExtraItems.reduce(
        (acc, item) => acc + Math.max(0, Number(item.amount ?? 0)) * Math.max(1, Number(item.qty ?? 1)),
        0
      ),
    [financeExtraItems]
  );
  const financeDraftItems = useMemo(() => {
    const items: Array<{ type: FinanceDraftItemType; label: string; qty: number; amount: number }> = [];
    if (selectedService) {
      items.push({
        type: "service",
        label: selectedService.name,
        qty: 1,
        amount: effectiveServicePriceDraft,
      });
    }
    if (isHomeVisit && effectiveDisplacementFee > 0) {
      items.push({
        type: "fee",
        label: "Taxa deslocamento",
        qty: 1,
        amount: effectiveDisplacementFee,
      });
    }
    financeExtraItems.forEach((item) => {
      items.push({
        type: item.type,
        label: item.label,
        qty: item.qty,
        amount: Math.max(0, Number(item.amount ?? 0)),
      });
    });
    return items;
  }, [effectiveDisplacementFee, effectiveServicePriceDraft, financeExtraItems, isHomeVisit, selectedService]);
  const scheduleSubtotal = useMemo(
    () => Math.max(0, effectiveServicePriceDraft + effectiveDisplacementFee + financeExtraSubtotal),
    [effectiveDisplacementFee, effectiveServicePriceDraft, financeExtraSubtotal]
  );
  const effectiveScheduleDiscount = useMemo(() => {
    const raw = Math.max(0, parsedScheduleDiscountValue ?? 0);
    if (scheduleDiscountType === "pct") {
      return Math.min(scheduleSubtotal, scheduleSubtotal * (raw / 100));
    }
    return Math.min(scheduleSubtotal, raw);
  }, [parsedScheduleDiscountValue, scheduleDiscountType, scheduleSubtotal]);
  const scheduleTotal = useMemo(
    () => Math.max(0, scheduleSubtotal - effectiveScheduleDiscount),
    [effectiveScheduleDiscount, scheduleSubtotal]
  );
  const effectiveSignalPercentageDraft = useMemo(
    () => Math.min(100, Math.max(0, Number(chargeNowSignalPercent || 0))),
    [chargeNowSignalPercent]
  );
  const chargeNowSuggestedSignalAmount = useMemo(() => {
    if (scheduleTotal <= 0) return 0;
    const rawSignal = scheduleTotal * (effectiveSignalPercentageDraft / 100);
    if (rawSignal <= 0) return 0;
    const minimumPix = chargeNowMethodDraft === "pix_mp" ? 1 : 0;
    return Math.min(scheduleTotal, Math.max(minimumPix, rawSignal));
  }, [chargeNowMethodDraft, effectiveSignalPercentageDraft, scheduleTotal]);
  const chargeNowDraftAmount = useMemo(() => {
    if (scheduleTotal <= 0) return 0;
    if (chargeNowAmountMode === "full") return scheduleTotal;
    const signalValue = Math.max(0, parsedChargeNowCustomAmount ?? 0);
    if (signalValue > 0) return Math.min(scheduleTotal, signalValue);
    return chargeNowSuggestedSignalAmount;
  }, [chargeNowAmountMode, chargeNowSuggestedSignalAmount, parsedChargeNowCustomAmount, scheduleTotal]);
  const chargeNowAmountError = useMemo(() => {
    if (collectionTimingDraft !== "charge_now") return null;
    if (chargeNowMethodDraft === "waiver") return null;
    if (scheduleTotal <= 0) return "Configure o financeiro antes de cobrar no agendamento.";
    if (chargeNowAmountMode === "signal") {
      const signalValue = Math.max(0, parsedChargeNowCustomAmount ?? 0);
      if (signalValue <= 0) return "Informe o valor do sinal.";
      if (signalValue > scheduleTotal) return "O valor do sinal não pode ser maior que o total do agendamento.";
      if (chargeNowMethodDraft === "pix_mp" && signalValue < 1) {
        return "Para PIX Mercado Pago, o valor mínimo é R$ 1,00.";
      }
    }
    return null;
  }, [chargeNowAmountMode, chargeNowMethodDraft, collectionTimingDraft, parsedChargeNowCustomAmount, scheduleTotal]);
  const createPriceOverrideValue = selectedService ? scheduleTotal.toFixed(2) : "";
  const createCheckoutServiceAmountValue = selectedService ? effectiveServicePriceDraft.toFixed(2) : "";
  const isCourtesyDraft = !isEditing && collectionTimingDraft === "charge_now" && chargeNowMethodDraft === "waiver";
  const createCheckoutExtraItemsJson = useMemo(
    () =>
      JSON.stringify(
        financeExtraItems.map((item) => ({
          type: item.type,
          label: item.label.trim(),
          qty: Math.max(1, Number(item.qty ?? 1)),
          amount: Math.max(0, Number(item.amount ?? 0)),
        }))
      ),
    [financeExtraItems]
  );
  const effectiveScheduleDiscountInputValue = useMemo(
    () => (parsedScheduleDiscountValue && parsedScheduleDiscountValue > 0 ? parsedScheduleDiscountValue : 0),
    [parsedScheduleDiscountValue]
  );

  useEffect(() => {
    if (!selectedService) return;
    const basePrice = Number(selectedService.price || 0);
    const fee = effectiveDisplacementFee;
    setDisplayedPrice((basePrice + fee).toFixed(2));
  }, [selectedService, effectiveDisplacementFee]);

  useEffect(() => {
    if (!selectedDate) return;
    const parsed = parseISO(`${selectedDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return;
    setActiveMonth(startOfMonth(parsed));
  }, [selectedDate]);

  useEffect(() => {
    let active = true;
    async function loadMonthAvailability() {
      if (!selectedServiceId || (selectedService?.accepts_home_visit && !hasLocationChoice)) {
        setMonthAvailability({});
        return;
      }

      setIsLoadingMonthAvailability(true);
      const start = startOfMonth(activeMonth);
      const end = endOfMonth(activeMonth);
      const today = startOfDay(new Date());
      const days = eachDayOfInterval({ start, end });

      try {
        const results = await Promise.all(
          days.map(async (day) => {
            const iso = format(day, "yyyy-MM-dd");
            if (isBefore(day, today)) {
              return { date: iso, slots: [] as string[] };
            }
            try {
              const slots = await getAvailableSlots({
                tenantId: FIXED_TENANT_ID,
                serviceId: selectedServiceId,
                date: iso,
                isHomeVisit,
                ignoreBlocks: true,
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
      } finally {
        if (active) setIsLoadingMonthAvailability(false);
      }
    }

    loadMonthAvailability();
    return () => {
      active = false;
    };
  }, [activeMonth, hasLocationChoice, isHomeVisit, selectedService, selectedServiceId]);

  useEffect(() => {
    async function fetchSlots() {
      if (!selectedServiceId || !selectedDate || (selectedService?.accepts_home_visit && !hasLocationChoice)) {
        setAvailableSlots([]);
        setSelectedTime("");
        return;
      }

      setIsLoadingSlots(true);
      try {
        const slots = await getAvailableSlots({
          tenantId: FIXED_TENANT_ID,
          serviceId: selectedServiceId,
          date: selectedDate,
          isHomeVisit,
          ignoreBlocks: true,
        });
        const normalizedSlots = slots;
        setAvailableSlots(normalizedSlots);
        const preferred = isEditing ? selectedTimeRef.current || initialTimeRef.current : "";
        if (preferred && normalizedSlots.includes(preferred)) {
          setSelectedTime(preferred);
        } else {
          setSelectedTime("");
        }
      } catch (error) {
        console.error(error);
        setAvailableSlots([]);
        setSelectedTime("");
      } finally {
        setIsLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [isEditing, selectedServiceId, selectedDate, isHomeVisit, hasLocationChoice, selectedService]);

  useEffect(() => {
    async function fetchBlockStatus() {
      if (!selectedDate) {
        setHasBlocks(false);
        setHasShiftBlock(false);
        return;
      }
      setBlockStatus("loading");
      try {
        const result = await getDateBlockStatus({ tenantId: FIXED_TENANT_ID, date: selectedDate });
        setHasBlocks(result.hasBlocks);
        setHasShiftBlock(result.hasShift);
      } catch {
        setHasBlocks(false);
        setHasShiftBlock(false);
      } finally {
        setBlockStatus("idle");
      }
    }

    fetchBlockStatus();
  }, [selectedDate]);

  useEffect(() => {
    if (isHomeVisit) return;
    setIsAddressModalOpen(false);
    setAddressModalStep("chooser");
    setCepDraft("");
    setCepDraftStatus("idle");
    setAddressSearchQuery("");
    setAddressSearchResults([]);
    setAddressSearchLoading(false);
    setAddressSearchError(null);
    setDisplacementEstimate(null);
    setDisplacementStatus("idle");
    setDisplacementError(null);
    setManualDisplacementFee("");
  }, [isHomeVisit]);

  useEffect(() => {
    let active = true;
    if (!selectedClientId) {
      setClientAddresses([]);
      setSelectedAddressId(null);
      setShowAddressSelectionList(false);
      setAddressConfirmed(false);
      return;
    }

    (async () => {
      const result = await getClientAddresses(selectedClientId);
      if (!active) return;
      const addresses = (result.data as ClientAddress[]) ?? [];
      setClientAddresses(addresses);
      const primary = addresses.find((address) => address.is_primary) ?? addresses[0] ?? null;
      const hasSelected = !!selectedAddressId && addresses.some((address) => address.id === selectedAddressId);
      const nextSelectedId = hasSelected ? selectedAddressId : primary?.id ?? null;
      if (nextSelectedId !== selectedAddressId) {
        setSelectedAddressId(nextSelectedId);
      }
      if (addresses.length <= 1) {
        setShowAddressSelectionList(false);
      } else if (!hasSelected && nextSelectedId) {
        setShowAddressSelectionList(true);
      }
      if (addressMode !== "new") {
        setAddressMode(nextSelectedId ? "existing" : "none");
        setAddressConfirmed(Boolean(nextSelectedId));
      }
      if (nextSelectedId && addressMode !== "new") {
        const selected = addresses.find((address) => address.id === nextSelectedId) ?? null;
        if (selected) {
          setAddressLabel(selected.label ?? "Casa");
          setCep(selected.address_cep ?? "");
          setLogradouro(selected.address_logradouro ?? "");
          setNumero(selected.address_numero ?? "");
          setComplemento(selected.address_complemento ?? "");
          setBairro(selected.address_bairro ?? "");
          setCidade(selected.address_cidade ?? "");
          setEstado(selected.address_estado ?? "");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedClientId, addressMode, selectedAddressId]);

  useEffect(() => {
    if (!isHomeVisit) return;
    if (addressMode === "new" && addressConfirmed) return;
    if (clientAddresses.length > 0) {
      setAddressMode("existing");
      setAddressConfirmed(true);
      return;
    }
    setAddressMode(addressConfirmed ? "new" : "none");
  }, [isHomeVisit, clientAddresses, addressMode, addressConfirmed]);

  useEffect(() => {
    if (!(isAddressModalOpen && addressModalStep === "search")) return;
    const query = addressSearchQuery.trim();
    if (query.length < 3) {
      setAddressSearchResults([]);
      setAddressSearchError(null);
      setAddressSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setAddressSearchLoading(true);
      setAddressSearchError(null);
      try {
        const response = await fetch(`/api/address-search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Falha ao buscar endereço");
        const data = (await response.json()) as AddressSearchResult[];
        if (!controller.signal.aborted) {
          setAddressSearchResults(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setAddressSearchResults([]);
          setAddressSearchError("Não foi possível buscar endereços. Tente novamente.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setAddressSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [addressSearchQuery, isAddressModalOpen, addressModalStep]);

  const handleCepDraftLookup = async () => {
    const normalized = normalizeCep(cepDraft);
    if (normalized.length !== 8) {
      setCepDraftStatus("error");
      return null;
    }
    setCepDraftStatus("loading");
    const result = await fetchAddressByCep(normalized);
    if (!result) {
      setCepDraftStatus("error");
      return null;
    }
    const nextResult = {
      cep: formatCep(normalized),
      logradouro: result.logradouro,
      bairro: result.bairro,
      cidade: result.cidade,
      estado: result.estado,
    };
    setCepDraftStatus("success");
    return nextResult;
  };

  const handleAddressSearchResultSelect = async (result: AddressSearchResult) => {
    setAddressSearchLoading(true);
    setAddressSearchError(null);
    try {
      const response = await fetch(`/api/address-details?placeId=${encodeURIComponent(result.placeId)}`);
      if (!response.ok) throw new Error("Falha ao buscar endereço");
      const data = (await response.json()) as {
        cep?: string;
        logradouro?: string;
        numero?: string;
        bairro?: string;
        cidade?: string;
        estado?: string;
      };

      applyAddressDraftFields({
        cep: data.cep ? formatCep(data.cep) : "",
        logradouro: data.logradouro ?? result.label,
        numero: data.numero ?? "",
        bairro: data.bairro ?? "",
        cidade: data.cidade ?? "",
        estado: data.estado ?? "",
      });
      setAddressModalStep("form");
      setAddressSaveError(null);
      return true;
    } catch (error) {
      console.error(error);
      setAddressSearchError("Não foi possível carregar o endereço. Tente novamente.");
      return false;
    } finally {
      setAddressSearchLoading(false);
    }
  };

  const mapsQuery = buildAddressQuery({
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
  });
  const selectedClientRecord =
    (selectedClientId ? clients.find((client) => client.id === selectedClientId) ?? null : null) ?? null;
  const selectedClientNames = useMemo(
    () =>
      selectedClientRecord
        ? resolveClientNames({
            name: selectedClientRecord.name,
            publicFirstName: selectedClientRecord.public_first_name ?? null,
            publicLastName: selectedClientRecord.public_last_name ?? null,
            internalReference: selectedClientRecord.internal_reference ?? null,
          })
        : null,
    [selectedClientRecord]
  );
  const duplicateCpfClient = useMemo(() => {
    const normalized = normalizeCpfDigits(clientCpf);
    if (normalized.length !== 11) return null;

    const match =
      clients.find((client) => {
        const clientCpfDigits = normalizeCpfDigits(client.cpf ?? null);
        return clientCpfDigits.length === 11 && clientCpfDigits === normalized;
      }) ?? null;

    if (!match) return null;
    if (selectedClientId && match.id === selectedClientId) return null;
    return match;
  }, [clientCpf, clients, selectedClientId]);

  const isClientSelectionPending = !isEditing && clientSelectionMode === "idle";
  const shouldShowClientContactFields = isEditing || clientSelectionMode !== "idle";
  const isClientReadOnly = !isEditing && clientSelectionMode !== "idle";
  const shouldShowCpfField =
    shouldShowClientContactFields &&
    (isEditing
      ? !selectedClientRecord?.cpf || selectedClientRecord.cpf.trim().length === 0 || clientCpf.trim().length > 0
      : clientSelectionMode === "new"
        ? clientCpf.trim().length === 0 || Boolean(duplicateCpfClient)
        : !selectedClientRecord?.cpf || selectedClientRecord.cpf.trim().length === 0);
  const missingWhatsappWarning =
    shouldShowClientContactFields && clientPhone.replace(/\D/g, "").length === 0;
  const isExistingClientCpfLocked =
    clientSelectionMode === "existing" && Boolean(selectedClientRecord?.cpf?.trim());
  const resolvedClientId =
    clientSelectionMode === "existing" ? (selectedClientId ?? exactClientMatch?.id ?? null) : null;
  const resolvedClientPhone = clientPhone || (selectedClientRecord?.phone ? formatBrazilPhone(selectedClientRecord.phone) : "");
  const clientDisplayPreviewLabel =
    clientSelectionMode === "existing"
      ? selectedClientNames?.internalName || clientName
      : clientName;
  const clientPublicFullNamePreview =
    clientSelectionMode === "existing"
      ? selectedClientNames?.publicFullName || ""
      : [clientFirstName, clientLastName].filter((value) => value.trim().length > 0).join(" ");
  const clientMessageFirstName =
    clientSelectionMode === "existing"
      ? selectedClientNames?.messagingFirstName || "Cliente"
      : clientFirstName.trim() || clientName.replace(/\s*\([^)]*\)\s*$/, "").trim().split(/\s+/)[0] || "Cliente";
  const clientDraftInternalPreview = composeInternalClientName(
    clientFirstName.trim() || "Primeiro nome",
    clientLastName.trim() || null,
    clientReference || null
  );
  const clientDraftPublicPreview =
    [clientFirstName, clientLastName].filter((value) => value.trim().length > 0).join(" ") || "Nome público";
  const canHomeVisit = selectedService?.accepts_home_visit ?? false;
  const isLocationChoiceRequired = Boolean(selectedServiceId) && canHomeVisit;
  const isLocationChoiceResolved = Boolean(selectedServiceId) && (!canHomeVisit || hasLocationChoice);
  const isStep1Unlocked = isEditing || clientSelectionMode !== "idle";
  const isStep2Unlocked = isStep1Unlocked;
  const isStep3Unlocked =
    isEditing || (isStep2Unlocked && isLocationChoiceResolved && (!isHomeVisit || addressConfirmed));
  const isStep4Unlocked = isEditing || (isStep3Unlocked && Boolean(selectedDate) && Boolean(selectedTime));
  const isChargeNowMethodChosen = collectionTimingDraft === "charge_now" && chargeNowMethodDraft !== null;
  const isChargeNowAmountConfirmed =
    collectionTimingDraft === "charge_now" &&
    (chargeNowMethodDraft === "waiver" ||
      (hasChargeNowAmountModeChoice &&
        !chargeNowAmountError &&
        (chargeNowAmountMode === "full" || chargeNowSignalValueConfirmed)));
  const canOpenConfirmation = isEditing
    ? true
    : isStep4Unlocked &&
      (collectionTimingDraft === "at_attendance" ||
        (collectionTimingDraft === "charge_now" && isChargeNowMethodChosen && isChargeNowAmountConfirmed));
  const selectedAddress = useMemo(
    () => clientAddresses.find((address) => address.id === selectedAddressId) ?? null,
    [clientAddresses, selectedAddressId]
  );
  const displacementInput = useMemo(() => {
    if (!isHomeVisit) return null;
    if (addressMode === "existing" && selectedAddress) {
      return {
        cep: selectedAddress.address_cep ?? "",
        logradouro: selectedAddress.address_logradouro ?? "",
        numero: selectedAddress.address_numero ?? "",
        complemento: selectedAddress.address_complemento ?? "",
        bairro: selectedAddress.address_bairro ?? "",
        cidade: selectedAddress.address_cidade ?? "",
        estado: selectedAddress.address_estado ?? "",
      };
    }
    if (addressMode === "new" && addressConfirmed) {
      return { cep, logradouro, numero, complemento, bairro, cidade, estado };
    }
    return null;
  }, [addressConfirmed, addressMode, bairro, cep, cidade, complemento, estado, isHomeVisit, logradouro, numero, selectedAddress]);

  useEffect(() => {
    if (!displacementInput) {
      setDisplacementEstimate(null);
      setDisplacementStatus("idle");
      setDisplacementError(null);
      setManualDisplacementFee("");
      return;
    }

    if (!displacementInput.logradouro || !displacementInput.cidade || !displacementInput.estado) {
      setDisplacementEstimate(null);
      setDisplacementStatus("idle");
      setDisplacementError(null);
      setManualDisplacementFee("");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setDisplacementStatus("loading");
      setDisplacementError(null);
      try {
        const response = await fetch("/api/displacement-fee", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(displacementInput),
          signal: controller.signal,
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
        setManualDisplacementFee(payload.fee.toFixed(2).replace(".", ","));
      } catch (error) {
        if (controller.signal.aborted) return;
        setDisplacementEstimate(null);
        setDisplacementStatus("error");
        setDisplacementError(
          error instanceof Error ? error.message : "Não foi possível calcular a taxa de deslocamento."
        );
        setManualDisplacementFee("");
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [displacementInput]);

  const finalPrice = priceOverride ? priceOverride : displayedPrice;
  const formAction = isEditing ? updateAppointment : createAppointment;
  const applyAddressDraftFields = (payload: {
    cep?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
  }) => {
    setCep(payload.cep ?? "");
    setLogradouro(payload.logradouro ?? "");
    setNumero(payload.numero ?? "");
    setComplemento(payload.complemento ?? "");
    setBairro(payload.bairro ?? "");
    setCidade(payload.cidade ?? "");
    setEstado((payload.estado ?? "").toUpperCase());
  };

  const openAddressCreateModal = () => {
    if (!isHomeVisit) return;
    setIsAddressModalOpen(true);
    setAddressModalStep("chooser");
    setAddressSaveError(null);
    setAddressSavePending(false);
    setCepDraft("");
    setCepDraftStatus("idle");
    setAddressSearchQuery("");
    setAddressSearchResults([]);
    setAddressSearchLoading(false);
    setAddressSearchError(null);
    setAddressIsPrimaryDraft(clientAddresses.length === 0);
    if (!addressLabel.trim()) {
      setAddressLabel("Principal");
    }
    if (addressMode !== "new") {
      setCep("");
      setLogradouro("");
      setNumero("");
      setComplemento("");
      setBairro("");
      setCidade("");
      setEstado("");
      setAddressLabel("Principal");
    }
  };

  const closeAddressCreateModal = () => {
    setIsAddressModalOpen(false);
    setAddressModalStep("chooser");
    setAddressSaveError(null);
    setAddressSavePending(false);
    setCepDraft("");
    setCepDraftStatus("idle");
    setAddressSearchQuery("");
    setAddressSearchResults([]);
    setAddressSearchLoading(false);
    setAddressSearchError(null);
  };

  const handleSelectExistingAddress = (addressId: string) => {
    const selected = clientAddresses.find((address) => address.id === addressId) ?? null;
    setSelectedAddressId(addressId);
    setAddressMode("existing");
    setAddressConfirmed(true);
    setShowAddressSelectionList(false);
    if (selected) {
      setAddressLabel(selected.label ?? "Principal");
      setCep(selected.address_cep ?? "");
      setLogradouro(selected.address_logradouro ?? "");
      setNumero(selected.address_numero ?? "");
      setComplemento(selected.address_complemento ?? "");
      setBairro(selected.address_bairro ?? "");
      setCidade(selected.address_cidade ?? "");
      setEstado(selected.address_estado ?? "");
    }
  };

  const handleAddressModalSave = async () => {
    const normalizedLabel = addressLabel.trim() || "Principal";
    if (!logradouro.trim() || !cidade.trim() || estado.trim().length < 2) {
      setAddressSaveError("Preencha rua, cidade e UF para salvar o endereço.");
      setAddressModalStep("form");
      return;
    }

    setAddressSaveError(null);

    if (!resolvedClientId) {
      setAddressLabel(normalizedLabel);
      setAddressMode("new");
      setSelectedAddressId(null);
      setAddressConfirmed(true);
      setShowAddressSelectionList(false);
      closeAddressCreateModal();
      return;
    }

    setAddressSavePending(true);
    const result = await saveClientAddress({
      clientId: resolvedClientId,
      label: normalizedLabel,
      isPrimary: clientAddresses.length === 0 ? true : addressIsPrimaryDraft,
      addressCep: cep || null,
      addressLogradouro: logradouro,
      addressNumero: numero || null,
      addressComplemento: complemento || null,
      addressBairro: bairro || null,
      addressCidade: cidade,
      addressEstado: estado.toUpperCase(),
    });

    if (result.error || !result.data?.id) {
      setAddressSavePending(false);
      setAddressSaveError(result.error ?? "Não foi possível salvar o endereço.");
      setAddressModalStep("form");
      return;
    }

    const refreshed = await getClientAddresses(resolvedClientId);
    const refreshedAddresses = (refreshed.data as ClientAddress[]) ?? [];
    setClientAddresses(refreshedAddresses);
    setAddressLabel(normalizedLabel);
    setAddressMode("existing");
    setSelectedAddressId(result.data.id);
    setAddressConfirmed(true);
    setShowAddressSelectionList(false);
    setAddressSavePending(false);
    closeAddressCreateModal();
  };

  const openWhatsappFromForm = (message: string) => {
    const phone = resolvedClientPhone || clientPhone;
    const digits = phone.replace(/\D/g, "");
    if (!digits) {
      showToast(feedbackById("whatsapp_missing_phone"));
      return false;
    }
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    const url = `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    return true;
  };

  const buildCreatedMessageText = () =>
    buildCreatedMessage({
      clientName: clientMessageFirstName,
      date: selectedDate,
      time: selectedTime,
      serviceName: selectedService?.name ?? "",
      locationLine: isHomeVisit
        ? addressLabel
          ? `No endereço informado: ${addressLabel}`
          : "Atendimento domiciliar (endereço a confirmar)"
        : "No estúdio",
      template: messageTemplates.created_confirmation,
    });

  const buildAgendaDayReturnUrl = (appointmentId?: string | null) => {
    const dateParam = selectedDate || safeDate;
    const params = new URLSearchParams();
    params.set("view", "day");
    params.set("date", dateParam);
    if (appointmentId) {
      params.set("openAppointment", appointmentId);
    }
    return `/?${params.toString()}`;
  };

  const refreshChargeBookingState = async (appointmentId: string) => {
    const context = await getBookingChargeContext(appointmentId);
    if (!context.ok) {
      setChargeFlowError(context.error ?? "Não foi possível atualizar o checkout.");
      return null;
    }
    const next = {
      ...(chargeBookingState ?? {
        appointmentId,
        date: selectedDate || safeDate,
        startTimeIso: "",
        attendanceCode: null,
      }),
      appointmentId,
      appointmentPaymentStatus: context.data.appointment.payment_status ?? null,
      attendanceCode: context.data.appointment.attendance_code ?? null,
      checkout: context.data.checkout,
      checkoutItems: context.data.checkoutItems,
      payments: context.data.payments,
    } satisfies ChargeBookingState;
    setChargeBookingState(next);
    return next;
  };

  const handleBeginImmediateCharge = async () => {
    if (!formRef.current) return;
    if (!formRef.current.reportValidity()) return;
    if (chargeNowMethodDraft === null) {
      showToast({ title: "Financeiro", message: "Escolha a forma de pagamento.", tone: "warning", durationMs: 2600 });
      return;
    }
    if (chargeNowMethodDraft !== "waiver" && !hasChargeNowAmountModeChoice) {
      showToast({ title: "Financeiro", message: "Escolha se vai cobrar integral ou sinal.", tone: "warning", durationMs: 2600 });
      return;
    }
    if (chargeNowMethodDraft !== "waiver" && chargeNowAmountMode === "signal" && !chargeNowSignalValueConfirmed) {
      showToast({
        title: "Financeiro",
        message: "Confirme o valor do sinal para continuar.",
        tone: "warning",
        durationMs: 2600,
      });
      return;
    }
    if (chargeNowAmountError) {
      showToast({ title: "Financeiro", message: chargeNowAmountError, tone: "warning", durationMs: 2600 });
      return;
    }

    setCreatingChargeBooking(true);
    setChargeFlowError(null);
    setConfirmationSheetStep("creating_charge");
    try {
      const formData = new FormData(formRef.current);
      formData.set("payment_collection_timing", "charge_now");
      const result = await createAppointmentForImmediateCharge(formData);
      if (!result.ok || !result.data) {
        setChargeFlowError(result.error ?? "Não foi possível criar o agendamento para cobrança.");
        setConfirmationSheetStep("review");
        return;
      }

      const attendance = result.data.attendance;
      const nextState: ChargeBookingState = {
        appointmentId: result.data.appointmentId,
        date: result.data.date,
        startTimeIso: result.data.startTimeIso,
        attendanceCode: attendance?.appointment?.attendance_code ?? null,
        appointmentPaymentStatus: attendance?.appointment?.payment_status ?? null,
        checkout: attendance?.checkout ?? null,
        checkoutItems: attendance?.checkoutItems ?? [],
        payments: attendance?.payments ?? [],
      };
      setChargeBookingState(nextState);
      setChargeNotificationsDispatched(false);
      setConfirmationSheetStep("charge_payment");
    } finally {
      setCreatingChargeBooking(false);
    }
  };

  const resolveChargeAmountForModal = () => {
    if (collectionTimingDraft !== "charge_now") return null;
    if (!chargeBookingState?.checkout) return Math.max(0, chargeNowDraftAmount);
    const total = Number(chargeBookingState.checkout.total ?? 0);
    const paid = (chargeBookingState.payments ?? [])
      .filter((payment) => payment.status === "paid")
      .reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0);
    const remaining = Math.max(total - paid, 0);
    return Math.max(0, Math.min(chargeNowDraftAmount, remaining));
  };

  const ensureChargeNotificationsDispatched = async () => {
    if (!chargeBookingState || chargeNotificationsDispatched) return true;
    const result = await finalizeCreatedAppointmentNotifications({
      appointmentId: chargeBookingState.appointmentId,
      startTimeIso: chargeBookingState.startTimeIso,
    });
    if (!result.ok) {
      showToast({
        title: "Automação",
        message: "Agendamento criado, mas não foi possível acionar a automação agora.",
        tone: "warning",
        durationMs: 2600,
      });
      return false;
    }
    setChargeNotificationsDispatched(true);
    return true;
  };

  const handleChargeSaveItems = async (
    items: Array<{ type: CheckoutItem["type"]; label: string; qty: number; amount: number }>
  ) => {
    if (!chargeBookingState) return false;
    const result = await saveBookingChargeItems({ appointmentId: chargeBookingState.appointmentId, items });
    if (!result.ok) {
      showToast({
        title: "Checkout",
        message: "Não foi possível atualizar os itens do checkout.",
        tone: "error",
        durationMs: 2600,
      });
      return false;
    }
    await refreshChargeBookingState(chargeBookingState.appointmentId);
    return true;
  };

  const handleChargeSetDiscount = async (type: "value" | "pct" | null, value: number | null, reason?: string) => {
    if (!chargeBookingState) return false;
    const result = await setBookingChargeDiscount({
      appointmentId: chargeBookingState.appointmentId,
      type,
      value,
      reason: reason ?? null,
    });
    if (!result.ok) {
      showToast({
        title: "Checkout",
        message: "Não foi possível aplicar o desconto.",
        tone: "error",
        durationMs: 2600,
      });
      return false;
    }
    await refreshChargeBookingState(chargeBookingState.appointmentId);
    return true;
  };

  const handleChargeRegisterCashPayment = async (amount: number) => {
    if (!chargeBookingState) return { ok: false as const, paymentId: null };
    const result = await recordBookingChargePayment({ appointmentId: chargeBookingState.appointmentId, method: "cash", amount });
    if (!result.ok) {
      showToast({
        title: "Pagamento",
        message: "Não foi possível registrar o pagamento em dinheiro.",
        tone: "error",
        durationMs: 2600,
      });
      return { ok: false as const, paymentId: null };
    }
    await refreshChargeBookingState(chargeBookingState.appointmentId);
    return { ok: true as const, paymentId: result.data.paymentId };
  };

  const handleChargeRegisterPixKeyPayment = async (amount: number) => {
    if (!chargeBookingState) return { ok: false as const, paymentId: null };
    const result = await recordBookingChargePayment({ appointmentId: chargeBookingState.appointmentId, method: "pix", amount });
    if (!result.ok) {
      showToast({
        title: "Pagamento",
        message: "Não foi possível registrar o pagamento Pix.",
        tone: "error",
        durationMs: 2600,
      });
      return { ok: false as const, paymentId: null };
    }
    await refreshChargeBookingState(chargeBookingState.appointmentId);
    return { ok: true as const, paymentId: result.data.paymentId };
  };

  const handleChargeCreatePixPayment = async (amount: number, attempt: number) => {
    if (!chargeBookingState) return { ok: false as const };
    const payerPhone = resolvedClientPhone || clientPhone;
    const result = await createBookingPixPayment({
      appointmentId: chargeBookingState.appointmentId,
      amount,
      payerName: clientPublicFullNamePreview || clientName || "Cliente",
      payerPhone,
      payerEmail: clientEmail || selectedClientRecord?.email || null,
      attempt,
    });
    if (!result.ok) {
      showToast({
        title: "Pagamento",
        message: "Não foi possível gerar o PIX agora.",
        tone: "error",
        durationMs: 2600,
      });
      return { ok: false as const };
    }
    await refreshChargeBookingState(chargeBookingState.appointmentId);
    return { ok: true as const, data: result.data };
  };

  const handleChargePollPixStatus = async () => {
    if (!chargeBookingState) return { ok: false as const, status: "pending" as const };
    const result = await pollBookingPixPaymentStatus({ appointmentId: chargeBookingState.appointmentId });
    if (!result.ok) {
      return { ok: false as const, status: "pending" as const };
    }
    if (result.data.internal_status !== "pending") {
      await refreshChargeBookingState(chargeBookingState.appointmentId);
    }
    return { ok: true as const, status: result.data.internal_status };
  };

  const handleChargeCreatePointPayment = async (amount: number, cardMode: "debit" | "credit", attempt: number) => {
    if (!chargeBookingState) return { ok: false as const };
    const result = await createBookingPointPayment({
      appointmentId: chargeBookingState.appointmentId,
      amount,
      cardMode,
      attempt,
    });
    if (!result.ok) {
      showToast({
        title: "Pagamento",
        message: "Não foi possível iniciar a cobrança no cartão.",
        tone: "error",
        durationMs: 2600,
      });
      return { ok: false as const };
    }
    if (result.data.internal_status !== "pending") {
      await refreshChargeBookingState(chargeBookingState.appointmentId);
    }
    return { ok: true as const, data: result.data };
  };

  const handleChargePollPointStatus = async (orderId: string) => {
    if (!chargeBookingState) return { ok: false as const, status: "pending" as const, paymentId: null };
    const result = await pollBookingPointPaymentStatus({
      appointmentId: chargeBookingState.appointmentId,
      orderId,
    });
    if (!result.ok) {
      return { ok: false as const, status: "pending" as const, paymentId: null };
    }
    if (result.data.internal_status !== "pending") {
      await refreshChargeBookingState(chargeBookingState.appointmentId);
    }
    return { ok: true as const, status: result.data.internal_status, paymentId: result.data.id };
  };

  const handleChargeSendReceipt = async (paymentId: string) => {
    if (!chargeBookingState) return;
    const phone = normalizePhoneForWhatsapp(resolvedClientPhone || clientPhone);
    if (!phone) {
      showToast(feedbackById("whatsapp_missing_phone"));
      return;
    }

    const baseUrl = resolvePublicBaseUrl(publicBaseUrl);
    const receiptPath = buildAppointmentReceiptPath({
      appointmentId: chargeBookingState.appointmentId,
      attendanceCode: chargeBookingState.attendanceCode,
    });
    const receiptLink = baseUrl ? `${baseUrl}${receiptPath}` : `${window.location.origin}${receiptPath}`;
    const greeting = clientMessageFirstName ? `Olá, ${clientMessageFirstName}!` : "Olá!";
    const message = applyAutoMessageTemplate(messageTemplates.payment_receipt, {
      greeting,
      service_name: selectedService?.name ?? "atendimento",
      receipt_link_block: `🧾 Acesse seu recibo digital aqui:\n${receiptLink}\n\n`,
    }).trim();

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    void recordManualPaymentReceiptMessage({
      appointmentId: chargeBookingState.appointmentId,
      paymentId,
      message,
      receiptLink,
    });
  };

  const handleChargePaymentResolved = async () => {
    await ensureChargeNotificationsDispatched();
    setChargeFlowError(null);
    setConfirmationSheetStep("charge_manual_prompt");
  };

  const handleSwitchChargeToAttendance = async () => {
    if (!chargeBookingState) return;
    setFinishingChargeFlow(true);
    try {
      await ensureChargeNotificationsDispatched();
      setConfirmationSheetStep("charge_manual_prompt");
    } finally {
      setFinishingChargeFlow(false);
    }
  };

  const handleResolveDeferredManualPrompt = async (shouldSendMessage: boolean) => {
    if (!chargeBookingState) return;
    if (shouldSendMessage) {
      const messageText = buildCreatedMessageText();
      const opened = openWhatsappFromForm(messageText);
      if (opened) {
        await recordManualCreatedMessage({
          appointmentId: chargeBookingState.appointmentId,
          message: messageText,
        });
      }
    }
    setIsSendPromptOpen(false);
    setConfirmationSheetStep("review");
    router.push(buildAgendaDayReturnUrl(chargeBookingState.appointmentId));
  };

  const handleConfirmationSheetClose = () => {
    if (confirmationSheetStep === "charge_manual_prompt" && chargeBookingState) {
      void handleResolveDeferredManualPrompt(false);
      return;
    }
    if (confirmationSheetStep === "charge_payment" && chargeBookingState) {
      void handleSwitchChargeToAttendance();
      return;
    }
    setIsSendPromptOpen(false);
    setConfirmationSheetStep("review");
    setChargeFlowError(null);
  };

  const handleSchedule = (shouldSendMessage: boolean) => {
    if (duplicateCpfClient) {
      showToast(
        {
          title: "CPF já cadastrado",
          message: `O CPF informado já pertence ao cliente ${duplicateCpfClient.name}. Escolha vincular ao cliente existente ou informe outro CPF.`,
          tone: "warning",
          durationMs: 3200,
        }
      );
      clientCpfInputRef.current?.focus();
      return;
    }

    if (!formRef.current) return;
    let shouldRecord = shouldSendMessage;
    let messageText = "";
    if (shouldSendMessage) {
      messageText = buildCreatedMessageText();
      const opened = openWhatsappFromForm(messageText);
      if (!opened) {
        shouldRecord = false;
        messageText = "";
      }
    }
    if (sendMessageInputRef.current) {
      sendMessageInputRef.current.value = shouldRecord ? "1" : "";
    }
    if (sendMessageTextInputRef.current) {
      sendMessageTextInputRef.current.value = messageText;
    }
    setIsSendPromptOpen(false);
    formRef.current.requestSubmit();
  };

  const handleOpenConfirmationPrompt = () => {
    if (!formRef.current) return;
    if (!canOpenConfirmation) {
      showToast({
        title: "Finalize o financeiro",
        message:
          "Escolha quando cobrar e, se for cobrança no agendamento, defina a forma de pagamento e o valor para liberar a confirmação.",
        tone: "warning",
        durationMs: 3200,
      });
      return;
    }
    if (isLocationChoiceRequired && !hasLocationChoice) {
      showToast({
        title: "Local do atendimento",
        message: "Escolha se o atendimento será no estúdio ou em domicílio para continuar.",
        tone: "warning",
        durationMs: 2600,
      });
      return;
    }
    if (!formRef.current.reportValidity()) return;
    setConfirmationSheetStep("review");
    setChargeFlowError(null);
    setIsSendPromptOpen(true);
  };

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <Toast toast={toast} />
      {isEditing && <input type="hidden" name="appointmentId" value={initialAppointment?.id ?? ""} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <input type="hidden" name="clientId" value={resolvedClientId ?? ""} />
      <input type="hidden" name="client_first_name" value={clientSelectionMode === "new" ? clientFirstName : ""} />
      <input type="hidden" name="client_last_name" value={clientSelectionMode === "new" ? clientLastName : ""} />
      <input type="hidden" name="client_reference" value={clientSelectionMode === "new" ? clientReference : ""} />
      <input type="hidden" name="client_email" value={clientSelectionMode === "new" ? clientEmail : ""} />
      {!isEditing && <input type="hidden" name="price_override" value={createPriceOverrideValue} />}
      {!isEditing && (
        <input type="hidden" name="checkout_service_amount" value={createCheckoutServiceAmountValue} />
      )}
      {!isEditing && (
        <input
          type="hidden"
          name="initial_checkout_discount_type"
          value={effectiveScheduleDiscount > 0 ? scheduleDiscountType : ""}
        />
      )}
      {!isEditing && (
        <input
          type="hidden"
          name="initial_checkout_discount_value"
          value={effectiveScheduleDiscount > 0 ? effectiveScheduleDiscount.toFixed(2) : ""}
        />
      )}
      {!isEditing && (
        <input
          type="hidden"
          name="finance_extra_items_json"
          value={createCheckoutExtraItemsJson}
        />
      )}
      {!isEditing && (
        <input
          type="hidden"
          name="payment_collection_timing"
          value={collectionTimingDraft ?? ""}
        />
      )}
      {!isEditing && isCourtesyDraft && <input type="hidden" name="is_courtesy" value="on" />}
      <input type="hidden" name="client_address_id" value={isHomeVisit ? (selectedAddressId ?? "") : ""} />
      <input type="hidden" name="address_label" value={isHomeVisit ? addressLabel : ""} />
      <input
        type="hidden"
        name="address_cep"
        value={isHomeVisit && addressMode === "new" ? cep : ""}
      />
      <input
        type="hidden"
        name="address_logradouro"
        value={isHomeVisit && addressMode === "new" ? logradouro : ""}
      />
      <input
        type="hidden"
        name="address_numero"
        value={isHomeVisit && addressMode === "new" ? numero : ""}
      />
      <input
        type="hidden"
        name="address_complemento"
        value={isHomeVisit && addressMode === "new" ? complemento : ""}
      />
      <input
        type="hidden"
        name="address_bairro"
        value={isHomeVisit && addressMode === "new" ? bairro : ""}
      />
      <input
        type="hidden"
        name="address_cidade"
        value={isHomeVisit && addressMode === "new" ? cidade : ""}
      />
      <input
        type="hidden"
        name="address_estado"
        value={isHomeVisit && addressMode === "new" ? estado : ""}
      />
      <input
        type="hidden"
        name="displacement_fee"
        value={isHomeVisit ? String(effectiveDisplacementFee) : ""}
      />
      <input
        type="hidden"
        name="displacement_distance_km"
        value={isHomeVisit ? String(displacementEstimate?.distanceKm ?? "") : ""}
      />
      {!isEditing && <input ref={sendMessageInputRef} type="hidden" name="send_created_message" value="" />}
      {!isEditing && (
        <input ref={sendMessageTextInputRef} type="hidden" name="send_created_message_text" value="" />
      )}
      <section className={sectionCardClass}>
        <div className="flex items-center gap-2 mb-4">
          <div className={sectionNumberClass}>1</div>
          <h2 className={sectionHeaderTextClass}>Cliente</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Cliente</label>
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                name="clientName"
                type="text"
                placeholder="Buscar por nome, WhatsApp ou CPF..."
                value={clientName}
                autoComplete="off"
                readOnly={isClientReadOnly}
                onFocus={() => {
                  if (!isEditing && !isClientReadOnly) setIsClientDropdownOpen(true);
                }}
                onBlur={() => {
                  if (isEditing) return;
                  if (isClientReadOnly) return;
                  window.setTimeout(() => setIsClientDropdownOpen(false), 120);
                }}
                onChange={(event) => {
                  if (isClientReadOnly) return;
                  setClientName(event.target.value);
                  if (!isEditing) {
                    setSelectedClientId(null);
                    setClientSelectionMode("idle");
                    setClientPhone("");
                    setClientCpf("");
                    setClientEmail("");
                    setClientFirstName("");
                    setClientLastName("");
                    setClientReference("");
                    setIsClientDropdownOpen(true);
                  }
                }}
                className={`${inputWithIconClass} ${isClientReadOnly ? "pr-12 bg-stone-100 text-gray-600" : ""}`}
                required
              />
              {!isEditing && isClientReadOnly && (
                <button
                  type="button"
                  onClick={clearSelectedClient}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-stone-200 text-gray-500 hover:text-red-500 hover:border-red-200 flex items-center justify-center"
                  aria-label="Limpar cliente selecionado"
                  title="Limpar cliente selecionado"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {!isEditing && isClientDropdownOpen && clientName.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 mt-2 rounded-2xl border border-stone-200 bg-white shadow-xl overflow-hidden">
                  {filteredClients.length > 0 ? (
                    <div className="max-h-56 overflow-y-auto p-1.5">
                      {filteredClients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSelectClient(client)}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-50 text-sm text-gray-700 flex items-center justify-between gap-3"
                        >
                          <span className="font-medium truncate">{client.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {client.cpf && (
                              <span className="text-[10px] text-muted hidden sm:inline">
                                CPF {formatCpf(client.cpf)}
                              </span>
                            )}
                            {client.phone && (
                              <span className="text-xs text-muted">{formatBrazilPhone(client.phone)}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-1.5">
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={handleCreateNewClientFromName}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-50"
                      >
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-studio-green">
                          Cadastrar cliente
                        </p>
                        <p className="text-sm font-semibold text-studio-text truncate">
                          {clientName.trim()}
                        </p>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted mt-2 ml-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {isEditing
                ? "Atualize o cliente e os dados de contato se necessário."
                : "Digite nome, WhatsApp ou CPF para localizar um cliente. Se não encontrar, cadastre um novo."}
            </p>
            {isClientSelectionPending && clientName.trim().length > 0 && (
              <p className="text-[11px] text-amber-700 mt-2 ml-1">
                Selecione um cliente da lista suspensa ou toque em <strong>Cadastrar cliente</strong>.
              </p>
            )}
          </div>

          {shouldShowClientContactFields && (
            <>
              <div>
                <label className={labelClass}>WhatsApp</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    ref={clientPhoneInputRef}
                    name="clientPhone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={clientPhone}
                    onChange={(event) => setClientPhone(formatBrazilPhone(event.target.value))}
                    inputMode="numeric"
                    readOnly={clientSelectionMode === "existing"}
                    className={`${inputWithIconClass} ${clientSelectionMode === "existing" ? "bg-stone-100 text-gray-600" : ""}`}
                  />
                </div>
                {missingWhatsappWarning ? (
                  <p className="text-[11px] text-red-600 mt-2 ml-1">
                    Sem WhatsApp não será possível enviar mensagens automáticas para este cliente.
                  </p>
                ) : (
                  <p className="text-[11px] text-muted mt-2 ml-1">
                    Usado para automações e mensagens rápidas do atendimento.
                  </p>
                )}
              </div>

              {shouldShowCpfField && (
                <div>
                  <label className={labelClass}>CPF (para emissão de nota)</label>
                  <input
                    ref={clientCpfInputRef}
                    name="client_cpf"
                    type="text"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={clientCpf}
                    onChange={(event) => setClientCpf(formatCpf(event.target.value))}
                    readOnly={isExistingClientCpfLocked}
                    className={`${inputClass} ${isExistingClientCpfLocked ? "bg-stone-100 text-gray-600" : ""}`}
                  />
                  {duplicateCpfClient && (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800">
                        CPF já cadastrado
                      </p>
                      <p className="text-sm font-semibold text-amber-900 mt-1 leading-snug">
                        Este CPF já está cadastrado para <strong>{duplicateCpfClient.name}</strong>.
                      </p>
                      <div className="mt-3 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={handleLinkExistingClientByCpf}
                          className="w-full h-10 rounded-xl bg-amber-600 text-white text-[11px] font-extrabold uppercase tracking-wide"
                        >
                          Vincular ao cliente existente
                        </button>
                        <button
                          type="button"
                          onClick={handleChangeCpfAfterConflict}
                          className="w-full h-10 rounded-xl border border-amber-300 bg-white text-amber-800 text-[11px] font-extrabold uppercase tracking-wide"
                        >
                          Informar novo CPF
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-muted mt-2 ml-1">
                    Campo opcional. Aceita digitação ou colagem com/sem pontos e traço.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
      {isStep2Unlocked && (
      <section className={sectionCardClass}>
        <div className="flex items-center gap-2 mb-4">
          <div className={sectionNumberClass}>2</div>
          <h2 className={sectionHeaderTextClass}>O que e onde?</h2>
        </div>

        <div className="mb-6">
          <label className={labelClass}>Procedimento</label>
          {!selectedService ? (
            <div className="relative">
              <select
                name="serviceId"
                value={selectedServiceId}
                onChange={handleServiceChange}
                className={selectClass}
                required
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.duration_minutes} min)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-muted absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <>
              <input type="hidden" name="serviceId" value={selectedServiceId} />
              <div className="mt-1 rounded-2xl border border-studio-green/15 bg-studio-green/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-studio-green">
                      Procedimento selecionado
                    </p>
                    <p className="mt-1 text-sm font-bold text-studio-text leading-snug">{selectedService.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelectedService}
                    className="shrink-0 w-9 h-9 rounded-xl border border-studio-green/20 bg-white text-studio-green hover:bg-studio-light transition flex items-center justify-center"
                    aria-label="Trocar procedimento"
                    title="Trocar procedimento"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 rounded-xl border border-stone-100 bg-white px-3 py-2.5">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start justify-between gap-3">
                      <span className="font-semibold text-muted">Procedimento</span>
                      <span className="min-w-0 text-right font-semibold text-studio-text leading-snug">
                        {selectedService.name}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-muted">Tempo</span>
                      <span className="font-semibold text-studio-text">{selectedService.duration_minutes} min</span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-muted">Tempo total</span>
                      <span className="font-semibold text-studio-text">{selectedServiceTotalMinutes} min</span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-muted">Aceita domiciliar?</span>
                      <span className="font-semibold text-studio-text">
                        {selectedService.accepts_home_visit ? "Sim" : "Não"}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3 border-t border-stone-100 pt-2">
                      <span className="font-semibold text-muted">Valor</span>
                      <span className="font-semibold text-studio-text">R$ {displayedPrice || "0,00"}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>

        <div>
          <label className={labelClass}>Local</label>
          {!selectedService ? (
            <p className="text-[11px] text-muted ml-1 mt-2">Selecione primeiro o procedimento.</p>
          ) : canHomeVisit ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setHasLocationChoice(true);
                    setIsHomeVisit(false);
                    setDisplacementEstimate(null);
                    setDisplacementStatus("idle");
                    setDisplacementError(null);
                  }}
                  className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold uppercase transition-all border ${
                    hasLocationChoice && !isHomeVisit
                      ? "border-studio-green bg-green-50 text-studio-green"
                      : "border-stone-100 bg-stone-50 text-gray-400"
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  No Estúdio
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHasLocationChoice(true);
                    setIsHomeVisit(true);
                    setDisplacementEstimate(null);
                    setDisplacementStatus("idle");
                    setDisplacementError(null);
                  }}
                  className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold uppercase transition-all border ${
                    hasLocationChoice && isHomeVisit
                      ? "border-dom bg-dom/20 text-dom-strong"
                      : "border-stone-100 bg-stone-50 text-gray-400"
                  }`}
                >
                  <Car className="w-5 h-5" />
                  Em Domicílio
                </button>
              </div>
              {!hasLocationChoice && (
                <p className="text-[11px] text-muted ml-1 mt-2">
                  Escolha se o atendimento será no estúdio ou em domicílio.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setHasLocationChoice(true);
                    setIsHomeVisit(false);
                    setDisplacementEstimate(null);
                    setDisplacementStatus("idle");
                    setDisplacementError(null);
                  }}
                  className="py-3 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold uppercase transition-all border border-studio-green bg-green-50 text-studio-green"
                >
                  <Building2 className="w-5 h-5" />
                  No Estúdio
                </button>
              </div>
              <p className="text-[11px] text-muted ml-1 mt-2">Serviço sem opção domiciliar.</p>
            </>
          )}
          <input type="hidden" name="is_home_visit" value={isHomeVisit && hasLocationChoice ? "on" : ""} />

          <div
            className={`transition-all duration-300 overflow-hidden ${
              isHomeVisit && hasLocationChoice ? "max-h-200 opacity-100 mt-6" : "max-h-0 opacity-0 mt-0"
            }`}
          >
            <div className="space-y-4">
              {clientAddresses.length > 1 && addressMode === "existing" && showAddressSelectionList && (
                <div className="bg-dom/20 rounded-2xl border border-dom/35 p-4">
                  <div className="flex items-center gap-2 mb-3 text-dom-strong">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-extrabold uppercase tracking-wide">
                      Endereços cadastrados
                    </span>
                  </div>
                  <div className="space-y-2">
                    {clientAddresses.map((address, index) => {
                      const isSelected = address.id === selectedAddressId;
                      const addressMapsQuery = buildAddressQuery({
                        logradouro: address.address_logradouro ?? "",
                        numero: address.address_numero ?? "",
                        complemento: address.address_complemento ?? "",
                        bairro: address.address_bairro ?? "",
                        cidade: address.address_cidade ?? "",
                        estado: address.address_estado ?? "",
                        cep: address.address_cep ?? "",
                      });
                      return (
                        <div
                          key={address.id}
                          className={`rounded-2xl border p-3 ${
                            isSelected ? "border-dom/55 bg-white" : "border-dom/25 bg-white/70"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] font-extrabold uppercase tracking-wide text-dom-strong">
                                {index + 1}. {address.label || "Principal"}
                                {address.is_primary ? " • Principal" : ""}
                              </p>
                              <p className="text-sm font-semibold text-studio-text leading-snug">
                                {formatClientAddress(address) || "Endereço cadastrado"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <GoogleMapsAddressButton query={addressMapsQuery} />
                              <button
                                type="button"
                                onClick={() => handleSelectExistingAddress(address.id)}
                                className={`px-3 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border ${
                                  isSelected
                                    ? "bg-dom/15 border-dom/40 text-dom-strong"
                                    : "bg-white border-dom/30 text-dom-strong hover:bg-dom/10"
                                }`}
                              >
                                {isSelected ? "Selecionado" : "Usar esse"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={openAddressCreateModal}
                    className="mt-3 w-full py-3 rounded-2xl border border-dom/35 bg-white text-[11px] font-extrabold uppercase tracking-wide text-dom-strong hover:bg-dom/15 transition"
                  >
                    Cadastrar novo endereço
                  </button>
                </div>
              )}

              {addressMode === "existing" && selectedAddress && (!showAddressSelectionList || clientAddresses.length <= 1) && (
                <div className="bg-dom/20 rounded-2xl border border-dom/35 p-4">
                  <div className="flex items-center gap-2 mb-2 text-dom-strong">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-extrabold uppercase tracking-wide">
                      {selectedAddress.label || "Principal"}
                      {selectedAddress.is_primary ? " • Principal" : ""}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-studio-text leading-snug">
                    {formatClientAddress(selectedAddress) || "Endereço cadastrado"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <GoogleMapsAddressButton
                      query={buildAddressQuery({
                        logradouro: selectedAddress.address_logradouro ?? "",
                        numero: selectedAddress.address_numero ?? "",
                        complemento: selectedAddress.address_complemento ?? "",
                        bairro: selectedAddress.address_bairro ?? "",
                        cidade: selectedAddress.address_cidade ?? "",
                        estado: selectedAddress.address_estado ?? "",
                        cep: selectedAddress.address_cep ?? "",
                      })}
                    />
                    {clientAddresses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setShowAddressSelectionList(true)}
                        className="px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide bg-white border border-dom/35 text-dom-strong hover:bg-dom/25 transition"
                      >
                        Trocar endereço
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={openAddressCreateModal}
                      className="px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide bg-white border border-dom/35 text-dom-strong hover:bg-dom/25 transition"
                    >
                      Cadastrar novo endereço
                    </button>
                  </div>
                </div>
              )}

              {addressMode === "new" && addressConfirmed && (
                <div className="bg-dom/20 rounded-2xl border border-dom/35 p-4">
                  <div className="flex items-center gap-2 mb-2 text-dom-strong">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-extrabold uppercase tracking-wide">
                      {addressLabel || "Principal"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-studio-text leading-snug">
                    {mapsQuery || "Endereço informado"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <GoogleMapsAddressButton query={mapsQuery} />
                    <button
                      type="button"
                      onClick={openAddressCreateModal}
                      className="px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide bg-white border border-dom/35 text-dom-strong hover:bg-dom/25 transition"
                    >
                      Trocar endereço
                    </button>
                    {clientAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAddressSelectionList(true)}
                        className="px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide bg-white border border-dom/35 text-dom-strong hover:bg-dom/25 transition"
                      >
                        Usar cadastrado
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!addressConfirmed && clientAddresses.length === 0 && (
                <div className="bg-dom/20 rounded-2xl border border-dom/35 p-4">
                  <div className="flex items-center gap-2 mb-2 text-dom-strong">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-extrabold uppercase tracking-wide">
                      Endereço do atendimento
                    </span>
                  </div>
                  <p className="text-xs text-dom-strong/90 mb-4">
                    Cadastre o endereço para atendimento domiciliar. Você pode buscar por CEP ou por endereço.
                  </p>
                  <button
                    type="button"
                    onClick={openAddressCreateModal}
                    className="w-full h-12 rounded-2xl bg-white border border-dom/35 text-dom-strong font-extrabold text-xs uppercase tracking-wide hover:bg-dom/15"
                  >
                    Cadastrar endereço
                  </button>
                </div>
              )}

              <div className="rounded-2xl border border-stone-100 bg-white p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">
                  Taxa de deslocamento
                </p>
                {displacementStatus === "loading" && (
                  <p className="text-sm font-semibold text-studio-text">
                    Calculando taxa de deslocamento...
                  </p>
                )}
                {displacementStatus !== "loading" && displacementEstimate && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-500">
                      Distância estimada: {displacementEstimate.distanceKm.toFixed(2)} km.
                    </p>
                  </div>
                )}
                {displacementStatus === "error" && (
                  <p className="text-xs text-red-500">{displacementError}</p>
                )}
                {displacementStatus === "idle" && !displacementEstimate && (
                  <p className="text-xs text-gray-500">
                    Informe/selecione um endereço para calcular a taxa recomendada.
                  </p>
                )}
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-serif text-sm">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={manualDisplacementFee}
                        onChange={(event) => setManualDisplacementFee(event.target.value)}
                        placeholder={displacementEstimate?.fee.toFixed(2).replace(".", ",") ?? "0,00"}
                        className="w-full pl-9 pr-3 py-3 rounded-xl bg-stone-50 border border-stone-100 focus:outline-none focus:ring-1 focus:ring-studio-green focus:border-studio-green text-sm text-gray-700 font-medium"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setManualDisplacementFee("0,00")}
                      className="px-3 py-3 rounded-xl border border-dom/45 bg-white text-[10px] font-extrabold uppercase tracking-wide text-dom-strong hover:bg-dom/25"
                      >
                        Zerar
                      </button>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {isStep3Unlocked && (
      <section className={sectionCardClass}>
        <div className="flex items-center gap-2 mb-4">
          <div className={sectionNumberClass}>3</div>
          <h2 className={sectionHeaderTextClass}>Quando?</h2>
        </div>

        <div className={`grid ${isEditing ? "grid-cols-2" : "grid-cols-1"} gap-4 mb-4`}>
          {isEditing && (
            <div>
              <label className={labelClass}>Valor final</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-serif text-sm">R$</span>
                <input
                  type="tel"
                  value={finalPrice}
                  readOnly
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-stone-50 border border-stone-100 focus:outline-none focus:ring-1 focus:ring-studio-green focus:border-studio-green text-sm text-gray-700 font-semibold"
                />
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>Data</label>
            <input type="hidden" name="date" value={selectedDate} />
            <MonthCalendar
              currentMonth={activeMonth}
              selectedDate={selectedDateObj}
              onSelectDay={handleSelectScheduleDay}
              onChangeMonth={handleChangeScheduleMonth}
              isDayDisabled={isScheduleDayDisabled}
              className="rounded-2xl shadow-none border border-stone-100 p-3"
              enableSwipe
            />
            {isLoadingMonthAvailability && (
              <p className="text-[11px] text-muted mt-2 ml-1">Carregando disponibilidade do mês...</p>
            )}
            {blockStatus === "loading" && (
              <p className="text-[11px] text-muted mt-2 ml-1">Verificando bloqueios...</p>
            )}
            {blockStatus === "idle" && hasShiftBlock && (
              <div className="text-[11px] text-warn bg-warn/10 border border-warn/20 px-3 py-2 rounded-xl mt-2">
                Você está de plantão esse dia, quer agendar mesmo assim?
              </div>
            )}
            {blockStatus === "idle" && !hasShiftBlock && hasBlocks && (
              <div className="text-[11px] text-warn bg-warn/10 border border-warn/20 px-3 py-2 rounded-xl mt-2">
                Há bloqueios registrados para esta data. Verifique antes de confirmar o horário.
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="mb-4">
            <label className={labelClass}>Ajustar valor (opcional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-serif text-sm">R$</span>
              <input
                name="price_override"
                type="text"
                inputMode="decimal"
                value={priceOverride}
                onChange={(event) => setPriceOverride(event.target.value)}
                placeholder={displayedPrice || "0,00"}
                className="w-full pl-9 pr-3 py-3 rounded-xl bg-stone-50 border border-stone-100 focus:outline-none focus:ring-1 focus:ring-studio-green focus:border-studio-green text-sm text-gray-700 font-medium"
              />
            </div>
            <p className="text-[10px] text-muted mt-1 ml-1">Se deixar vazio, usamos o valor do serviço.</p>
          </div>
        ) : null}

        <div>
          <label className={labelClass}>Horário</label>
          {!selectedDate ? (
            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-3 py-3 text-xs text-muted">
              Selecione um dia no calendário para abrir os horários.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {isLoadingSlots ? (
                <div className="col-span-4 text-xs text-muted">Carregando horários...</div>
              ) : availableSlots.length === 0 ? (
                <div className="col-span-4 text-xs text-muted">Sem horários disponíveis para esta data.</div>
              ) : (
                availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      selectedTime === slot
                        ? "bg-studio-green text-white shadow-sm transform scale-105"
                        : "border border-stone-100 text-gray-400 hover:border-studio-green hover:text-studio-green"
                    }`}
                  >
                    {slot}
                  </button>
                ))
              )}
            </div>
          )}
          <select
            name="time"
            value={selectedTime}
            onChange={(event) => setSelectedTime(event.target.value)}
            className="sr-only"
            required
            disabled={!selectedServiceId || !selectedDate || isLoadingSlots}
          >
            {!selectedServiceId || !selectedDate ? (
              <option value="">Selecione data e serviço</option>
            ) : isLoadingSlots ? (
              <option value="">Carregando horários...</option>
            ) : availableSlots.length === 0 ? (
              <option value="">Sem horários disponíveis</option>
            ) : (
              availableSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))
            )}
          </select>
          <p className="text-[11px] text-muted mt-2 ml-1">
            Horários já consideram o tempo de preparo antes/depois.
          </p>
        </div>

      </section>
      )}

      {!isEditing && isStep4Unlocked && (
        <section className={sectionCardClass}>
          <div className="flex items-center gap-2 mb-4">
            <div className={sectionNumberClass}>4</div>
            <h2 className={sectionHeaderTextClass}>Financeiro</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-3xl p-4">
              <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Itens</p>

              <div className="mt-3 space-y-2 text-sm">
                {financeDraftItems.some((item) => item.type === "service" || item.type === "fee") ? (
                  financeDraftItems
                    .filter((item) => item.type === "service" || item.type === "fee")
                    .map((item, index) => (
                    <div key={`${item.type}-${item.label}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 items-start">
                      <div>
                        <span className={item.type === "fee" ? "text-dom-strong font-semibold" : "text-studio-text"}>
                          {item.label}
                        </span>
                        {item.type === "fee" && (
                          <p className="mt-1 text-[11px] text-muted">
                            Distância estimada: {displacementEstimate?.distanceKm?.toFixed(2) ?? "0.00"} km
                          </p>
                        )}
                      </div>
                      {item.type === "service" || item.type === "fee" ? (
                        <span className="tabular-nums font-bold text-studio-text">
                          R$ {formatCurrencyLabel(Number(item.amount) * Number(item.qty ?? 1))}
                        </span>
                      ) : (
                        <span className="tabular-nums font-bold text-studio-text">
                          R$ {formatCurrencyLabel(Number(item.amount) * Number(item.qty ?? 1))}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted">Selecione um serviço para montar o financeiro.</p>
                )}

                {financeExtraItems.length > 0 && (
                  <div className="pt-2">
                    <div className="h-px bg-stone-100 mb-2" />
                    <div className="space-y-2">
                      {financeExtraItems.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[1fr_100px_auto] gap-2 items-center"
                        >
                          <input
                            type="text"
                            value={item.label}
                            onChange={(event) =>
                              setFinanceExtraItems((current) =>
                                current.map((entry) =>
                                  entry.id === item.id ? { ...entry, label: event.target.value } : entry
                                )
                              )
                            }
                            className="rounded-xl border border-line px-3 py-2 text-xs"
                            placeholder="Descrição"
                          />
                          <input
                            type="text"
                            inputMode="decimal"
                            value={formatCurrencyInput(item.amount)}
                            onChange={(event) =>
                              setFinanceExtraItems((current) =>
                                current.map((entry) =>
                                  entry.id === item.id
                                    ? { ...entry, amount: Math.max(0, parseDecimalText(event.target.value) ?? 0) }
                                    : entry
                                )
                              )
                            }
                            className="rounded-xl border border-line px-3 py-2 text-xs"
                            placeholder="0,00"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFinanceItem(item.id)}
                            className="px-2 py-2 rounded-xl border border-line text-[10px] font-extrabold uppercase tracking-wide text-gray-500 hover:text-red-600 hover:border-red-200"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="h-px bg-gray-100 my-2" />
                <div className="flex justify-between text-muted font-bold">
                  <span>Subtotal</span>
                  <span className="tabular-nums">R$ {formatCurrencyLabel(scheduleSubtotal)}</span>
                </div>
                {effectiveScheduleDiscount > 0 && (
                  <div className="flex justify-between text-muted font-bold">
                    <span>
                      Desconto {scheduleDiscountType === "pct" ? `(${effectiveScheduleDiscountInputValue}%)` : ""}
                    </span>
                    <span className="tabular-nums">- R$ {formatCurrencyLabel(effectiveScheduleDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-studio-text font-black text-base pt-1">
                  <span>Total</span>
                  <span className="tabular-nums">R$ {formatCurrencyLabel(scheduleTotal)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl p-4">
              <div className="border-t border-line pt-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Adicionar item</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input
                    className="col-span-2 rounded-xl border border-line px-3 py-2 text-xs"
                    placeholder="Novo item"
                    value={financeNewItemLabel}
                    onChange={(event) => setFinanceNewItemLabel(event.target.value)}
                  />
                  <input
                    className="rounded-xl border border-line px-3 py-2 text-xs"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={financeNewItemAmount}
                    onChange={(event) => setFinanceNewItemAmount(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-studio-text"
                  onClick={handleAddFinanceItem}
                >
                  Adicionar item
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl p-4">
              <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Desconto</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  value={scheduleDiscountType}
                  onChange={(event) => setScheduleDiscountType(event.target.value === "pct" ? "pct" : "value")}
                  className="rounded-xl border border-line px-3 py-2 text-xs"
                >
                  <option value="value">Desconto em R$</option>
                  <option value="pct">Desconto em %</option>
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  value={scheduleDiscountValue}
                  onChange={(event) => setScheduleDiscountValue(event.target.value)}
                  className="rounded-xl border border-line px-3 py-2 text-xs"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl p-4">
              <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Quando cobrar</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCollectionTimingDraft("at_attendance");
                    setChargeFlowError(null);
                  }}
                  className={`rounded-2xl border px-4 py-3 text-xs font-extrabold uppercase tracking-wide ${
                    collectionTimingDraft === "at_attendance"
                      ? "border-studio-green bg-studio-light text-studio-green"
                      : "border-gray-200 text-muted hover:bg-gray-50"
                  }`}
                >
                  Cobrar no atendimento
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCollectionTimingDraft("charge_now");
                    setChargeFlowError(null);
                  }}
                  className={`rounded-2xl border px-4 py-3 text-xs font-extrabold uppercase tracking-wide ${
                    collectionTimingDraft === "charge_now"
                      ? "border-studio-green bg-studio-light text-studio-green"
                      : "border-gray-200 text-muted hover:bg-gray-50"
                  }`}
                  title="Cobrança no agendamento"
                >
                  Cobrar agora
                </button>
              </div>
              {collectionTimingDraft === "charge_now" && (
                <div className="mt-4 space-y-3 border-t border-line pt-4">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Forma de pagamento</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setChargeNowMethodDraft("pix_mp");
                          setChargeNowSignalValueConfirmed(false);
                        }}
                        className={`rounded-xl border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 ${
                          chargeNowMethodDraft === "pix_mp"
                            ? "border-studio-green bg-studio-light text-studio-green"
                            : "border-line text-muted hover:bg-paper"
                        }`}
                      >
                        <Image
                          src="/icons/pix-brazil-symbol-official.svg"
                          alt=""
                          width={16}
                          height={16}
                          className="h-4 w-4"
                        />
                        PIX
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChargeNowMethodDraft("card");
                          setChargeNowSignalValueConfirmed(false);
                        }}
                        className={`rounded-xl border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 ${
                          chargeNowMethodDraft === "card"
                            ? "border-studio-green bg-studio-light text-studio-green"
                            : "border-line text-muted hover:bg-paper"
                        }`}
                      >
                        <CreditCard className="h-4 w-4" />
                        Cartão
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChargeNowMethodDraft("cash");
                          setChargeNowSignalValueConfirmed(false);
                        }}
                        className={`rounded-xl border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 ${
                          chargeNowMethodDraft === "cash"
                            ? "border-studio-green bg-studio-light text-studio-green"
                            : "border-line text-muted hover:bg-paper"
                        }`}
                      >
                        <Banknote className="h-4 w-4" />
                        Dinheiro
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChargeNowMethodDraft("waiver");
                          setChargeNowSignalValueConfirmed(false);
                        }}
                        className={`rounded-xl border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 ${
                          chargeNowMethodDraft === "waiver"
                            ? "border-sky-500 bg-sky-50 text-sky-700"
                            : "border-line text-muted hover:bg-paper"
                        }`}
                      >
                        <Gift className="h-4 w-4" />
                        Cortesia
                      </button>
                    </div>
                  </div>

                  {chargeNowMethodDraft === "waiver" && (
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-sky-700">
                        Cortesia interna
                      </p>
                      <p className="mt-1 text-[11px] text-sky-900">
                        O agendamento será criado com pagamento liberado (<strong>Cortesia</strong>) e não abrirá fluxo de cobrança.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {collectionTimingDraft === "charge_now" && chargeNowMethodDraft !== null && chargeNowMethodDraft !== "waiver" && (
              <div className="bg-white border border-gray-100 rounded-3xl p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Valor a cobrar agora</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setChargeNowAmountMode("full");
                      setHasChargeNowAmountModeChoice(true);
                      setChargeNowSignalValueConfirmed(false);
                    }}
                    className={`rounded-xl border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide ${
                      hasChargeNowAmountModeChoice && chargeNowAmountMode === "full"
                        ? "border-studio-green bg-studio-light text-studio-green"
                        : "border-line text-muted hover:bg-paper"
                    }`}
                  >
                    Integral
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChargeNowAmountMode("signal");
                      setHasChargeNowAmountModeChoice(true);
                      setChargeNowSignalValueConfirmed(false);
                      if (!chargeNowCustomAmount.trim() && chargeNowSuggestedSignalAmount > 0) {
                        setChargeNowCustomAmount(formatCurrencyInput(chargeNowSuggestedSignalAmount));
                      }
                    }}
                    className={`rounded-xl border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide ${
                      hasChargeNowAmountModeChoice && chargeNowAmountMode === "signal"
                        ? "border-studio-green bg-studio-light text-studio-green"
                        : "border-line text-muted hover:bg-paper"
                    }`}
                  >
                    Sinal ({Number.isInteger(effectiveSignalPercentageDraft) ? effectiveSignalPercentageDraft : Number(effectiveSignalPercentageDraft.toFixed(2))}%)
                  </button>
                </div>

                {hasChargeNowAmountModeChoice && chargeNowAmountMode === "signal" && (
                  <div className="mt-3 rounded-2xl border border-line bg-paper px-4 py-3">
                    <div className="grid grid-cols-[1fr_140px_auto] items-center gap-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                        Valor do sinal
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={chargeNowCustomAmount}
                        onChange={(event) => {
                          setChargeNowCustomAmount(event.target.value);
                          setChargeNowSignalValueConfirmed(false);
                        }}
                        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-black text-studio-text tabular-nums outline-none focus:border-studio-green focus:ring-1 focus:ring-studio-green"
                        placeholder={formatCurrencyInput(chargeNowSuggestedSignalAmount || 0)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!chargeNowAmountError) {
                            setChargeNowSignalValueConfirmed(true);
                          }
                        }}
                        className={`rounded-xl border px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide ${
                          chargeNowSignalValueConfirmed
                            ? "border-studio-green bg-studio-light text-studio-green"
                            : "border-line text-muted hover:bg-paper"
                        }`}
                      >
                        {chargeNowSignalValueConfirmed ? "Confirmado" : "Confirmar valor"}
                      </button>
                    </div>
                    {chargeNowAmountError && (
                      <p className="mt-2 text-[11px] font-semibold text-red-700">{chargeNowAmountError}</p>
                    )}
                    {!chargeNowAmountError && chargeNowMethodDraft === "pix_mp" && chargeNowDraftAmount > 0 && (
                      <p className="mt-2 text-[11px] text-muted">
                        Valor mínimo do PIX Mercado Pago: R$ 1,00.
                      </p>
                    )}
                  </div>
                )}

                {hasChargeNowAmountModeChoice && chargeNowAmountMode === "full" && chargeNowAmountError && (
                  <p className="mt-2 text-[11px] font-semibold text-red-700">{chargeNowAmountError}</p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {portalTarget &&
        isClientCreateModalOpen &&
        createPortal(
          <div className="absolute inset-0 z-50 bg-black/40 flex items-end justify-center px-5 py-5 overflow-hidden overscroll-contain">
            <div className="w-full max-w-md max-h-full overflow-y-auto bg-white rounded-3xl shadow-float border border-line p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-[11px] font-extrabold text-muted uppercase tracking-widest">
                    Cliente
                  </p>
                  <h3 className="text-lg font-serif text-studio-text">Cadastrar cliente</h3>
                  <p className="text-xs text-muted mt-1">
                    Defina nome interno, nome público e dados de contato.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClientCreateModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {clientCreateError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {clientCreateError}
                  </div>
                )}

                <div>
                  <label className={labelClass}>Primeiro nome</label>
                  <input
                    ref={clientCreateFirstNameInputRef}
                    type="text"
                    value={clientFirstName}
                    onChange={(event) => {
                      setClientFirstName(event.target.value);
                      setClientCreateError(null);
                    }}
                    className={inputClass}
                    placeholder="Ex: Renato"
                  />
                </div>

                <div>
                  <label className={labelClass}>Sobrenome (completo)</label>
                  <input
                    type="text"
                    value={clientLastName}
                    onChange={(event) => {
                      setClientLastName(event.target.value);
                      setClientCreateError(null);
                    }}
                    className={inputClass}
                    placeholder="Ex: Mazzarino de Farias"
                  />
                </div>

                <div>
                  <label className={labelClass}>Referência</label>
                  <input
                    type="text"
                    value={clientReference}
                    onChange={(event) => {
                      setClientReference(event.target.value);
                      setClientCreateError(null);
                    }}
                    className={inputClass}
                    placeholder="Ex: Gerente Mercado"
                  />
                  <p className="text-[10px] text-muted mt-1 ml-1">
                    Uso interno. Não aparece em mensagens e telas públicas.
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                    Prévia do nome no sistema
                  </p>
                  <p className="mt-1 text-sm font-semibold text-studio-text">{clientDraftInternalPreview}</p>
                  <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                    Nome público (voucher/comprovante/agendamento online)
                  </p>
                  <p className="mt-1 text-sm font-semibold text-studio-text">{clientDraftPublicPreview}</p>
                </div>

                <div>
                  <label className={labelClass}>WhatsApp</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      ref={clientPhoneInputRef}
                      type="tel"
                      inputMode="numeric"
                      placeholder="(00) 00000-0000"
                      value={clientPhone}
                      onChange={(event) => {
                        setClientPhone(formatBrazilPhone(event.target.value));
                        setClientCreateError(null);
                      }}
                      className={inputWithIconClass}
                    />
                  </div>
                  <p className="text-[11px] text-muted mt-2 ml-1">
                    Opcional. Se preencher, será salvo como telefone principal e WhatsApp do cliente.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    inputMode="email"
                    placeholder="cliente@exemplo.com"
                    value={clientEmail}
                    onChange={(event) => {
                      setClientEmail(event.target.value);
                      setClientCreateError(null);
                    }}
                    className={inputClass}
                  />
                  {clientEmail.trim() && !isValidEmailAddress(clientEmail) && (
                    <p className="text-[11px] text-red-600 mt-2 ml-1">
                      Informe um email válido.
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>CPF (para emissão de nota)</label>
                  <input
                    ref={clientCpfInputRef}
                    type="text"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={clientCpf}
                    onChange={(event) => {
                      setClientCpf(formatCpf(event.target.value));
                      setClientCreateError(null);
                    }}
                    className={inputClass}
                  />
                  <p className="text-[11px] text-muted mt-2 ml-1">
                    Opcional. Aceita digitação e colagem com ou sem pontos/traço.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsClientCreateModalOpen(false)}
                    className="w-full h-12 rounded-2xl bg-white border border-line text-studio-text font-extrabold text-xs uppercase tracking-wide"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveClientDraftFromModal}
                    className="w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-900/10"
                  >
                    Salvar cliente
                  </button>
                </div>
              </div>
            </div>
          </div>,
          portalTarget
        )}

      {portalTarget &&
        isAddressModalOpen &&
        createPortal(
          <div className="absolute inset-0 z-50 bg-black/40 flex items-end justify-center px-5 py-5 overflow-hidden overscroll-contain">
            <div className="w-full max-w-md max-h-full overflow-y-auto bg-white rounded-3xl shadow-float border border-line p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-[11px] font-extrabold text-muted uppercase tracking-widest">Endereço</p>
                  <h3 className="text-lg font-serif text-studio-text">
                    {addressModalStep === "chooser"
                      ? "Cadastrar endereço"
                      : addressModalStep === "cep"
                        ? "Buscar por CEP"
                        : addressModalStep === "search"
                          ? "Buscar por endereço"
                          : "Confirmar endereço"}
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    {addressModalStep === "chooser"
                      ? "Escolha como deseja localizar o endereço."
                      : addressModalStep === "form"
                        ? resolvedClientId
                          ? "Revise os dados e salve o endereço para este cliente."
                          : "Revise os dados. O endereço será salvo junto com o agendamento."
                        : "Preencha e confirme para continuar."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAddressCreateModal}
                  className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {addressModalStep !== "chooser" && (
                <button
                  type="button"
                  onClick={() => {
                    setAddressModalStep("chooser");
                    setAddressSaveError(null);
                  }}
                  className="mb-4 text-[11px] font-extrabold uppercase tracking-wide text-dom-strong"
                >
                  Voltar
                </button>
              )}

              {addressModalStep === "chooser" && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAddressModalStep("cep");
                      setCepDraft("");
                      setCepDraftStatus("idle");
                      setAddressSaveError(null);
                    }}
                    className="w-full rounded-2xl border border-dom/45 bg-white px-4 py-3 text-left hover:border-dom/55 hover:bg-dom/10 transition"
                  >
                    <span className="text-[10px] font-extrabold uppercase text-dom-strong tracking-wide">
                      Buscar por CEP
                    </span>
                    <span className="block text-xs text-dom-strong/80 mt-1">
                      Digite o CEP e revise os dados antes de salvar.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddressModalStep("search");
                      setAddressSearchQuery("");
                      setAddressSearchResults([]);
                      setAddressSearchLoading(false);
                      setAddressSearchError(null);
                      setAddressSaveError(null);
                    }}
                    className="w-full rounded-2xl border border-dom/45 bg-white px-4 py-3 text-left hover:border-dom/55 hover:bg-dom/10 transition"
                  >
                    <span className="text-[10px] font-extrabold uppercase text-dom-strong tracking-wide">
                      Buscar por endereço
                    </span>
                    <span className="block text-xs text-dom-strong/80 mt-1">
                      Digite rua/bairro e escolha o endereço correto.
                    </span>
                  </button>
                </div>
              )}

              {addressModalStep === "cep" && (
                <div>
                  <div className="mb-4">
                    <label className={labelClass}>CEP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cepDraft}
                      onChange={(event) => {
                        setCepDraft(formatCep(event.target.value));
                        setCepDraftStatus("idle");
                      }}
                      className={inputClass}
                    />
                    {cepDraftStatus === "error" && (
                      <p className="text-[11px] text-red-500 mt-2 ml-1">
                        CEP inválido. Verifique e tente novamente.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const found = await handleCepDraftLookup();
                        if (!found) return;
                        applyAddressDraftFields({
                          cep: found.cep,
                          logradouro: found.logradouro,
                          bairro: found.bairro,
                          cidade: found.cidade,
                          estado: found.estado,
                        });
                        setAddressModalStep("form");
                      }}
                      disabled={cepDraftStatus === "loading"}
                      className="w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-900/10 disabled:opacity-70"
                    >
                      {cepDraftStatus === "loading" ? "Buscando..." : "Buscar CEP"}
                    </button>
                  </div>
                </div>
              )}

              {addressModalStep === "search" && (
                <div>
                  <div className="mb-3">
                    <label className={labelClass}>Endereço</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={addressSearchQuery}
                        onChange={(event) => setAddressSearchQuery(event.target.value)}
                        className={inputWithIconClass}
                      />
                    </div>
                    <p className="text-[10px] text-muted mt-2 ml-1">Ex: Rua das Acácias, 120, Moema</p>
                    {addressSearchError && (
                      <p className="text-[11px] text-red-500 mt-2 ml-1">{addressSearchError}</p>
                    )}
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {addressSearchLoading && <p className="text-[11px] text-muted">Buscando endereços...</p>}
                    {!addressSearchLoading && addressSearchQuery.trim().length < 3 && (
                      <p className="text-[11px] text-muted">Digite pelo menos 3 caracteres para iniciar.</p>
                    )}
                    {!addressSearchLoading &&
                      addressSearchQuery.trim().length >= 3 &&
                      addressSearchResults.length === 0 && (
                        <p className="text-[11px] text-muted">Nenhum endereço encontrado.</p>
                      )}
                    {addressSearchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={async () => {
                          const ok = await handleAddressSearchResultSelect(result);
                          if (ok) setAddressModalStep("form");
                        }}
                        className="w-full text-left px-4 py-3 rounded-2xl border border-stone-100 hover:border-stone-200 hover:bg-stone-50 transition"
                      >
                        <p className="text-sm font-semibold text-studio-text">{result.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {addressModalStep === "form" && (
                <div className="space-y-3">
                  {addressSaveError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {addressSaveError}
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>Identificação</label>
                    <input
                      type="text"
                      value={addressLabel}
                      onChange={(event) => setAddressLabel(event.target.value)}
                      className={inputClass}
                      placeholder="Principal"
                    />
                  </div>

                  <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={clientAddresses.length === 0 ? true : addressIsPrimaryDraft}
                        onChange={(event) => setAddressIsPrimaryDraft(event.target.checked)}
                        disabled={clientAddresses.length === 0}
                        className="h-4 w-4 rounded border-stone-300 text-studio-green focus:ring-studio-green"
                      />
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-studio-text">
                          Definir como endereço principal
                        </p>
                        <p className="text-[10px] text-muted">
                          {clientAddresses.length === 0
                            ? "Primeiro endereço do cliente será principal automaticamente."
                            : "O endereço principal será selecionado por padrão nos próximos agendamentos."}
                        </p>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className={labelClass}>CEP</label>
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => {
                        setCep(formatCep(e.target.value));
                      }}
                      inputMode="numeric"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Rua / Avenida</label>
                    <input
                      type="text"
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={labelClass}>Número</label>
                      <input
                        type="text"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Complemento</label>
                      <input
                        type="text"
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Bairro</label>
                      <input
                        type="text"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Cidade</label>
                      <input
                        type="text"
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Estado (UF)</label>
                    <input
                      type="text"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value.toUpperCase())}
                      maxLength={2}
                      className={`${inputClass} uppercase`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAddressModalStep("chooser")}
                      disabled={addressSavePending}
                      className="w-full h-12 rounded-2xl bg-white border border-line text-studio-text font-extrabold text-xs uppercase tracking-wide disabled:opacity-70"
                    >
                      Buscar novamente
                    </button>
                    <button
                      type="button"
                      onClick={handleAddressModalSave}
                      disabled={addressSavePending}
                      className="w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-900/10 disabled:opacity-70"
                    >
                      {addressSavePending ? "Salvando..." : "Salvar endereço"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          portalTarget
        )}

      {portalTarget &&
        isSendPromptOpen &&
        createPortal(
          <div className="absolute inset-0 z-50 bg-black/40 flex items-end justify-center px-5 py-5 overflow-hidden overscroll-contain">
            <div className="w-full max-w-md max-h-full overflow-y-auto bg-white rounded-3xl shadow-float border border-line p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-[11px] font-extrabold text-muted uppercase tracking-widest">
                    {confirmationSheetStep === "charge_payment" ? "Cobrança no agendamento" : "Confirmar agendamento"}
                  </p>
                  <h3 className="text-lg font-serif text-studio-text">
                    {confirmationSheetStep === "creating_charge"
                      ? "Criando agendamento..."
                      : confirmationSheetStep === "charge_payment"
                        ? "Pagamento do agendamento"
                        : confirmationSheetStep === "charge_manual_prompt"
                          ? "Aviso manual do agendamento"
                          : "Revisar dados antes de criar"}
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    {confirmationSheetStep === "creating_charge"
                      ? "Estamos criando o agendamento e preparando o checkout."
                      : confirmationSheetStep === "charge_payment"
                        ? "Finalize a cobrança agora ou jogue para pagar no atendimento."
                        : confirmationSheetStep === "charge_manual_prompt"
                          ? "Escolha se deseja enviar o aviso manual de agendamento agora."
                          : "Confira os dados do agendamento antes de confirmar."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmationSheetClose}
                  className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {chargeFlowError && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {chargeFlowError}
                </div>
              )}

              {confirmationSheetStep === "creating_charge" ? (
                <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-5 text-center">
                  <div className="mx-auto h-10 w-10 rounded-full border-2 border-studio-green/20 border-t-studio-green animate-spin" />
                  <p className="mt-3 text-sm font-semibold text-studio-text">Preparando cobrança...</p>
                  <p className="mt-1 text-xs text-muted">Isso leva apenas alguns segundos.</p>
                </div>
              ) : confirmationSheetStep === "charge_payment" && chargeBookingState ? (
                <div className="space-y-3">
                  <AttendancePaymentModal
                    open
                    variant="embedded"
                    hideWaiverOption
                    chargeAmountOverride={resolveChargeAmountForModal()}
                    checkout={chargeBookingState.checkout}
                    items={chargeBookingState.checkoutItems}
                    payments={chargeBookingState.payments}
                    appointmentPaymentStatus={chargeBookingState.appointmentPaymentStatus}
                    pixKeyValue={pixKeyValue}
                    pixKeyType={pixKeyType}
                    pointEnabled={pointEnabled}
                    pointTerminalName={pointTerminalName}
                    pointTerminalModel={pointTerminalModel}
                    onClose={() => void handleSwitchChargeToAttendance()}
                    onSaveItems={handleChargeSaveItems}
                    onSetDiscount={handleChargeSetDiscount}
                    onRegisterCashPayment={handleChargeRegisterCashPayment}
                    onRegisterPixKeyPayment={handleChargeRegisterPixKeyPayment}
                    onCreatePixPayment={handleChargeCreatePixPayment}
                    onPollPixStatus={handleChargePollPixStatus}
                    onCreatePointPayment={handleChargeCreatePointPayment}
                    onPollPointStatus={handleChargePollPointStatus}
                    onWaivePayment={async () => ({ ok: false })}
                    onSendReceipt={handleChargeSendReceipt}
                    receiptFlowMode="manual"
                    initialMethod={chargeNowMethodDraft ?? "pix_mp"}
                    successResolveLabel="Continuar"
                    onReceiptPromptResolved={async () => {
                      await handleChargePaymentResolved();
                    }}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSwitchChargeToAttendance()}
                      disabled={finishingChargeFlow}
                      className="w-full h-12 rounded-2xl bg-white border border-line text-studio-text font-extrabold text-xs uppercase tracking-wide disabled:opacity-70"
                    >
                      {finishingChargeFlow ? "Finalizando..." : "Cobrar no atendimento"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChargeFlowError(null)}
                      className="w-full h-12 rounded-2xl bg-studio-light text-studio-green font-extrabold text-xs uppercase tracking-wide"
                    >
                      Cobrar de outra forma
                    </button>
                  </div>
                </div>
              ) : confirmationSheetStep === "charge_manual_prompt" && chargeBookingState ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                    <p className="text-xs font-semibold text-studio-text">
                      Agendamento criado{chargeBookingState.appointmentPaymentStatus === "paid" ? " e pagamento confirmado" : ""}.
                    </p>
                    <p className="text-xs text-muted mt-1">
                      Agora você pode decidir se quer enviar o aviso manual pelo WhatsApp.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => void handleResolveDeferredManualPrompt(true)}
                      className="w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-900/10"
                    >
                      Enviar aviso manual
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleResolveDeferredManualPrompt(false)}
                      className="w-full h-12 rounded-2xl bg-white border border-line text-studio-text font-extrabold text-xs uppercase tracking-wide"
                    >
                      Não enviar aviso manual
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">
                      Resumo
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-500">Cliente</span>
                        <span className="text-right font-semibold text-studio-text">
                          {clientDisplayPreviewLabel || "Cliente"}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-500">Serviço</span>
                        <span className="text-right font-semibold text-studio-text">
                          {selectedService?.name || "Selecione um serviço"}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-500">Data e horário</span>
                        <span className="text-right font-semibold text-studio-text">
                          {selectedDate
                            ? `${format(parseISO(selectedDate), "dd/MM/yyyy", { locale: ptBR })} • ${selectedTime || "--:--"}`
                            : "--"}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-500">Local</span>
                        <span className="text-right font-semibold text-studio-text">
                          {isHomeVisit ? `Domicílio${addressLabel ? ` • ${addressLabel}` : ""}` : "Estúdio"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-100 bg-white p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">
                      Financeiro
                    </p>
                    <div className="space-y-2 text-sm">
                      {financeDraftItems.length > 0 ? (
                        financeDraftItems.map((item, index) => (
                          <div key={`${item.type}-${item.label}-${index}`} className="flex items-center justify-between gap-3">
                            <span className="text-gray-500">{item.label}</span>
                            <span className="font-semibold text-studio-text">
                              R$ {formatCurrencyLabel(Number(item.amount) * Number(item.qty ?? 1))}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted">Sem itens financeiros configurados.</p>
                      )}
                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-stone-100">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="font-semibold text-studio-text">R$ {formatCurrencyLabel(scheduleSubtotal)}</span>
                      </div>
                      {effectiveScheduleDiscount > 0 && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-500">
                            Desconto {scheduleDiscountType === "pct" ? `(${effectiveScheduleDiscountInputValue}%)` : ""}
                          </span>
                          <span className="font-semibold text-studio-text">
                            - R$ {formatCurrencyLabel(effectiveScheduleDiscount)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">Cobrança</span>
                        <span className="font-semibold text-studio-text">
                          {collectionTimingDraft === "at_attendance" ? "No atendimento" : "No agendamento"}
                        </span>
                      </div>
                      {collectionTimingDraft === "charge_now" && (
                        <>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-500">Forma</span>
                            <span className="font-semibold text-studio-text">
                              {chargeNowMethodDraft === "pix_mp"
                                ? "PIX"
                                : chargeNowMethodDraft === "card"
                                  ? "Cartão"
                                  : chargeNowMethodDraft === "cash"
                                    ? "Dinheiro"
                                    : "Cortesia"}
                            </span>
                          </div>
                          {chargeNowMethodDraft !== "waiver" ? (
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-gray-500">Valor a cobrar agora</span>
                              <span className="font-semibold text-studio-text">
                                R$ {formatCurrencyLabel(chargeNowDraftAmount)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-gray-500">Status financeiro</span>
                              <span className="font-semibold text-sky-700">Cortesia / pagamento liberado</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-gray-500">Total do agendamento</span>
                      <span className="text-base font-bold text-studio-text">R$ {formatCurrencyLabel(scheduleTotal)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {collectionTimingDraft === "charge_now" && chargeNowMethodDraft !== "waiver" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleBeginImmediateCharge()}
                          disabled={
                            creatingChargeBooking ||
                            !isChargeNowMethodChosen ||
                            !isChargeNowAmountConfirmed ||
                            Boolean(chargeNowAmountError)
                          }
                          className="w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-900/10 disabled:opacity-70"
                        >
                          {creatingChargeBooking ? "Preparando cobrança..." : "Cobrar"}
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmationSheetClose}
                          className="w-full h-12 rounded-2xl bg-white border border-line text-studio-text font-extrabold text-xs uppercase tracking-wide"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSchedule(true)}
                          className="w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-900/10"
                        >
                          {isCourtesyDraft ? "Agendar cortesia e avisar" : "Agendar e avisar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSchedule(false)}
                          className="w-full h-12 rounded-2xl bg-white border border-line text-studio-text font-extrabold text-xs uppercase tracking-wide"
                        >
                          {isCourtesyDraft ? "Agendar cortesia sem enviar" : "Agendar sem enviar"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>,
          portalTarget
        )}

      {(isEditing || isStep4Unlocked) && (
      <section className={sectionCardClass}>
        <label className={labelClass}>Observações internas do agendamento</label>
        <textarea
          name="internalNotes"
          rows={2}
          value={internalNotes}
          onChange={(event) => setInternalNotes(event.target.value)}
          className={`${inputClass} resize-none`}
          placeholder="Ex: Cliente prefere pressão leve..."
        />
        <p className="text-[10px] text-muted mt-1 ml-1">Aparece no atendimento.</p>
      </section>
      )}

      {isEditing ? (
        <button
          type="submit"
          className="w-full h-14 bg-studio-green text-white font-bold rounded-2xl shadow-lg shadow-green-900/10 text-sm uppercase tracking-wide hover:bg-studio-green-dark transition-all flex items-center justify-center gap-2 mb-4"
        >
          <Check className="w-5 h-5" />
          Agendar
        </button>
      ) : isStep4Unlocked ? (
        <button
          type="button"
          onClick={handleOpenConfirmationPrompt}
          disabled={!canOpenConfirmation}
          className={`w-full h-14 font-bold rounded-2xl text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 mb-4 ${
            canOpenConfirmation
              ? "bg-studio-green text-white shadow-lg shadow-green-900/10 hover:bg-studio-green-dark"
              : "bg-stone-200 text-stone-500 cursor-not-allowed"
          }`}
        >
          <Check className="w-5 h-5" />
          Ir para confirmação
        </button>
      ) : null}
    </form>
  );
}
