"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar, ChevronRight, Check, User, Phone, Sparkles, Loader2 } from "lucide-react";
import { submitPublicAppointment } from "./public-actions";
import { getAvailableSlots } from "./availability";
import { useEffect } from "react";

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

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface BookingFlowProps {
  tenant: Tenant;
  services: Service[];
}

type Step = "SERVICE" | "DATETIME" | "INFO" | "SUCCESS";



export function BookingFlow({ tenant, services }: BookingFlowProps) {
  const [step, setStep] = useState<Step>("SERVICE");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Fetch Slots when date or service changes
  useEffect(() => {
    async function fetchSlots() {
        if (!selectedService || !date) return;

        setIsLoadingSlots(true);
        setAvailableSlots([]);
        setSelectedTime(""); // Reset selection

        try {
            const slots = await getAvailableSlots({
                tenantId: tenant.id,
                serviceId: selectedService.id,
                date
            });
            setAvailableSlots(slots);
        } catch (error) {
            console.error(error);
            // Handle error silently or show toast
        } finally {
            setIsLoadingSlots(false);
        }
    }

    if (step === "DATETIME") {
        fetchSlots();
    }
  }, [date, selectedService, step, tenant.id]);

  // Handlers
  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep("DATETIME");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleConfirmDateTime = () => {
    if (date && selectedTime) {
      setStep("INFO");
    }
  };

  const handleSubmit = async () => {
    if (!selectedService || !date || !selectedTime || !clientName) return;

    setIsSubmitting(true);
    try {
        await submitPublicAppointment({
            tenantId: tenant.id,
            serviceId: selectedService.id,
            date,
            time: selectedTime,
            clientName,
            clientPhone
        });
        setStep("SUCCESS");
    } catch {
        alert("Erro ao agendar. Tente novamente.");
    } finally {
        setIsSubmitting(false);
    }
  };

  // Render Steps
  
  // 1. SERVICES
  if (step === "SERVICE") {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Qual procedimento você deseja?</h2>
        <div className="grid gap-3">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => handleServiceSelect(service)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 text-left hover:border-studio-green hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                 <ChevronRight className="text-studio-green" />
              </div>
              <h3 className="font-bold text-gray-800">{service.name}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span>{service.duration_minutes} min</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="font-semibold text-studio-green">R$ {service.price}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 2. DATE & TIME
  if (step === "DATETIME") {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
        <button onClick={() => setStep("SERVICE")} className="text-sm text-gray-400 flex items-center gap-1 mb-2 hover:text-gray-600">
            <ChevronRight className="rotate-180" size={14} /> Voltar
        </button>

        <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Escolha o melhor horário</h2>
            
            {/* Resumo do Serviço */}
            <div className="bg-stone-50 p-3 rounded-xl flex justify-between items-center mb-6 border border-stone-100">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-studio-green" />
                    <span className="font-bold text-gray-700">{selectedService?.name}</span>
                </div>
                <span className="text-sm text-gray-500">R$ {selectedService?.price}</span>
            </div>

            {/* Input Data */}
            <div className="mb-6">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-2 block">Data</label>
                <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-white border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                    />
                </div>
            </div>

            {/* Lista de Horários */}
            <div>
                <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-2 block">Horários Disponíveis</label>
                
                {isLoadingSlots ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-studio-green" />
                    </div>
                ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                        {availableSlots.map((time) => (
                            <button
                                key={time}
                                onClick={() => handleTimeSelect(time)}
                                className={`
                                    py-3 rounded-xl text-sm font-bold transition-all border
                                    ${selectedTime === time 
                                        ? "bg-studio-green text-white border-studio-green shadow-lg shadow-green-100 scale-105" 
                                        : "bg-white text-gray-600 border-stone-100 hover:border-studio-green hover:text-studio-green"
                                    }
                                `}
                            >
                                {time}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-stone-50 rounded-xl border border-dashed border-stone-200 text-gray-400 text-sm">
                        Nenhum horário disponível para esta data.
                    </div>
                )}
            </div>
        </div>

        <button 
            onClick={handleConfirmDateTime}
            disabled={!selectedTime}
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black transition mt-8"
        >
            Continuar
        </button>
      </div>
    );
  }

  // 3. INFO
  if (step === "INFO") {
     return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
         <button onClick={() => setStep("DATETIME")} className="text-sm text-gray-400 flex items-center gap-1 mb-2 hover:text-gray-600">
            <ChevronRight className="rotate-180" size={14} /> Voltar
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-4">Seus Dados</h2>

        <div className="space-y-4">
            <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Seu Nome Completo"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-white border-stone-100 border rounded-xl py-4 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
            </div>
            <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="tel" 
                    placeholder="Seu WhatsApp (Opcional)"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-white border-stone-100 border rounded-xl py-4 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
            </div>
        </div>
        
        {/* Resumo Final */}
        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 mt-6 space-y-2 text-sm text-orange-800">
            <div className="flex justify-between">
                <span>Serviço:</span>
                <span className="font-bold">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between">
                <span>Data:</span>
                <span className="font-bold">{date ? format(new Date(date), "dd/MM/yyyy") : ""} às {selectedTime}</span>
            </div>
            <div className="flex justify-between border-t border-orange-200 pt-2 mt-2">
                <span>Total:</span>
                <span className="font-bold text-lg">R$ {selectedService?.price.toFixed(2)}</span>
            </div>
        </div>

        <button 
            onClick={handleSubmit}
            disabled={!clientName || isSubmitting}
            className="w-full bg-studio-green text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-studio-green-dark transition mt-4 shadow-lg shadow-green-200 flex items-center justify-center gap-2"
        >
            {isSubmitting ? "Agendando..." : "Confirmar Agendamento"}
        </button>

      </div>
     );
  }

  // 4. SUCCESS
  if (step === "SUCCESS") {
      return (
          <div className="text-center py-10 animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-studio-green">
                  <Check size={40} strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Agendamento Confirmado!</h2>
              <p className="text-gray-500 mb-8 max-w-xs mx-auto">
                  Te aguardamos no dia {format(new Date(date), "dd/MM")} às {selectedTime}.
              </p>
              
              <button 
                onClick={() => window.location.reload()}
                className="text-studio-green font-bold text-sm hover:underline"
              >
                  Fazer outro agendamento
              </button>
          </div>
      )
  }

  return null;
}
