"use client";

import { useState } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Coffee } from "lucide-react";

interface AppointmentClient {
    name: string;
    initials: string | null;
}

interface Appointment {
  id: string;
  service_name: string;
  start_time: string;
  finished_at: string | null;
  clients: AppointmentClient | null;
  status: string;
}

interface MobileAgendaProps {
  appointments: Appointment[];
}

export function MobileAgenda({ appointments }: MobileAgendaProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Gera os próximos 14 dias para o seletor
  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  // Filtra agendamentos do dia selecionado
  const dailyAppointments = appointments.filter((appt) => 
    isSameDay(new Date(appt.start_time), selectedDate)
  ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <div className="bg-stone-50 min-h-[500px]">
      
      {/* 1. Strip Calendar (Seletor de Dias) */}
      <div className="bg-white px-4 py-3 shadow-sm border-b border-stone-100 flex overflow-x-auto gap-3 no-scrollbar">
        {days.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            return (
                <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                        flex flex-col items-center justify-center min-w-[50px] py-2 rounded-xl transition-all border
                        ${isSelected 
                            ? "bg-studio-green text-white border-studio-green shadow-md shadow-green-100" 
                            : "bg-gray-50 text-gray-400 border-gray-100 hover:border-studio-green/30"
                        }
                    `}
                >
                    <span className="text-[10px] uppercase font-bold tracking-wider mb-0.5">
                        {format(day, "EEE", { locale: ptBR }).replace(".", "")}
                    </span>
                    <span className="text-lg font-bold leading-none">
                        {format(day, "dd")}
                    </span>
                </button>
            )
        })}
      </div>

      {/* 2. Lista de Agendamentos */}
      <div className="p-4 space-y-3 pb-24">
        
        {dailyAppointments.length > 0 ? (
            dailyAppointments.map((appt) => {
                const start = format(new Date(appt.start_time), "HH:mm");
                const end = appt.finished_at ? format(new Date(appt.finished_at), "HH:mm") : "";
                
                return (
                    <div key={appt.id} className="bg-white shadow-sm border-l-4 border-studio-green rounded-r-lg p-4 flex gap-4 items-center">
                        {/* Coluna Horário */}
                        <div className="flex flex-col min-w-[80px]">
                             <div className="flex items-center gap-1.5 text-gray-800 font-bold text-lg">
                                <Clock size={16} className="text-studio-green" />
                                <span>{start}</span>
                             </div>
                             {end && <span className="text-xs text-gray-400 pl-6 text-left">até {end}</span>}
                        </div>

                        {/* Coluna Detalhes */}
                        <div className="flex-1 border-l border-gray-100 pl-4">
                            <h3 className="font-bold text-gray-800">{appt.clients?.name}</h3>
                            <p className="text-sm text-gray-400">{appt.service_name}</p>
                        </div>
                    </div>
                );
            })
        ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-400">
                     <Coffee size={32} />
                </div>
                <h3 className="text-gray-500 font-bold">Agenda Livre</h3>
                <p className="text-sm text-gray-400 mt-1">Nenhum atendimento para hoje.</p>
            </div>
        )}

      </div>
        
       <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
