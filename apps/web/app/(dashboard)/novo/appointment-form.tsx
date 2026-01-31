"use client";

import { Calendar, Clock, User, Sparkles, Banknote, Phone, Home, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createAppointment } from "./appointment-actions"; // Ação importada do arquivo renomeado
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

export function AppointmentForm({ services, clients, safeDate }: AppointmentFormProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [displayedPrice, setDisplayedPrice] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(safeDate);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isHomeVisit, setIsHomeVisit] = useState(false);
  const [hasBlocks, setHasBlocks] = useState(false);
  const [blockStatus, setBlockStatus] = useState<"idle" | "loading">("idle");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
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

  const handleSelectClient = (name: string, phone: string | null) => {
    setClientName(name);
    setClientPhone(phone ? formatPhone(phone) : "");
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = e.target.value;
    setSelectedServiceId(serviceId);

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
        setAvailableSlots(slots);
        setSelectedTime(slots[0] ?? "");
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
  }, [isHomeVisit]);

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

  return (
    <form action={createAppointment} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 space-y-5">
      
        {/* Input: Data */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Data do Agendamento</label>
            <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                name="date"
                type="date" 
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                required
                />
            </div>
            {blockStatus === "loading" && (
              <p className="text-[11px] text-gray-400 ml-1">Verificando bloqueios...</p>
            )}
            {blockStatus === "idle" && hasBlocks && (
              <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl">
                Há bloqueios registrados para esta data. Verifique antes de confirmar o horário.
              </div>
            )}
        </div>

        {/* Input: Cliente */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome da Cliente</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              name="clientName"
              type="text" 
              placeholder="Ex: Fernanda Silva" 
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
              required
            />
          </div>
          {filteredClients.length > 0 && (
            <div className="bg-white border border-stone-100 rounded-xl shadow-sm p-2 space-y-1">
              {filteredClients.map((client) => (
                <button
                  type="button"
                  key={client.id}
                  onClick={() => handleSelectClient(client.name, client.phone)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-stone-50 text-sm text-gray-700 flex items-center justify-between"
                >
                  <span className="font-medium">{client.name}</span>
                  {client.phone && <span className="text-xs text-gray-400">{client.phone}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Telefone (opcional)</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              name="clientPhone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={clientPhone}
              onChange={(event) => setClientPhone(formatPhone(event.target.value))}
              inputMode="numeric"
              className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
            />
          </div>
          <p className="text-[11px] text-gray-400 ml-1">DDD obrigatório para vincular ao cliente existente.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {/* Input: Serviço (Select) */}
            <div className="space-y-2 col-span-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Serviço</label>
            <div className="relative">
                <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                  name="serviceId"
                  value={selectedServiceId}
                  onChange={handleServiceChange}
                  className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green appearance-none"
                  required
                >
                  <option value="" disabled>Selecione um serviço</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration_minutes} min)
                    </option>
                  ))}
                </select>
                {/* Seta customizada do select */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Local do Atendimento</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsHomeVisit(false)}
                  className={`flex items-center gap-2 justify-center py-3 rounded-xl border text-sm font-semibold transition ${
                    !isHomeVisit
                      ? "bg-studio-green text-white border-studio-green shadow-md"
                      : "bg-white text-gray-600 border-stone-100 hover:border-studio-green"
                  }`}
                >
                  <MapPin size={16} />
                  Estúdio
                </button>
                <button
                  type="button"
                  onClick={() => setIsHomeVisit(true)}
                  disabled={!canHomeVisit}
                  className={`flex items-center gap-2 justify-center py-3 rounded-xl border text-sm font-semibold transition ${
                    isHomeVisit
                      ? "bg-purple-500 text-white border-purple-500 shadow-md"
                      : "bg-white text-gray-600 border-stone-100 hover:border-purple-400"
                  } ${!canHomeVisit ? "opacity-50 cursor-not-allowed hover:border-stone-100" : ""}`}
                >
                  <Home size={16} />
                  Domicílio
                </button>
              </div>
              <input type="hidden" name="is_home_visit" value={isHomeVisit ? "on" : ""} />
              {!canHomeVisit && selectedServiceId && (
                <p className="text-[11px] text-gray-400 ml-1">Serviço sem opção domiciliar.</p>
              )}
            </div>

            {/* Input: Valor (ReadOnly ou Hidden, mas visível para conferencia) */}
            <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Valor (R$)</label>
            <div className="relative">
                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                type="text" 
                value={displayedPrice}
                readOnly
                placeholder="0.00" 
                className="w-full bg-stone-100 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-500 font-medium cursor-not-allowed focus:outline-none"
                />
                {/* Enviamos o preço original se necessário, mas o backend vai recalcular pelo ID, 
                    porém o form antigo enviava o price. O backend novo vai ignorar esse campo provavelmente e pegar do serviço, 
                    mas se quisermos permitir override, teríamos que deixar editável. 
                    O user não pediu override, pediu "O usuário escolhe o serviço e o horário. O sistema resolve preço e duração sozinho." 
                    Então não precisamos enviar price. */}
            </div>
            </div>

            {/* Input: Horário */}
            <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Horário</label>
            <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                  name="time"
                  value={selectedTime}
                  onChange={(event) => setSelectedTime(event.target.value)}
                  className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green appearance-none"
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
            </div>
            </div>
        </div>

        {isHomeVisit && (
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Endereço do atendimento</label>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
                    className={`w-full bg-stone-50 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 ${
                      cepStatus === "error"
                        ? "border-red-200 focus:ring-red-200 focus:border-red-400"
                        : "border-stone-100 focus:ring-studio-green/20 focus:border-studio-green"
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCepLookup}
                  className="px-4 py-3.5 rounded-xl bg-stone-100 text-gray-600 text-xs font-bold hover:bg-stone-200 transition"
                >
                  {cepStatus === "loading" ? "Buscando..." : "Buscar CEP"}
                </button>
              </div>
              {cepStatus === "error" && <p className="text-[11px] text-red-500 ml-1">CEP inválido.</p>}
              <input
                name="address_logradouro"
                type="text"
                placeholder="Logradouro"
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="address_numero"
                  type="text"
                  placeholder="Número"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                />
                <input
                  name="address_complemento"
                  type="text"
                  placeholder="Complemento"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="address_bairro"
                  type="text"
                  placeholder="Bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                />
                <input
                  name="address_cidade"
                  type="text"
                  placeholder="Cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
                />
              </div>
              <input
                name="address_estado"
                type="text"
                placeholder="Estado (UF)"
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
                maxLength={2}
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green uppercase"
              />
              {mapsQuery && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-studio-green hover:underline"
                >
                  Ver endereço no Maps
                </a>
              )}
            </div>
          </div>
        )}

        {/* Botão Salvar */}
        <button 
          type="submit" 
          className="w-full bg-studio-green text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-100 hover:bg-studio-green-dark transition-all mt-4 flex items-center justify-center gap-2"
        >
          Confirmar Agendamento
        </button>

    </form>
  );
}
