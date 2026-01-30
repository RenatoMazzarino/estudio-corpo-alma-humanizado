"use client";

import { useEffect, useState } from "react";
import { MapPin, Clock, CheckCircle2, Play, Square, Timer, Trash2 } from "lucide-react";
import { startAppointment, finishAppointment, cancelAppointment } from "../app/actions"; // Importamos o cancelAppointment
import { format } from "date-fns";

// Interface dos dados
interface AppointmentCardProps {
  appointment: {
    id: string;
    service_name: string;
    start_time: string;
    status: string;
    started_at: string | null;
    finished_at: string | null;
    clients: {
      name: string;
      initials: string | null;
    } | null;
  };
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const isOngoing = appointment.status === "in_progress";
  const isDone = appointment.status === "completed";

  // Formata o horário (Início - Fim)
  const startTime = format(new Date(appointment.start_time), "HH:mm");
  const endTime = appointment.finished_at ? format(new Date(appointment.finished_at), "HH:mm") : null;
  const timeDisplay = endTime ? `${startTime} - ${endTime}` : startTime;

  // Lógica do Cronômetro
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isOngoing && appointment.started_at) {
      interval = setInterval(() => {
        const start = new Date(appointment.started_at!).getTime();
        const now = new Date().getTime();
        const diff = now - start;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const formatted = hours > 0 
          ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
          : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        setElapsedTime(formatted);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isOngoing, appointment.started_at]);

  if (isDone) return (
    <div className="bg-stone-50 p-5 rounded-3xl border border-stone-100 opacity-60 grayscale transition-all">
       <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-gray-800 line-through">{appointment.clients?.name}</h3>
          <span className="bg-gray-200 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-full">CONCLUÍDO</span>
       </div>
    </div>
  );

  return (
    <div className={`
      relative p-5 rounded-3xl transition-all duration-300 border
      ${isOngoing 
        ? "bg-white shadow-xl shadow-green-100 border-studio-green scale-[1.02]" 
        : "bg-white shadow-sm border-stone-100 hover:shadow-md"
      }
    `}>
      {isOngoing && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-studio-green"></span>
        </span>
      )}

      <div className="flex justify-between items-start mb-3">
          <div className="flex gap-3 items-center">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-colors
                ${isOngoing ? "bg-studio-green text-white" : "bg-studio-pink/20 text-studio-green"}
              `}>
                {appointment.clients?.initials || "C"}
              </div>
              <div>
                  <h3 className="font-bold text-gray-800 text-base">{appointment.clients?.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin size={12} className="text-studio-green" />
                    <span>{appointment.service_name}</span>
                  </div>
              </div>
          </div>
          
          {/* Botão de Status / Cancelar */}
          {!isOngoing ? (
             <div className="flex items-center gap-2">
               {/* Botão de Cancelar (Lixeira) */}
               <button 
                  onClick={() => {
                    if(confirm("Tem certeza que deseja cancelar este agendamento?")) {
                      cancelAppointment(appointment.id);
                    }
                  }}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                  title="Cancelar Agendamento"
               >
                 <Trash2 size={16} />
               </button>
               
               <span className="bg-green-50 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-green-100">
                 <CheckCircle2 size={10} />
                 AGENDADO
               </span>
             </div>
          ) : (
            // Se estiver em andamento, não mostra lixeira para evitar acidentes
             <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-studio-green animate-pulse">EM ANDAMENTO</span>
             </div>
          )}
      </div>
      
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-stone-50">
          <div className="flex items-center gap-2 text-gray-700 bg-stone-50 px-3 py-1.5 rounded-lg">
            {isOngoing ? (
              <>
                <Timer size={14} className="text-green-600 animate-pulse" />
                <span className="text-sm font-bold text-green-700 font-mono tracking-widest">{elapsedTime}</span>
              </>
            ) : (
              <>
                <Clock size={14} className="text-gray-400" />
                <span className="text-sm font-bold">{timeDisplay}</span>
              </>
            )}
          </div>

          {isOngoing ? (
            <button 
              onClick={() => finishAppointment(appointment.id)}
              className="bg-red-50 text-red-600 border border-red-100 text-xs font-bold px-6 py-2.5 rounded-full hover:bg-red-100 transition flex items-center gap-2"
            >
              <Square size={10} fill="currentColor" /> Finalizar
            </button>
          ) : (
            <button 
              onClick={() => startAppointment(appointment.id)}
              className="bg-studio-text text-white text-xs font-medium px-6 py-2.5 rounded-full hover:bg-black transition shadow-lg shadow-gray-200 flex items-center gap-2"
            >
              <Play size={10} fill="currentColor" /> Iniciar
            </button>
          )}
      </div>
    </div>
  );
}
