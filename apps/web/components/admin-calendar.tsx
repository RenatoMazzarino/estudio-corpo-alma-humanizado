"use client";

import { Calendar, dateFnsLocalizer, View, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState, useEffect } from "react";

const locales = {
  "pt-BR": ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Mensagens traduzidas
const messages = {
  allDay: "Dia inteiro",
  previous: "Anterior",
  next: "Próximo",
  today: "Hoje",
  month: "Mês",
  week: "Semana",
  day: "Dia",
  agenda: "Agenda",
  date: "Data",
  time: "Hora",
  event: "Evento",
  noEventsInRange: "Sem agendamentos neste período",
};

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

interface AdminCalendarProps {
  appointments: Appointment[];
}

export function AdminCalendar({ appointments }: AdminCalendarProps) {
  const [view, setView] = useState<View>(Views.WEEK); 
  const [date, setDate] = useState(new Date());


  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (mobile) {
            setView(Views.DAY);
        } else {
            setView(Views.WEEK);
        }
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Na versão Mobile, removemos a opção de "Semana" e "Mês" para simplificar/forçar ergonomia
  const availableViews = isMobile ? [Views.DAY, Views.AGENDA] : [Views.DAY, Views.WEEK, Views.MONTH, Views.AGENDA];


  // Mapeia os dados do banco para o formato do Calendar
  const events = appointments.map((appt) => {
    // Garante datas válidas
    const start = new Date(appt.start_time);
    const end = appt.finished_at 
        ? new Date(appt.finished_at) 
        : new Date(start.getTime() + 30 * 60000); // Fallback 30min

    return {
        id: appt.id,
        title: `${appt.clients?.name || "Cliente"} - ${appt.service_name}`,
        start,
        end,
        resource: appt, // Guarda o obj original se precisar
    };
  });

  return (
    <div className="bg-white p-4 rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
      <style>{`
        .rbc-calendar {
            font-family: inherit;
        }
        .rbc-toolbar button {
            border-radius: 8px;
            font-size: 14px;
        }
        .rbc-toolbar button:active, .rbc-toolbar button.rbc-active {
            background-color: #3b3935; /* studio-green aprox */
            color: white;
            box-shadow: none;
        }
        .rbc-event {
            background-color: #3b3935 !important; /* studio-green */
            border-radius: 6px !important;
            border: none !important;
            font-size: 12px;
            font-weight: bold;
        }
        .rbc-time-slot {
            font-size: 12px;
        }
        .rbc-today {
            background-color: #f7fce8; /* Leve verde */
        }
      `}</style>
      
      <div style={{ height: 600 }}>
        <Calendar
          localizer={localizer}
          events={events} // Nossos dados já transformados
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          culture="pt-BR"
          messages={messages}
          views={availableViews}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          min={new Date(0, 0, 0, 8, 0, 0)} // 08:00
          max={new Date(0, 0, 0, 19, 0, 0)} // 19:00
        />
      </div>
    </div>
  );
}
