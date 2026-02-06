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
import { useEffect, useMemo, useRef, useState } from "react";
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

export function AppointmentForm({ services, clients, safeDate, initialAppointment, returnTo }: AppointmentFormProps) {
  const isEditing = Boolean(initialAppointment);
  const initialTimeRef = useRef(initialAppointment?.time ?? "");
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

  const filteredClients = useMemo(() => {
    if (!clientName.trim()) return [];
    const lower = clientName.toLowerCase();
    return clients
      .filter((client) => client.name.toLowerCase().includes(lower))
      .slice(0, 6);
  }, [clientName, clients]);

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
        const preferred = selectedTime || initialTimeRef.current;
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
    setCep("");
    setLogradouro("");
    setNumero("");
    setComplemento("");
    setBairro("");
    setCidade("");
    setEstado("");
    setCepStatus("idle");
    setAddressMode("none");
    setSelectedAddressId(null);
    setAddressConfirmed(false);
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
      if (primary && !hasSelected) {
        setSelectedAddressId(primary.id);
        if (addressMode !== "new") {
          setAddressMode("existing");
        }
      } else if (!primary && !hasSelected) {
        setSelectedAddressId(null);
      }
      setAddressConfirmed(hasSelected || addressMode === "new");
    })();

    return () => {
      active = false;
    };
  }, [selectedClientId, addressMode, selectedAddressId]);

  useEffect(() => {
    if (!isHomeVisit) return;
    if (addressMode === "new") return;
    if (clientAddresses.length > 0 && !addressConfirmed) {
      setIsAddressModalOpen(true);
    } else {
      if (clientAddresses.length === 0) {
        setAddressMode("new");
      }
    }
  }, [isHomeVisit, clientAddresses, addressMode, addressConfirmed]);

  useEffect(() => {
    if (!isAddressModalOpen) return;
    const fallback = clientAddresses.find((address) => address.is_primary)?.id ?? clientAddresses[0]?.id ?? null;
    setModalAddressId(selectedAddressId ?? fallback);
  }, [isAddressModalOpen, clientAddresses, selectedAddressId]);

  useEffect(() => {
    if (addressMode !== "existing") return;
    setCep("");
    setLogradouro("");
    setNumero("");
    setComplemento("");
    setBairro("");
    setCidade("");
    setEstado("");
    setCepStatus("idle");
  }, [addressMode]);

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

  const mapsQuery = buildAddressQuery({
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
  });
  const canHomeVisit = selectedService?.accepts_home_visit ?? false;
  const selectedAddress = useMemo(
    () => clientAddresses.find((address) => address.id === selectedAddressId) ?? null,
    [clientAddresses, selectedAddressId]
  );
  const finalPrice = priceOverride ? priceOverride : displayedPrice;
  const formAction = isEditing ? updateAppointment : createAppointment;

  return (
    <form action={formAction} className="space-y-6">
      {isEditing && <input type="hidden" name="appointmentId" value={initialAppointment?.id ?? ""} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <input type="hidden" name="clientId" value={selectedClientId ?? ""} />
      <input type="hidden" name="client_address_id" value={selectedAddressId ?? ""} />
      <input type="hidden" name="address_label" value={addressLabel} />
      <section className="bg-white rounded-3xl shadow-soft p-5 border border-white">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-studio-green text-white flex items-center justify-center text-xs font-bold">
            1
          </div>
          <h2 className="text-xs font-extrabold text-muted uppercase tracking-widest">Cliente</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-studio-green mb-1.5 uppercase">Nome Completo</label>
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
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-studio-bg border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm font-medium text-studio-text transition-all"
                required
              />
            </div>
            <p className="text-[11px] text-muted mt-2 ml-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Se já existir, vinculamos automaticamente.
            </p>
            {filteredClients.length > 0 && (
              <div className="mt-3 bg-white border border-line rounded-2xl shadow-soft p-2 space-y-1">
                {filteredClients.map((client) => (
                  <button
                    type="button"
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-studio-light text-sm text-studio-text flex items-center justify-between"
                  >
                    <span className="font-medium">{client.name}</span>
                    {client.phone && <span className="text-xs text-muted">{client.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-extrabold text-muted mb-1.5 uppercase">WhatsApp (Opcional)</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                name="clientPhone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={clientPhone}
                onChange={(event) => setClientPhone(formatPhone(event.target.value))}
                inputMode="numeric"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-studio-bg border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm transition-all"
              />
            </div>
            <p className="text-[11px] text-muted mt-2 ml-1">Ajuda a localizar cadastros antigos 💚</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-3xl shadow-soft p-5 border border-white">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-studio-green text-white flex items-center justify-center text-xs font-bold">
            2
          </div>
          <h2 className="text-xs font-extrabold text-muted uppercase tracking-widest">O que e Onde?</h2>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-extrabold text-studio-green mb-1.5 uppercase">Procedimento</label>
          <div className="relative">
            <select
              name="serviceId"
              value={selectedServiceId}
              onChange={handleServiceChange}
              className="w-full pl-4 pr-10 py-3 rounded-2xl bg-studio-bg border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm font-medium text-studio-text appearance-none transition-all"
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
          <label className="block text-xs font-extrabold text-studio-green mb-2 uppercase">Local</label>
          <div className="bg-studio-bg p-1 rounded-2xl border border-line grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsHomeVisit(false)}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold uppercase transition-all border-2 ${
                !isHomeVisit
                  ? "bg-white border-studio-green text-studio-green shadow-soft"
                  : "bg-studio-light text-muted border-transparent"
              }`}
            >
              <Building2 className="w-5 h-5" />
              No Estúdio
            </button>

            <button
              type="button"
              onClick={() => setIsHomeVisit(true)}
              disabled={!canHomeVisit}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold uppercase transition-all border-2 ${
                isHomeVisit
                  ? "bg-white border-purple-500 text-purple-600 shadow-soft"
                  : "bg-studio-light text-muted border-transparent"
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
              isHomeVisit ? "max-h-[800px] opacity-100 mt-6" : "max-h-0 opacity-0 mt-0"
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
                        setAddressConfirmed(true);
                      }}
                      className="px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide bg-white border border-purple-100 text-purple-700 hover:bg-purple-100 transition"
                    >
                      Cadastrar novo
                    </button>
                  </div>
                </div>
              )}

              {addressMode === "new" && (
                <div className="bg-purple-50 rounded-2xl border border-purple-100 p-4">
                  <div className="flex items-center gap-2 mb-3 text-purple-700">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-extrabold uppercase tracking-wide">Novo endereço</span>
                  </div>

                  <div className="mb-3">
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-purple-500 mb-2">
                      Identificação
                    </label>
                    <input
                      name="address_label"
                      type="text"
                      placeholder="Casa, Trabalho, etc."
                      value={addressLabel}
                      onChange={(event) => setAddressLabel(event.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-300/40 text-sm font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="col-span-2">
                      <input
                        name="address_cep"
                        type="text"
                        placeholder="CEP"
                        value={cep}
                        onChange={(e) => {
                          setCep(formatCep(e.target.value));
                          setCepStatus("idle");
                        }}
                        inputMode="numeric"
                        aria-invalid={cepStatus === "error" ? "true" : "false"}
                        className={`w-full px-4 py-3 rounded-xl bg-white border text-sm font-medium focus:outline-none focus:ring-2 ${
                          cepStatus === "error"
                            ? "border-red-200 focus:ring-red-200 focus:border-red-400"
                            : "border-purple-200 focus:ring-purple-300/40 focus:border-purple-400"
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCepLookup}
                      className="bg-purple-200 text-purple-800 rounded-xl font-bold text-xs hover:bg-purple-300 transition"
                    >
                      {cepStatus === "loading" ? "Buscando..." : "Buscar"}
                    </button>
                  </div>
                  <p className="text-[10px] text-purple-400/80 mb-3 ml-1">Preenchemos o restante automaticamente 😉</p>

                  <input
                    name="address_logradouro"
                    type="text"
                    placeholder="Rua / Avenida"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-300/40 text-sm font-medium mb-2"
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      name="address_numero"
                      type="text"
                      placeholder="Nº"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-300/40 text-sm font-medium"
                    />
                    <input
                      name="address_complemento"
                      type="text"
                      placeholder="Complemento"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      className="col-span-2 w-full px-4 py-3 rounded-xl bg-white border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-300/40 text-sm font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      name="address_bairro"
                      type="text"
                      placeholder="Bairro"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-300/40 text-sm font-medium"
                    />
                    <input
                      name="address_cidade"
                      type="text"
                      placeholder="Cidade"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-300/40 text-sm font-medium"
                    />
                  </div>

                  <input
                    name="address_estado"
                    type="text"
                    placeholder="Estado (UF)"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value.toUpperCase())}
                    maxLength={2}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-300/40 text-sm font-medium uppercase mt-2"
                  />
                  {mapsQuery && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-purple-700 hover:underline mt-2 inline-flex"
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

      <section className="bg-white rounded-3xl shadow-soft p-5 border border-white">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-studio-green text-white flex items-center justify-center text-xs font-bold">
            3
          </div>
          <h2 className="text-xs font-extrabold text-muted uppercase tracking-widest">Finalização</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-extrabold text-studio-green mb-1.5 uppercase">Valor Final</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-serif text-sm">R$</span>
              <input
                type="tel"
                value={finalPrice}
                readOnly
                placeholder="0,00"
                className="w-full pl-9 pr-3 py-3 rounded-2xl bg-studio-bg border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-lg font-bold text-studio-text"
              />
            </div>
            <p className="text-[10px] text-muted mt-1 ml-1">
              {priceOverride ? "Valor ajustado manualmente." : "Valor calculado automaticamente."}
            </p>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-studio-green mb-1.5 uppercase">Data</label>
            <input
              name="date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full px-3 py-3 rounded-2xl bg-studio-bg border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm font-medium text-studio-text"
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
          <label className="block text-xs font-extrabold text-muted mb-1.5 uppercase">Ajustar valor (opcional)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-serif text-sm">R$</span>
            <input
              name="price_override"
              type="text"
              inputMode="decimal"
              value={priceOverride}
              onChange={(event) => setPriceOverride(event.target.value)}
              placeholder={displayedPrice || "0,00"}
              className="w-full pl-9 pr-3 py-3 rounded-2xl bg-white border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm font-semibold text-studio-text"
            />
          </div>
          <p className="text-[10px] text-muted mt-1 ml-1">Se deixar vazio, usamos o valor do serviço.</p>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-studio-green mb-2 uppercase">Horário</label>
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
                      ? "bg-studio-green text-white shadow-soft transform scale-105"
                      : "border border-line text-muted hover:border-studio-green hover:text-studio-green"
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

        <div className="mt-5 pt-4 border-t border-line">
          <label className="block text-xs font-extrabold text-muted mb-1.5 uppercase">
            Observações internas do agendamento
          </label>
          <textarea
            name="internalNotes"
            rows={2}
            value={internalNotes}
            onChange={(event) => setInternalNotes(event.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-studio-bg border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 text-sm"
            placeholder="Ex: Cliente prefere pressão leve..."
          />
          <p className="text-[10px] text-muted mt-1 ml-1">Aparece no atendimento.</p>
        </div>
      </section>

      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center px-5 pb-10">
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
                  setAddressConfirmed(true);
                  setIsAddressModalOpen(false);
                }}
                className="w-full py-3 rounded-2xl bg-white border border-line text-studio-text font-extrabold"
              >
                Cadastrar novo endereço
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="w-full py-4 rounded-2xl bg-studio-green text-white font-extrabold shadow-soft hover:bg-studio-green-dark transition flex items-center justify-center gap-2 group mb-4"
      >
        <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
        Agendar
      </button>
    </form>
  );
}
