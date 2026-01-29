"use client";

import { useState } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Coffee, Hospital } from "lucide-react"; 
import Link from "next/link";
import { ShiftManager } from "./shift-manager"; 

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

interface AvailabilityBlock {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
}

interface MobileAgendaProps {
  appointments: Appointment[];
  blocks: AvailabilityBlock[];
}

export function MobileAgenda({ appointments, blocks }: MobileAgendaProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showShiftManager, setShowShiftManager] = useState(false); 

  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  const dailyAppointments = appointments.filter((appt) => 
    isSameDay(new Date(appt.start_time), selectedDate)
  );

  const dailyBlocks = blocks.filter((block) => 
    isSameDay(new Date(block.start_time), selectedDate)
  );
  
  const items = [
      ...dailyAppointments.map(a => ({ ...a, type: 'appointment' as const })),
      ...dailyBlocks.map(b => ({ 
          id: b.id, 
          service_name: b.title, 
          start_time: b.start_time, 
          finished_at: b.end_time, 
          clients: { name: 'Bloqueio', initials: '⛔' }, 
          status: 'blocked',
          type: 'block' as const
      }))
  ].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <div className="bg-stone-50 min-h-[600px] flex flex-col">
      
      {/* 1. Header Fixo com Seletor de Dias */}
      <div className="bg-white px-4 py-4 shadow-sm border-b border-stone-100 z-10 transition-all duration-300">
         <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-studio-green font-serif">Agenda</h1>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setShowShiftManager(!showShiftManager)}
                    className={`p-2 rounded-full transition-colors ${showShiftManager ? 'bg-studio-green text-white' : 'bg-studio-green/10 text-studio-green'}`}
                >
                    <Hospital size={20} />
                </button>
                
                <div className="w-8 h-8 bg-studio-green/10 rounded-full flex items-center justify-center text-xs font-bold text-studio-green">
                    EC
                </div>
            </div>
         </div>

        {/* Gerenciador de Plantões (Expandable) */}
        {showShiftManager && (
            <div className="mb-4 animate-in slide-in-from-top-2 fade-in">
                <ShiftManager />
            </div>
        )}

        {/* Strip Calendar */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {days.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                return (
                    <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`
                            flex flex-col items-center justify-center min-w-14 py-3 rounded-xl transition-all border
                            ${isSelected 
                                ? "bg-studio-green text-white shadow-lg shadow-green-100 scale-105 border-studio-green" 
                                : "bg-white text-gray-400 border-stone-100 hover:border-studio-green/30"
                            }
                        `}
                    >
                        <span className="text-[10px] uppercase font-bold tracking-wider mb-0.5">
                            {format(day, "EEE", { locale: ptBR }).replace(".", "")}
                        </span>
                        <span className="text-xl font-bold leading-none">
                            {format(day, "dd")}
                        </span>
                    </button>
                )
            })}
        </div>
      </div>

      {/* 2. Lista de Agendamentos */}
      <div className="flex-1 p-4 space-y-4 pb-28 overflow-y-auto">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h2>

        {items.length > 0 ? (
            items.map((appt) => {
                const start = format(new Date(appt.start_time), "HH:mm");
                const end = appt.finished_at ? format(new Date(appt.finished_at), "HH:mm") : "";
                const isBlock = appt.type === 'block'; 
                
                return (
                    <div key={appt.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${isBlock ? 'border-red-100 bg-red-50/50' : 'border-stone-100'} flex items-center gap-4 relative overflow-hidden group active:scale-95 transition-transform`}>
                        {/* Linha Lateral Colorida */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isBlock ? 'bg-red-400' : 'bg-studio-green'}`}></div>

                        {/* Coluna Horário */}
                        <div className="flex flex-col items-center min-w-14">
                            <span className={`text-lg font-bold ${isBlock ? 'text-red-800' : 'text-gray-800'}`}>{start}</span>
                            <span className="text-[10px] text-gray-400">{end}</span>
                        </div>

                        {/* Divisor */}
                        <div className="h-8 w-px bg-stone-100"></div>

                        {/* Coluna Detalhes */}
                        <div className="flex-1">
                            <h3 className={`font-bold text-sm ${isBlock ? 'text-red-700' : 'text-gray-800'}`}>{appt.clients?.name}</h3>
                            <p className={`text-xs ${isBlock ? 'text-red-500' : 'text-gray-500'}`}>{appt.service_name}</p>
                        </div>

                         {/* Ações (Link para editar/detalhes) - Desabilita link se for bloqueio */}
                         {!isBlock && (
                             <Link 
                                href={`/clientes/${appt.clients?.name ? '1' : ''}`} 
                                className="absolute inset-0 z-10"
                            />
                         )}
                    </div>
                );
            })
        ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                <div className="w-16 h-16 bg-white border-2 border-dashed border-stone-200 rounded-full flex items-center justify-center mb-4 text-stone-300">
                     <Coffee size={28} />
                </div>
                <h3 className="text-gray-500 font-bold text-sm">Agenda Livre</h3>
                <p className="text-xs text-gray-400 mt-1">Nenhum agendamento para este dia.</p>
            </div>
        )}

      </div>
    </div>
  );
}
