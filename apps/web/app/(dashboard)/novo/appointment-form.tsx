"use client";

import {
  Clock,
  Sparkles,
  Phone,
  MapPin,
  Search,
  ChevronDown,
  Building2,
  Car,
  Tag,
  Check,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createAppointment, getClientAddresses, updateAppointment } from "./appointment-actions"; // Ação importada do arquivo renomeado
import { getAvailableSlots, getDateBlockStatus } from "./availability";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { fetchAddressByCep, normalizeCep } from "../../../src/shared/address/cep";

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  accepts_home_visit?: boolean | null;
  home_visit_fee?: number | null;
  custom_buffer_minutes?: number | null;
  description?: string | null;
}

interface AppointmentFormProps {
  services: Service[];
  clients: { id: string; name: string; phone: string | null }[];
  safeDate: string;
  initialAppointment?: InitialAppointment | null;
  returnTo?: string;
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
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
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
}) {
  const name = params.clientName.trim();
  const greetingName = name ? `, ${name}` : "";
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

  return `Olá${greetingName}! Tudo bem? Aqui é a Flora, assistente virtual do Estúdio 🌸\n\nQue notícia boa! Já reservei o seu horário na agenda da Jana. Seu momento de autocuidado está garantidíssimo.\n\n🗓 Data: ${dateLine} ⏰ Horário: ${timeLabel}${serviceSegment}\n\nDeixei tudo organizado por aqui. Se precisar remarcar ou tiver alguma dúvida, é só me chamar. Até logo! 💚`;
}

