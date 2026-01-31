"use client";

import { Calendar, Clock, User, Sparkles, Banknote } from "lucide-react";
import { useEffect, useState } from "react";
import { createAppointment } from "./appointment-actions"; // Ação importada do arquivo renomeado
import { getAvailableSlots } from "./availability";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";

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
  safeDate: string;
}

export function AppointmentForm({ services, safeDate }: AppointmentFormProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [displayedPrice, setDisplayedPrice] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(safeDate);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = e.target.value;
    setSelectedServiceId(serviceId);

    const service = services.find((s) => s.id === serviceId);
    if (service) {
      setDisplayedPrice(service.price.toFixed(2));
    } else {
      setDisplayedPrice("");
    }
  };

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
          isHomeVisit: false,
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
  }, [selectedServiceId, selectedDate]);

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
              className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3.5 pl-11 pr-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20 focus:border-studio-green"
              required
            />
          </div>
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
