"use client";

import { useState } from "react";
import { format, addDays, isSameDay, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Coffee, Hospital, Car, CheckCircle, Plus } from "lucide-react"; 
import { ShiftManager } from "./shift-manager"; 
import { AppointmentDetailsModal, AppointmentDetails } from "./appointment-details-modal";
import { useRouter } from "next/navigation";

interface AppointmentClient {
    id: string;
    name: string;
    initials: string | null;
    phone?: string | null;
    health_tags?: string[] | null;
    endereco_completo?: string | null;
}

interface Appointment {
  id: string;
  service_name: string;
  start_time: string;
  finished_at: string | null;
  clients: AppointmentClient | null;
  status: string;
  is_home_visit?: boolean | null;
  total_duration_minutes?: number | null;
  price?: number | null;
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
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDetails | null>(null);
  
  const router = useRouter();

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
          service_name: "Plantão", 
          start_time: b.start_time, 
          finished_at: b.end_time, 
          clients: { id: 'block', name: b.title, initials: '⛔' } as AppointmentClient, 
          status: 'blocked',
          type: 'block' as const,
          is_home_visit: false,
          total_duration_minutes: null,
          price: 0
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
                const startTimeDate = new Date(appt.start_time);
                const start = format(startTimeDate, "HH:mm");
                
                // Calculate End Time Logic
                let end = "";
                if (appt.finished_at && appt.type === 'appointment') {
                    end = format(new Date(appt.finished_at), "HH:mm");
                } else if (appt.total_duration_minutes) {
                    end = format(addMinutes(startTimeDate, appt.total_duration_minutes), "HH:mm");
                } 
                
                const isBlock = appt.type === 'block'; 
                const isHome = appt.is_home_visit;
                const isCompleted = appt.status === 'completed';
                
                // Style Logic
                let containerClass = "bg-white border-stone-100";
                let decorationColor = "bg-studio-green";
                let textColor = "text-gray-800";
                let subTextColor = "text-gray-500";
                
                if (isBlock) {
                    containerClass = "bg-red-50/50 border-red-100";
                    decorationColor = "bg-red-400";
                    textColor = "text-red-800";
                    subTextColor = "text-red-500";
                } else if (isCompleted) {
                    containerClass = "bg-green-50/50 border-green-200 opacity-80";
                    decorationColor = "bg-green-600";
                    textColor = "text-green-900";
                    subTextColor = "text-green-700";
                } else if (isHome) {
                    containerClass = "bg-purple-50/30 border-purple-100";
                    decorationColor = "bg-purple-500";
                }

                return (
                    <button 
                        key={appt.id} 
                        onClick={() => !isBlock && setSelectedAppointment(appt as AppointmentDetails)}
                        disabled={isBlock}
                        className={`w-full text-left rounded-2xl p-4 shadow-sm border ${containerClass} flex items-center gap-4 relative overflow-hidden group active:scale-95 transition-transform`}
                    >
                        {/* Linha Lateral Colorida */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${decorationColor}`}></div>

                        {/* Coluna Horário */}
                        <div className="flex flex-col items-center min-w-14">
                            <span className={`text-lg font-bold ${textColor}`}>{start}</span>
                            <span className="text-[10px] text-gray-400">{end}</span>
                        </div>

                        {/* Divisor */}
                        <div className="h-8 w-px bg-stone-100"></div>

                        {/* Coluna Detalhes */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className={`font-bold text-sm ${isBlock ? 'text-red-700' : 'text-gray-800'}`}>{appt.clients?.name}</h3>
                                {isHome && <Car size={14} className="text-purple-500" />}
                                {isCompleted && <CheckCircle size={14} className="text-green-600" />}
                            </div>
                            <p className={`text-xs ${subTextColor}`}>{appt.service_name}</p>
                            {isHome && <span className="text-[10px] text-purple-600 font-medium tracking-wide">Atendimento Domiciliar</span>}
                            {isCompleted && <span className="text-[10px] text-green-600 font-medium tracking-wide">Finalizado</span>}
                        </div>
                    </button>
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

      {/* FAB - Novo Agendamento */}
      <button className="absolute bottom-6 right-6 w-14 h-14 bg-studio-green text-white rounded-full shadow-lg shadow-green-200 flex items-center justify-center hover:bg-studio-green-dark transition-transform active:scale-95 z-40">
            <Plus size={28} />
      </button>
      
      {/* Modal - Renderizado Condicionalmente */}
      {selectedAppointment && (
        <AppointmentDetailsModal 
            appointment={selectedAppointment} 
            onClose={() => setSelectedAppointment(null)}
            onUpdate={() => router.refresh()}
        />
      )}
    </div>
  );
}