export function AppointmentForm({ services, clients, safeDate, initialAppointment, returnTo }: AppointmentFormProps) {
  const isEditing = Boolean(initialAppointment);
  const formRef = useRef<HTMLFormElement | null>(null);
  const sendMessageInputRef = useRef<HTMLInputElement | null>(null);
  const sendMessageTextInputRef = useRef<HTMLInputElement | null>(null);
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
  const [selectedDate, setSelectedDate] = useState<string>(initialAppointment?.date ?? safeDate);
  const [selectedTime, setSelectedTime] = useState<string>(initialAppointment?.time ?? "");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialAppointment?.clientId ?? null);
  const [clientName, setClientName] = useState(initialAppointment?.clientName ?? "");
  const [clientPhone, setClientPhone] = useState(
    initialAppointment?.clientPhone ? formatPhone(initialAppointment.clientPhone) : ""
  );
  const [isHomeVisit, setIsHomeVisit] = useState(initialAppointment?.isHomeVisit ?? false);
  const [hasBlocks, setHasBlocks] = useState(false);
  const [blockStatus, setBlockStatus] = useState<"idle" | "loading">("idle");
  const [clientAddresses, setClientAddresses] = useState<ClientAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    initialAppointment?.clientAddressId ?? null
  );
  const [addressMode, setAddressMode] = useState<"none" | "existing" | "new">(initialAddressMode);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [modalAddressId, setModalAddressId] = useState<string | null>(null);
  const [addressConfirmed, setAddressConfirmed] = useState(
    Boolean(initialAppointment?.clientAddressId || hasInitialManualAddress)
  );
  const [isCepModalOpen, setIsCepModalOpen] = useState(false);
  const [cepDraft, setCepDraft] = useState("");
  const [cepDraftStatus, setCepDraftStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [cepDraftResult, setCepDraftResult] = useState<{
    cep: string;
    logradouro: string;
    bairro: string;
    cidade: string;
    estado: string;
  } | null>(null);
  const [isAddressSearchModalOpen, setIsAddressSearchModalOpen] = useState(false);
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [addressSearchResults, setAddressSearchResults] = useState<AddressSearchResult[]>([]);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [addressLabel, setAddressLabel] = useState("Casa");
  const [cep, setCep] = useState(initialAppointment?.addressCep ?? "");
  const [logradouro, setLogradouro] = useState(initialAppointment?.addressLogradouro ?? "");
  const [numero, setNumero] = useState(initialAppointment?.addressNumero ?? "");
  const [complemento, setComplemento] = useState(initialAppointment?.addressComplemento ?? "");
  const [bairro, setBairro] = useState(initialAppointment?.addressBairro ?? "");
  const [cidade, setCidade] = useState(initialAppointment?.addressCidade ?? "");
  const [estado, setEstado] = useState(initialAppointment?.addressEstado ?? "");
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [internalNotes, setInternalNotes] = useState(initialAppointment?.internalNotes ?? "");
  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [selectedServiceId, services]
  );

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
      setAddressConfirmed(false);
      setCep("");
      setLogradouro("");
      setNumero("");
      setComplemento("");
      setBairro("");
      setCidade("");
      setEstado("");
      setCepStatus("idle");
    }
    previousClientIdRef.current = selectedClientId ?? null;
  }, [selectedClientId]);

  const filteredClients = useMemo(() => {
    if (!clientName.trim()) return [];
    const lower = clientName.toLowerCase();
    return clients
      .filter((client) => client.name.toLowerCase().includes(lower))
      .slice(0, 6);
  }, [clientName, clients]);

  const exactClientMatch = useMemo(() => {
    const trimmed = clientName.trim();
    if (!trimmed) return null;
    return clients.find((client) => client.name.trim().toLowerCase() === trimmed.toLowerCase()) ?? null;
  }, [clientName, clients]);

  useEffect(() => {
    const trimmed = clientName.trim();
    if (!trimmed) {
      setSelectedClientId(null);
      return;
    }
    const match = clients.find((client) => client.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (match && match.id !== selectedClientId) {
      setSelectedClientId(match.id);
      if (!clientPhone && match.phone) {
        setClientPhone(formatPhone(match.phone));
      }
    }
  }, [clientName, clients, selectedClientId, clientPhone]);

  const handleSelectClient = (client: { id: string; name: string; phone: string | null }) => {
    setClientName(client.name);
    setClientPhone(client.phone ? formatPhone(client.phone) : "");
    setSelectedClientId(client.id);
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = e.target.value;
    setSelectedServiceId(serviceId);
    setPriceOverride("");

    const service = services.find((s) => s.id === serviceId);
    if (service) {
      setDisplayedPrice(service.price.toFixed(2));
      if (!service.accepts_home_visit) {
        setIsHomeVisit(false);
      }
    } else {
      setDisplayedPrice("");
      setIsHomeVisit(false);
    }
  };

  useEffect(() => {
    if (!selectedService) return;
    const basePrice = Number(selectedService.price || 0);
    const fee = isHomeVisit ? Number(selectedService.home_visit_fee || 0) : 0;
    setDisplayedPrice((basePrice + fee).toFixed(2));
  }, [selectedService, isHomeVisit]);

  useEffect(() => {
    async function fetchSlots() {
      if (!selectedServiceId || !selectedDate) {
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
        });
        const preferred = selectedTimeRef.current || initialTimeRef.current;
        const normalizedSlots =
          preferred && !slots.includes(preferred) ? [preferred, ...slots] : slots;
        setAvailableSlots(normalizedSlots);
        if (preferred && normalizedSlots.includes(preferred)) {
          setSelectedTime(preferred);
        } else {
          setSelectedTime(normalizedSlots[0] ?? "");
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
  }, [selectedServiceId, selectedDate, isHomeVisit]);

  useEffect(() => {
    async function fetchBlockStatus() {
      if (!selectedDate) {
        setHasBlocks(false);
        return;
      }
      setBlockStatus("loading");
      try {
        const result = await getDateBlockStatus({ tenantId: FIXED_TENANT_ID, date: selectedDate });
        setHasBlocks(result.hasBlocks);
      } catch {
        setHasBlocks(false);
      } finally {
        setBlockStatus("idle");
      }
    }

    fetchBlockStatus();
  }, [selectedDate]);

  useEffect(() => {
    if (isHomeVisit) return;
    setIsCepModalOpen(false);
    setCepDraft("");
    setCepDraftStatus("idle");
    setCepDraftResult(null);
    setIsAddressSearchModalOpen(false);
    setAddressSearchQuery("");
    setAddressSearchResults([]);
    setAddressSearchLoading(false);
    setAddressSearchError(null);
  }, [isHomeVisit]);

  useEffect(() => {
    let active = true;
    if (!selectedClientId) {
      setClientAddresses([]);
      setSelectedAddressId(null);
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
          setCepStatus("success");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedClientId, addressMode, selectedAddressId]);

  useEffect(() => {
    if (!isHomeVisit) return;
    if (addressMode === "new") return;
    if (clientAddresses.length > 0) {
      setAddressMode("existing");
      setAddressConfirmed(true);
      return;
    }
    setAddressMode("new");
    setAddressConfirmed(false);
  }, [isHomeVisit, clientAddresses, addressMode, addressConfirmed]);

  useEffect(() => {
    if (!isAddressModalOpen) return;
    const fallback = clientAddresses.find((address) => address.is_primary)?.id ?? clientAddresses[0]?.id ?? null;
    setModalAddressId(selectedAddressId ?? fallback);
  }, [isAddressModalOpen, clientAddresses, selectedAddressId]);

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
  }, [addressSearchQuery, isAddressSearchModalOpen]);

  const handleCepDraftLookup = async () => {
    const normalized = normalizeCep(cepDraft);
    if (normalized.length !== 8) {
      setCepDraftStatus("error");
      return;
    }
    setCepDraftStatus("loading");
    const result = await fetchAddressByCep(normalized);
    if (!result) {
      setCepDraftStatus("error");
      return;
    }
    setCepDraftResult({
      cep: formatCep(normalized),
      logradouro: result.logradouro,
      bairro: result.bairro,
      cidade: result.cidade,
      estado: result.estado,
    });
    setCepDraftStatus("success");
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
  const resolvedClientId = selectedClientId ?? exactClientMatch?.id ?? null;
  const resolvedClientPhone =
    clientPhone || (exactClientMatch?.phone ? formatPhone(exactClientMatch.phone) : "");
  const canHomeVisit = selectedService?.accepts_home_visit ?? false;
  const selectedAddress = useMemo(
    () => clientAddresses.find((address) => address.id === selectedAddressId) ?? null,
    [clientAddresses, selectedAddressId]
  );
  const finalPrice = priceOverride ? priceOverride : displayedPrice;
  const formAction = isEditing ? updateAppointment : createAppointment;
  const applyAddressFields = (payload: {
    cep?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
    mode?: "existing" | "new";
  }) => {
    setCep(payload.cep ?? "");
    setLogradouro(payload.logradouro ?? "");
    setNumero(payload.numero ?? "");
    setComplemento(payload.complemento ?? "");
    setBairro(payload.bairro ?? "");
    setCidade(payload.cidade ?? "");
    setEstado(payload.estado ?? "");
    setCepStatus(payload.cep ? "success" : "idle");
    if (payload.mode === "new") {
      setAddressMode("new");
      setSelectedAddressId(null);
    }
    setAddressConfirmed(true);
  };

  const openWhatsappFromForm = (message: string) => {
    const phone = resolvedClientPhone || clientPhone;
    const digits = phone.replace(/\D/g, "");
    if (!digits) {
      window.alert("Sem telefone de WhatsApp cadastrado.");
      return false;
    }
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    const url = `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    return true;
  };

  const handleSchedule = (shouldSendMessage: boolean) => {
    if (!formRef.current) return;
    let shouldRecord = shouldSendMessage;
    let messageText = "";
    if (shouldSendMessage) {
      messageText = buildCreatedMessage({
        clientName,
        date: selectedDate,
        time: selectedTime,
        serviceName: selectedService?.name ?? "",
      });
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

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {isEditing && <input type="hidden" name="appointmentId" value={initialAppointment?.id ?? ""} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <input type="hidden" name="clientId" value={resolvedClientId ?? ""} />
      <input type="hidden" name="client_address_id" value={isHomeVisit ? (selectedAddressId ?? "") : ""} />
      <input type="hidden" name="address_label" value={isHomeVisit ? addressLabel : ""} />
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
            <label className={labelClass}>Nome completo</label>
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                name="clientName"
                type="text"
                placeholder="Buscar ou digitar nome..."
                value={clientName}
                onChange={(event) => {
                  setClientName(event.target.value);
                  setSelectedClientId(null);
                }}
                className={inputWithIconClass}
                required
              />
            </div>
            <p className="text-[11px] text-muted mt-2 ml-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Se já existir, vinculamos automaticamente.
            </p>
            {filteredClients.length > 0 && (
              <div className="mt-3 bg-white border border-stone-100 rounded-2xl shadow-sm p-2 space-y-1">
                {filteredClients.map((client) => (
                  <button
                    type="button"
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-stone-50 text-sm text-gray-700 flex items-center justify-between"
                  >
                    <span className="font-medium">{client.name}</span>
                    {client.phone && <span className="text-xs text-muted">{client.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>WhatsApp (opcional)</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                name="clientPhone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={resolvedClientPhone}
                onChange={(event) => setClientPhone(formatPhone(event.target.value))}
                inputMode="numeric"
                className={inputWithIconClass}
              />
            </div>
            <p className="text-[11px] text-muted mt-2 ml-1">Ajuda a localizar cadastros antigos 💚</p>
          </div>
        </div>
      </section>

      <section className={sectionCardClass}>
        <div className="flex items-center gap-2 mb-4">
          <div className={sectionNumberClass}>2</div>
          <h2 className={sectionHeaderTextClass}>O que e onde?</h2>
        </div>

        <div className="mb-6">
          <label className={labelClass}>Procedimento</label>
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

          {selectedService && (
            <div className="mt-3 p-3 bg-studio-green/10 rounded-2xl flex items-center justify-between border border-studio-green/10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-studio-green shadow-soft">
                  <Clock className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-muted">{selectedService.duration_minutes} min</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-studio-green shadow-soft">
                  <Tag className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-muted">R$ {displayedPrice || "0,00"}</span>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Local</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsHomeVisit(false)}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold uppercase transition-all border ${
                !isHomeVisit
                  ? "border-studio-green bg-green-50 text-studio-green"
                  : "border-stone-100 bg-stone-50 text-gray-400"
              }`}
            >
              <Building2 className="w-5 h-5" />
              No Estúdio
            </button>

            <button
              type="button"
              onClick={() => setIsHomeVisit(true)}
              disabled={!canHomeVisit}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold uppercase transition-all border ${
                isHomeVisit
                  ? "border-purple-500 bg-purple-50 text-purple-600"
                  : "border-stone-100 bg-stone-50 text-gray-400"
              } ${!canHomeVisit ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Car className="w-5 h-5" />
              Em Domicílio
            </button>
          </div>
          <input type="hidden" name="is_home_visit" value={isHomeVisit ? "on" : ""} />
          {!canHomeVisit && selectedServiceId && (
            <p className="text-[11px] text-muted ml-1 mt-2">Serviço sem opção domiciliar.</p>
          )}

          <div
            className={`transition-all duration-300 overflow-hidden ${
              isHomeVisit ? "max-h-200 opacity-100 mt-6" : "max-h-0 opacity-0 mt-0"
            }`}
          >
            <div className="space-y-4">
              {clientAddresses.length > 0 && addressMode === "existing" && selectedAddress && (
                <div className="bg-purple-50 rounded-2xl border border-purple-100 p-4">
                  <div className="flex items-center gap-2 mb-2 text-purple-700">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-extrabold uppercase tracking-wide">
                      {selectedAddress.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-studio-text">
                    {formatClientAddress(selectedAddress) || "Endereço cadastrado"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddressModalOpen(true)}
                      className="px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide bg-white border border-purple-100 text-purple-700 hover:bg-purple-100 transition"
                    >
                      Trocar endereço
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddressMode("new");
                        setSelectedAddressId(null);
                        setAddressConfirmed(false);
                        setCep("");
                        setLogradouro("");
                        setNumero("");
                        setComplemento("");
                        setBairro("");
                        setCidade("");
                        setEstado("");
                        setCepStatus("idle");
                      }}
                      className="px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide bg-white border border-purple-100 text-purple-700 hover:bg-purple-100 transition"
                    >
                      Cadastrar novo
                    </button>
                  </div>
                </div>
              )}

              {addressMode === "new" && !addressConfirmed && (
                <div className="bg-purple-50 rounded-2xl border border-purple-100 p-4">
                  <div className="flex items-center gap-2 mb-2 text-purple-700">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-extrabold uppercase tracking-wide">Novo endereço</span>
                  </div>
                  <p className="text-xs text-purple-600 mb-4">
                    Escolha como deseja localizar o endereço do cliente.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCepModalOpen(true);
                        setCepDraft("");
                        setCepDraftStatus("idle");
                        setCepDraftResult(null);
                      }}
                      className="rounded-2xl border border-purple-200 bg-white px-4 py-1 text-left hover:border-purple-300 hover:bg-purple-100/60 transition"
                    >
                      <span className="text-[11px] font-extrabold uppercase text-purple-700">Buscar por CEP</span>
                      <span className="block text-[10px] text-purple-500 mt-0.5">Rápido e direto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddressSearchModalOpen(true);
                        setAddressSearchQuery("");
                        setAddressSearchResults([]);
                        setAddressSearchLoading(false);
                        setAddressSearchError(null);
                      }}
                      className="rounded-2xl border border-purple-200 bg-white px-4 py-1 text-left hover:border-purple-300 hover:bg-purple-100/60 transition"
                    >
                      <span className="text-[11px] font-extrabold uppercase text-purple-700">
                        Buscar endereço
                      </span>
                      <span className="block text-[10px] text-purple-500 mt-0.5">Digite rua, bairro, número</span>
                    </button>
                  </div>
                  {clientAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAddressMode("existing")}
                      className="mt-4 text-[11px] font-extrabold uppercase tracking-wide text-purple-700 hover:text-purple-800"
                    >
                      Usar endereço cadastrado
                    </button>
                  )}
                </div>
              )}

              {addressMode === "new" && addressConfirmed && (
                <div className="bg-purple-50 rounded-2xl border border-purple-100 p-4">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2 text-purple-700">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs font-extrabold uppercase tracking-wide">Novo endereço</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAddressConfirmed(false);
                        setCepDraft("");
                        setCepDraftStatus("idle");
                        setCepDraftResult(null);
                      }}
                      className="text-[10px] font-extrabold uppercase tracking-wide text-purple-700"
                    >
                      Refazer busca
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCepModalOpen(true);
                        setCepDraft(cep);
                        setCepDraftStatus("idle");
                        setCepDraftResult(null);
                      }}
                      className="px-3 py-2 rounded-xl border border-purple-200 bg-white text-[10px] font-extrabold uppercase text-purple-700 hover:bg-purple-100"
                    >
                      Buscar por CEP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddressSearchModalOpen(true);
                        setAddressSearchQuery("");
                        setAddressSearchResults([]);
                        setAddressSearchLoading(false);
                        setAddressSearchError(null);
                      }}
                      className="px-3 py-2 rounded-xl border border-purple-200 bg-white text-[10px] font-extrabold uppercase text-purple-700 hover:bg-purple-100"
                    >
                      Buscar endereço
                    </button>
                  </div>

                  <div className="mb-3">
                    <label className={labelClass}>Identificação</label>
                    <input
                      type="text"
                      value={addressLabel}
                      onChange={(event) => setAddressLabel(event.target.value)}
                      disabled={!isHomeVisit}
                      className={inputClass}
                    />
                  </div>

                  <div className="mb-3">
                    <label className={labelClass}>CEP</label>
                    <input
                      name="address_cep"
                      type="text"
                      value={cep}
                      onChange={(e) => {
                        setCep(formatCep(e.target.value));
                        setCepStatus("idle");
                      }}
                      inputMode="numeric"
                      aria-invalid={cepStatus === "error" ? "true" : "false"}
                      disabled={!isHomeVisit}
                      className={`w-full px-4 py-3 rounded-xl bg-stone-50 border text-sm font-medium focus:outline-none focus:ring-1 ${
                        cepStatus === "error"
                          ? "border-red-200 focus:ring-red-200 focus:border-red-400"
                          : "border-stone-100 focus:ring-studio-green focus:border-studio-green"
                      }`}
                    />
                  </div>

                  <div className="mb-3">
                    <label className={labelClass}>Rua / Avenida</label>
                    <input
                      name="address_logradouro"
                      type="text"
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      disabled={!isHomeVisit}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <label className={labelClass}>Número</label>
                      <input
                        name="address_numero"
                        type="text"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        disabled={!isHomeVisit}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Complemento</label>
                      <input
                        name="address_complemento"
                        type="text"
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        disabled={!isHomeVisit}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className={labelClass}>Bairro</label>
                      <input
                        name="address_bairro"
                        type="text"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        disabled={!isHomeVisit}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Cidade</label>
                      <input
                        name="address_cidade"
                        type="text"
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        disabled={!isHomeVisit}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Estado (UF)</label>
                    <input
                      name="address_estado"
                      type="text"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value.toUpperCase())}
                      maxLength={2}
                      disabled={!isHomeVisit}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                  {mapsQuery && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-purple-700 hover:underline mt-3 inline-flex"
                    >
                      Ver endereço no Maps
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={sectionCardClass}>
        <div className="flex items-center gap-2 mb-4">
          <div className={sectionNumberClass}>3</div>
          <h2 className={sectionHeaderTextClass}>Finalização</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
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
            <p className="text-[10px] text-muted mt-1 ml-1">
              {priceOverride ? "Valor ajustado manualmente." : "Valor calculado automaticamente."}
            </p>
          </div>

          <div>
            <label className={labelClass}>Data</label>
            <input
              name="date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className={inputClass}
              required
            />
            {blockStatus === "loading" && (
              <p className="text-[11px] text-muted mt-2 ml-1">Verificando bloqueios...</p>
            )}
            {blockStatus === "idle" && hasBlocks && (
              <div className="text-[11px] text-warn bg-warn/10 border border-warn/20 px-3 py-2 rounded-xl mt-2">
                Há bloqueios registrados para esta data. Verifique antes de confirmar o horário.
              </div>
            )}
          </div>
        </div>

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

        <div>
          <label className={labelClass}>Horário</label>
          <div className="grid grid-cols-4 gap-2">
            {!selectedServiceId || !selectedDate ? (
              <div className="col-span-4 text-xs text-muted">Selecione data e serviço para ver horários.</div>
            ) : isLoadingSlots ? (
              <div className="col-span-4 text-xs text-muted">Carregando horários...</div>
            ) : availableSlots.length === 0 ? (
              <div className="col-span-4 text-xs text-muted">Sem horários disponíveis.</div>
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

        <div className="mt-5 pt-4 border-t border-stone-100">
          <label className={labelClass}>
            Observações internas do agendamento
          </label>
          <textarea
            name="internalNotes"
            rows={2}
            value={internalNotes}
            onChange={(event) => setInternalNotes(event.target.value)}
            className={`${inputClass} resize-none`}
            placeholder="Ex: Cliente prefere pressão leve..."
          />
          <p className="text-[10px] text-muted mt-1 ml-1">Aparece no atendimento.</p>
        </div>
      </section>

      {portalTarget &&
        isAddressModalOpen &&
        createPortal(
          <div className="absolute inset-0 z-50 bg-black/40 flex items-end justify-center px-5 pb-10">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-float border border-line p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-extrabold text-muted uppercase tracking-widest">Endereço</p>
                <h3 className="text-lg font-serif text-studio-text">Usar endereço</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {clientAddresses.map((address) => {
                const isSelected = modalAddressId === address.id;
                return (
                  <button
                    key={address.id}
                    type="button"
                    onClick={() => setModalAddressId(address.id)}
                    className={`w-full text-left px-4 py-3 rounded-2xl border transition ${
                      isSelected ? "border-studio-green bg-studio-light" : "border-line bg-white"
                    }`}
                  >
                    <p className="text-[11px] font-extrabold text-muted uppercase tracking-widest">
                      {address.label}
                    </p>
                    <p className="text-sm font-semibold text-studio-text">
                      {formatClientAddress(address) || "Endereço cadastrado"}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedAddressId(modalAddressId);
                  setAddressMode("existing");
                  setAddressConfirmed(true);
                  setIsAddressModalOpen(false);
                }}
                className="w-full py-3 rounded-2xl bg-studio-green text-white font-extrabold"
              >
                Usar endereço selecionado
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddressMode("new");
                  setSelectedAddressId(null);
                  setAddressConfirmed(false);
                  setCep("");
                  setLogradouro("");
                  setNumero("");
                  setComplemento("");
                  setBairro("");
                  setCidade("");
                  setEstado("");
                  setCepStatus("idle");
                  setIsAddressModalOpen(false);
                }}
                className="w-full py-3 rounded-2xl bg-white border border-line text-studio-text font-extrabold"
              >
                Cadastrar novo endereço
              </button>
            </div>
            </div>
          </div>,
          portalTarget
        )}

      {portalTarget &&
        isCepModalOpen &&
        createPortal(
          <div className="absolute inset-0 z-50 bg-black/40 flex items-end justify-center px-5 pb-10">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-float border border-line p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] font-extrabold text-muted uppercase tracking-widest">Buscar por CEP</p>
                <h3 className="text-lg font-serif text-studio-text">Digite o CEP</h3>
                <p className="text-xs text-muted mt-1">Preenchemos o endereço automaticamente.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCepModalOpen(false);
                  setCepDraft("");
                  setCepDraftStatus("idle");
                  setCepDraftResult(null);
                }}
                className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <label className={labelClass}>CEP</label>
              <input
                type="text"
                inputMode="numeric"
                value={cepDraft}
                onChange={(event) => {
                  setCepDraft(formatCep(event.target.value));
                  setCepDraftStatus("idle");
                  setCepDraftResult(null);
                }}
                className={inputClass}
              />
              {cepDraftStatus === "error" && (
                <p className="text-[11px] text-red-500 mt-2 ml-1">CEP inválido. Verifique e tente novamente.</p>
              )}
            </div>

            {cepDraftStatus === "success" && cepDraftResult && (
              <div className="mb-4 rounded-2xl border border-stone-100 bg-stone-50 p-3">
                <p className="text-[11px] font-extrabold text-muted uppercase tracking-widest mb-1">Prévia</p>
                <p className="text-sm font-semibold text-studio-text">
                  {[
                    cepDraftResult.logradouro,
                    cepDraftResult.bairro,
                    cepDraftResult.cidade,
                    cepDraftResult.estado,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Endereço não encontrado"}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCepDraftLookup}
                disabled={cepDraftStatus === "loading"}
                className="w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-900/10 disabled:opacity-70"
              >
                {cepDraftStatus === "loading" ? "Buscando..." : "Buscar CEP"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!cepDraftResult) return;
                  applyAddressFields({
                    cep: cepDraftResult.cep,
                    logradouro: cepDraftResult.logradouro,
                    bairro: cepDraftResult.bairro,
                    cidade: cepDraftResult.cidade,
                    estado: cepDraftResult.estado,
                    mode: "new",
                  });
                  setIsCepModalOpen(false);
                }}
                disabled={!cepDraftResult}
                className="w-full h-12 rounded-2xl bg-white border border-line text-studio-text font-extrabold text-xs uppercase tracking-wide disabled:opacity-70"
              >
                Confirmar endereço
              </button>
            </div>
            </div>
          </div>,
          portalTarget
        )}

      {portalTarget &&
        isAddressSearchModalOpen &&
        createPortal(
          <div className="absolute inset-0 z-50 bg-black/40 flex items-end justify-center px-5 pb-10">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-float border border-line p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] font-extrabold text-muted uppercase tracking-widest">Buscar endereço</p>
                <h3 className="text-lg font-serif text-studio-text">Digite o endereço</h3>
                <p className="text-xs text-muted mt-1">Resultados aparecem enquanto você digita.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddressSearchModalOpen(false);
                  setAddressSearchQuery("");
                  setAddressSearchResults([]);
                  setAddressSearchLoading(false);
                  setAddressSearchError(null);
                }}
                className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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
              {addressSearchLoading && (
                <p className="text-[11px] text-muted">Buscando endereços...</p>
              )}
              {!addressSearchLoading && addressSearchQuery.trim().length < 3 && (
                <p className="text-[11px] text-muted">Digite pelo menos 3 caracteres para iniciar.</p>
              )}
              {!addressSearchLoading && addressSearchQuery.trim().length >= 3 && addressSearchResults.length === 0 && (
                <p className="text-[11px] text-muted">Nenhum endereço encontrado.</p>
              )}
              {addressSearchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={async () => {
                    setAddressSearchLoading(true);
                    setAddressSearchError(null);
                    try {
                      const response = await fetch(
                        `/api/address-details?placeId=${encodeURIComponent(result.placeId)}`
                      );
                      if (!response.ok) throw new Error("Falha ao buscar endereço");
                      const data = (await response.json()) as {
                        cep?: string;
                        logradouro?: string;
                        numero?: string;
                        bairro?: string;
                        cidade?: string;
                        estado?: string;
                      };
                      applyAddressFields({
                        cep: data.cep ? formatCep(data.cep) : "",
                        logradouro: data.logradouro ?? result.label,
                        numero: data.numero ?? "",
                        bairro: data.bairro ?? "",
                        cidade: data.cidade ?? "",
                        estado: data.estado ?? "",
                        mode: "new",
                      });
                      setIsAddressSearchModalOpen(false);
                      setAddressSearchQuery("");
                      setAddressSearchResults([]);
                    } catch (error) {
                      console.error(error);
                      setAddressSearchError("Não foi possível carregar o endereço. Tente novamente.");
                    } finally {
                      setAddressSearchLoading(false);
                    }
                  }}
                  className="w-full text-left px-4 py-3 rounded-2xl border border-stone-100 hover:border-stone-200 hover:bg-stone-50 transition"
                >
                  <p className="text-sm font-semibold text-studio-text">{result.label}</p>
                </button>
              ))}
            </div>
            </div>
          </div>,
          portalTarget
        )}

      {portalTarget &&
        isSendPromptOpen &&
        createPortal(
          <div className="absolute inset-0 z-50 bg-black/40 flex items-end justify-center px-5 pb-10">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-float border border-line p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] font-extrabold text-muted uppercase tracking-widest">
                  Aviso de agendamento
                </p>
                <h3 className="text-lg font-serif text-studio-text">Enviar mensagem agora?</h3>
                <p className="text-xs text-muted mt-1">
                  Se escolher sim, abriremos o WhatsApp com a mensagem pronta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSendPromptOpen(false)}
                className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleSchedule(true)}
                className="w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-900/10"
              >
                Enviar e agendar
              </button>
              <button
                type="button"
                onClick={() => handleSchedule(false)}
                className="w-full h-12 rounded-2xl bg-white border border-line text-studio-text font-extrabold text-xs uppercase tracking-wide"
              >
                Agendar sem enviar
              </button>
            </div>
            </div>
          </div>,
          portalTarget
        )}

      {isEditing ? (
        <button
          type="submit"
          className="w-full h-14 bg-studio-green text-white font-bold rounded-2xl shadow-lg shadow-green-900/10 text-sm uppercase tracking-wide hover:bg-studio-green-dark transition-all flex items-center justify-center gap-2 mb-4"
        >
          <Check className="w-5 h-5" />
          Agendar
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsSendPromptOpen(true)}
          className="w-full h-14 bg-studio-green text-white font-bold rounded-2xl shadow-lg shadow-green-900/10 text-sm uppercase tracking-wide hover:bg-studio-green-dark transition-all flex items-center justify-center gap-2 mb-4"
        >
          <Check className="w-5 h-5" />
          Agendar
        </button>
      )}
    </form>
  );
}
