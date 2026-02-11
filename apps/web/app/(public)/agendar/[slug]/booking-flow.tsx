"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { addDays, format, isSameDay, parseISO } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Flower2,
  Home,
  MapPin,
  Phone,
  Sparkles,
  ArrowLeft,
  User,
  Wallet,
} from "lucide-react";
import { createPixPayment, lookupClientByPhone, submitPublicAppointment } from "./public-actions";
import { getAvailableSlots } from "./availability";
import { fetchAddressByCep, normalizeCep } from "../../../../src/shared/address/cep";

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  accepts_home_visit: boolean;
  home_visit_fee: number;
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
}

type Step = "WELCOME" | "SELECT" | "REVIEW" | "PAYMENT" | "SUCCESS";

const floraMessages: Record<Step, string> = {
  WELCOME: "Olá! Que alegria te ver por aqui. 🌿 Para começar, qual seu WhatsApp?",
  SELECT: "O que seu corpo e mente precisam hoje?",
  REVIEW: "Deixa eu ver se entendi direitinho...",
  PAYMENT: "Para garantir seu horário, precisamos apenas do sinal. O restante você acerta no estúdio 💚",
  SUCCESS: "Agendamento recebido! Vou deixar tudo prontinho por aqui.",
};

export function BookingFlow({ tenant, services, signalPercentage }: BookingFlowProps) {
  const [step, setStep] = useState<Step>("WELCOME");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isHomeVisit, setIsHomeVisit] = useState(false);
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
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
    let price = Number(selectedService.price);
    if (isHomeVisit) {
      price += Number(selectedService.home_visit_fee || 0);
    }
    return price;
  }, [isHomeVisit, selectedService]);

  const normalizedSignalPercentage = Number.isFinite(Number(signalPercentage))
    ? Math.min(Math.max(Number(signalPercentage), 0), 100)
    : 30;
  const signalAmount = Number((totalPrice * (normalizedSignalPercentage / 100)).toFixed(2));

  const dateOptions = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 14 }, (_, index) => addDays(base, index));
  }, []);

  const selectedDateObj = useMemo(() => parseISO(`${date}T00:00:00`), [date]);

  const mapsQuery = [logradouro, numero, complemento, bairro, cidade, estado, cep]
    .filter((value) => value && value.trim().length > 0)
    .join(", ");

  const canProceedSelection = Boolean(selectedService && date && selectedTime);
  const requiresAddress = Boolean(selectedService?.accepts_home_visit && isHomeVisit);
  const addressComplete = !requiresAddress
    ? true
    : Boolean(logradouro && numero && bairro && cidade && estado);

  useEffect(() => {
    async function fetchSlots() {
      if (!selectedService || !date) return;
      setIsLoadingSlots(true);
      setAvailableSlots([]);
      setSelectedTime("");
      try {
        const slots = await getAvailableSlots({
          tenantId: tenant.id,
          serviceId: selectedService.id,
          date,
          isHomeVisit,
        });
        setAvailableSlots(slots);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingSlots(false);
      }
    }

    if (step === "SELECT") {
      fetchSlots();
    }
  }, [date, isHomeVisit, selectedService, step, tenant.id]);

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
    setCep(suggestedClient.address_cep ?? "");
    setLogradouro(suggestedClient.address_logradouro ?? "");
    setNumero(suggestedClient.address_numero ?? "");
    setComplemento(suggestedClient.address_complemento ?? "");
    setBairro(suggestedClient.address_bairro ?? "");
    setCidade(suggestedClient.address_cidade ?? "");
    setEstado(suggestedClient.address_estado ?? "");
    setClientLookupStatus("confirmed");
  };

  const handleDeclineSuggestedClient = () => {
    setSuggestedClient(null);
    setClientLookupStatus("declined");
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    if (!service.accepts_home_visit) {
      setIsHomeVisit(false);
    }
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

  const handleCreateAppointment = async () => {
    if (!selectedService || !date || !selectedTime || !clientName) return;

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
      });
      if (!result.ok) {
        alert(result.error.message);
        return;
      }
      setAppointmentId(result.data.appointmentId ?? null);
      setStep("PAYMENT");
    } catch {
      alert("Erro ao agendar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    if (!appointmentId || !selectedService) return;
    setPixStatus("loading");
    setPixError(null);
    try {
      const result = await createPixPayment({
        appointmentId,
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
    if (step !== "PAYMENT") return;
    if (!appointmentId || pixPayment || pixStatus === "loading") return;
    handleCreatePix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, appointmentId]);

  const floraMessage = floraMessages[step];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-studio-green/10 text-studio-green flex items-center justify-center">
          <Flower2 className="w-5 h-5" />
        </div>
        <div className="bg-white border border-stone-100 shadow-soft rounded-2xl px-4 py-3 text-sm text-gray-700">
          {floraMessage}
        </div>
      </div>

      {step === "WELCOME" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest ml-1">
              WhatsApp
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="tel"
                placeholder="(11) 99999-9999"
                value={clientPhone}
                onChange={(event) => setClientPhone(formatPhone(event.target.value))}
                inputMode="numeric"
                className="w-full bg-white border border-stone-100 rounded-2xl py-4 pl-11 pr-4 text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-studio-green/20"
              />
            </div>
            {isPhoneValid && clientLookupStatus !== "found" && clientLookupStatus !== "confirmed" && (
              <p className="text-xs text-green-600 font-semibold">Telefone confirmado. Vamos continuar!</p>
            )}
            {clientLookupStatus === "loading" && (
              <p className="text-xs text-gray-400">Verificando cadastro...</p>
            )}
            {clientLookupStatus === "found" && suggestedClient && (
              <div className="bg-white border border-stone-100 rounded-2xl p-3 flex items-center justify-between gap-3">
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
              <p className="text-xs text-green-600 font-semibold">Cadastro confirmado. Bem-vindo(a) de volta!</p>
            )}
            {clientLookupStatus === "not_found" && (
              <p className="text-xs text-gray-400">Não encontramos cadastro com esse número.</p>
            )}
            {clientLookupStatus === "declined" && (
              <p className="text-xs text-gray-400">Tudo bem! Você pode informar seus dados abaixo.</p>
            )}
          </div>

          {isPhoneValid && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest ml-1">
                Como prefere ser chamado(a)?
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  className="w-full bg-white border border-stone-100 rounded-2xl py-4 pl-11 pr-4 text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep("SELECT")}
            disabled={!isPhoneValid || !clientName.trim() || clientLookupStatus === "found"}
            className="w-full bg-studio-green text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar
          </button>
        </div>
      )}

      {step === "SELECT" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
          <button
            type="button"
            onClick={() => setStep("WELCOME")}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="space-y-2">
            <div className="h-1 w-full rounded-full bg-stone-100 overflow-hidden">
              <div className="h-full w-1/2 bg-studio-green" />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Etapa 2 de 4</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-bold text-gray-700">Escolha o serviço</h2>
            <div className="space-y-3">
              {services.map((service) => {
                const selected = selectedService?.id === service.id;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleServiceSelect(service)}
                    className={`w-full text-left rounded-2xl border p-4 shadow-sm transition-all ${
                      selected
                        ? "border-studio-green bg-green-50"
                        : "border-stone-100 bg-white hover:border-studio-green"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-bold text-gray-800 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-studio-green" />
                          {service.name}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {service.duration_minutes} min • R$ {Number(service.price).toFixed(2)}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                          selected ? "bg-studio-green text-white" : "bg-stone-100 text-gray-400"
                        }`}
                      >
                        {selected ? "Selecionado" : "Escolher"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedService?.accepts_home_visit && (
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-gray-700">Onde será o atendimento?</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsHomeVisit(false)}
                  className={`rounded-2xl border p-4 text-left ${
                    !isHomeVisit ? "border-studio-green bg-green-50" : "border-stone-100 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-studio-green" />
                    <span className="text-sm font-bold text-gray-700">Estúdio</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Sem taxa adicional</p>
                </button>
                <button
                  type="button"
                  onClick={() => setIsHomeVisit(true)}
                  className={`rounded-2xl border p-4 text-left ${
                    isHomeVisit ? "border-purple-500 bg-purple-50" : "border-stone-100 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-bold text-gray-700">Domicílio</span>
                  </div>
                  <p className="text-xs text-purple-500 mt-1">Inclui taxa de deslocamento</p>
                </button>
              </div>

              {isHomeVisit && (
                <div className="bg-white border border-stone-100 rounded-2xl p-4 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="CEP"
                      value={cep}
                      onChange={(event) => {
                        setCep(formatCep(event.target.value));
                        setCepStatus("idle");
                      }}
                      className="flex-1 bg-stone-50 border border-stone-100 rounded-xl py-3 px-3 text-sm font-semibold text-gray-700"
                    />
                    <button
                      type="button"
                      onClick={handleCepLookup}
                      className="px-4 rounded-xl bg-stone-100 text-xs font-bold text-gray-600"
                    >
                      {cepStatus === "loading" ? "Buscando" : "Buscar"}
                    </button>
                  </div>
                  {cepStatus === "error" && (
                    <p className="text-[11px] text-red-500">CEP inválido.</p>
                  )}
                  {cepStatus === "success" && (
                    <p className="text-[11px] text-green-600">Endereço encontrado.</p>
                  )}
                  <input
                    type="text"
                    placeholder="Logradouro"
                    value={logradouro}
                    onChange={(event) => setLogradouro(event.target.value)}
                    className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-3 text-sm font-semibold text-gray-700"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Número"
                      value={numero}
                      onChange={(event) => setNumero(event.target.value)}
                      className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-3 text-sm font-semibold text-gray-700"
                    />
                    <input
                      type="text"
                      placeholder="Complemento"
                      value={complemento}
                      onChange={(event) => setComplemento(event.target.value)}
                      className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-3 text-sm font-semibold text-gray-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Bairro"
                      value={bairro}
                      onChange={(event) => setBairro(event.target.value)}
                      className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-3 text-sm font-semibold text-gray-700"
                    />
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={cidade}
                      onChange={(event) => setCidade(event.target.value)}
                      className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-3 text-sm font-semibold text-gray-700"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Estado (UF)"
                    value={estado}
                    onChange={(event) => setEstado(event.target.value.toUpperCase())}
                    maxLength={2}
                    className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-3 text-sm font-semibold text-gray-700 uppercase"
                  />
                  {mapsQuery && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-studio-green font-semibold"
                    >
                      Ver endereço no Maps
                    </a>
                  )}
                </div>
              )}
            </section>
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700">Escolha o dia</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {dateOptions.map((day) => {
                const isSelected = isSameDay(day, selectedDateObj);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setDate(format(day, "yyyy-MM-dd"))}
                    className={`min-w-[68px] rounded-2xl border px-3 py-3 flex flex-col items-center gap-1 transition ${
                      isSelected
                        ? "bg-studio-green text-white border-studio-green"
                        : "bg-white border-stone-100 text-gray-500"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-widest">
                      {format(day, "EEE")}
                    </span>
                    <span className="text-lg font-extrabold">{format(day, "dd")}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700">Escolha o horário</h3>
            {isLoadingSlots ? (
              <div className="text-xs text-gray-400">Carregando horários...</div>
            ) : availableSlots.length === 0 ? (
              <div className="text-xs text-gray-400">Sem horários disponíveis para esta data.</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                      selectedTime === time
                        ? "bg-studio-green text-white border-studio-green"
                        : "bg-white border-stone-100 text-gray-500"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
          </section>

          <button
            type="button"
            onClick={() => setStep("REVIEW")}
            disabled={!canProceedSelection || !addressComplete}
            className="w-full bg-studio-green text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Revisar agendamento
          </button>
        </div>
      )}

      {step === "REVIEW" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
          <button
            type="button"
            onClick={() => setStep("SELECT")}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="space-y-2">
            <div className="h-1 w-full rounded-full bg-stone-100 overflow-hidden">
              <div className="h-full w-3/4 bg-studio-green" />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Etapa 3 de 4</p>
          </div>

          <div className="bg-white rounded-3xl border border-stone-100 p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold">Serviço</p>
                <p className="text-lg font-bold text-gray-800">{selectedService?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep("SELECT")}
                className="text-xs text-studio-green font-bold"
              >
                Alterar
              </button>
            </div>
            <div className="border-t border-dashed border-stone-200" />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-studio-green" />
                <span>{format(selectedDateObj, "EEE, dd/MM")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-studio-green" />
                <span>{selectedTime}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-studio-green" />
                <span>{clientName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {isHomeVisit ? <Home className="w-4 h-4 text-purple-500" /> : <MapPin className="w-4 h-4 text-studio-green" />}
                <span>{isHomeVisit ? "Domicílio" : "Estúdio"}</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-stone-100 pt-3 text-sm">
              <span>Total</span>
              <span className="font-bold text-gray-800">R$ {totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateAppointment}
            disabled={isSubmitting}
            className="w-full bg-studio-green text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-200 disabled:opacity-50"
          >
            {isSubmitting ? "Reservando horário..." : "Tudo certo! Ir para pagamento"}
          </button>
        </div>
      )}

      {step === "PAYMENT" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
          <button
            type="button"
            onClick={() => setStep("REVIEW")}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="space-y-2">
            <div className="h-1 w-full rounded-full bg-stone-100 overflow-hidden">
              <div className="h-full w-full bg-studio-green" />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Etapa 4 de 4</p>
          </div>

          <div className="bg-white rounded-3xl border border-stone-100 p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Wallet className="w-4 h-4 text-studio-green" />
              <span>Total do serviço: R$ {totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
              <span className="text-sm font-bold text-green-700">Sinal de reserva ({normalizedSignalPercentage}%)</span>
              <span className="text-lg font-black text-green-700">R$ {signalAmount.toFixed(2)}</span>
            </div>

            {pixPayment?.qr_code_base64 ? (
              <div className="rounded-2xl border border-stone-100 p-4 flex items-center justify-center bg-white">
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
              <div className="rounded-2xl border border-dashed border-stone-200 p-6 text-center text-xs text-gray-400">
                {pixStatus === "loading" ? "Gerando QR Code Pix..." : "QR Code Pix indisponível"}
              </div>
            )}

            {pixPayment?.qr_code && (
              <div className="bg-stone-50 rounded-2xl p-3 text-[11px] text-gray-600 break-words">
                {pixPayment.qr_code}
              </div>
            )}

            {pixError && <p className="text-xs text-red-500">{pixError}</p>}

            <div className="grid gap-3">
              {pixPayment?.qr_code ? (
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="w-full border-2 border-dashed border-studio-green text-studio-green font-bold py-3 rounded-2xl flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" /> Copiar chave Pix
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreatePix}
                  className="w-full bg-stone-900 text-white font-bold py-3 rounded-2xl"
                >
                  Gerar Pix
                </button>
              )}
              <button
                type="button"
                onClick={() => setStep("SUCCESS")}
                className="w-full bg-studio-green text-white font-bold py-3 rounded-2xl"
              >
                Já fiz o Pix! Finalizar
              </button>
            </div>

            {appointmentId && (
              <p className="text-[10px] text-gray-400">Agendamento #{appointmentId}</p>
            )}
          </div>
        </div>
      )}

      {step === "SUCCESS" && (
        <div className="text-center py-8 animate-in zoom-in duration-500">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-studio-green">
            <CheckCircle2 size={36} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Agendamento recebido!</h2>
          <p className="text-gray-500 mb-6">
            Te esperamos no dia {format(selectedDateObj, "dd/MM")} às {selectedTime}.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-studio-green font-bold text-sm hover:underline"
          >
            Fazer outro agendamento
          </button>
        </div>
      )}
    </div>
  );
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
};
