"use client";

import { Calendar, dateFnsLocalizer, View, Views, ToolbarProps } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Hospital } from "lucide-react";
import { ShiftManager } from "./shift-manager";

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

interface AvailabilityBlock {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
}

// Define the Event type explicitly for React Big Calendar
interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource: Appointment | AvailabilityBlock;
    type: 'appointment' | 'block';
}

interface DesktopCalendarProps {
  appointments: Appointment[];
  blocks: AvailabilityBlock[];
}

export function DesktopCalendar({ appointments, blocks }: DesktopCalendarProps) {
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [showShiftManager, setShowShiftManager] = useState(false);

  const appointmentEvents: CalendarEvent[] = appointments.map((appt) => {
    const start = new Date(appt.start_time);
    const end = appt.finished_at 
        ? new Date(appt.finished_at) 
        : new Date(start.getTime() + 30 * 60000);

    return {
        id: appt.id,
        title: `${appt.clients?.name || "Cliente"} - ${appt.service_name}`,
        start,
        end,
        resource: appt,
        type: 'appointment',
    };
  });

  const blockEvents: CalendarEvent[] = blocks.map((block) => ({
    id: block.id,
    title: "⛔ " + block.title,
    start: new Date(block.start_time),
    end: new Date(block.end_time),
    resource: block,
    type: 'block',
  }));

  const events = [...appointmentEvents, ...blockEvents];

  // Toolbar customizada com tipagem correta
  const CustomToolbar = (toolbar: ToolbarProps<CalendarEvent, object>) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
      toolbar.onNavigate('TODAY');
    };

    const label = () => {
      const date = toolbar.date;
      return <span className="text-xl font-bold text-gray-800 font-serif capitalize">{format(date, 'MMMM yyyy', { locale: ptBR })}</span>;
    };

    return (
      <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-4">
            {label()}
            <div className="flex bg-stone-100 rounded-lg p-1">
                <button 
                  onClick={() => toolbar.onView('week')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${toolbar.view === 'week' ? 'bg-white shadow-sm text-studio-green' : 'text-gray-500 hover:bg-white/50'}`}
                >
                  Semana
                </button>
                <button 
                   onClick={() => toolbar.onView('day')}
                   className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${toolbar.view === 'day' ? 'bg-white shadow-sm text-studio-green' : 'text-gray-500 hover:bg-white/50'}`}
                >
                  Dia
                </button>
            </div>
            
            <button 
                onClick={() => setShowShiftManager(!showShiftManager)}
                className={`ml-2 p-2 px-3 rounded-lg border transition-all flex items-center gap-2 text-sm font-medium shadow-sm ${showShiftManager ? 'bg-studio-green text-white border-studio-green' : 'bg-white text-studio-green border-stone-200 hover:border-studio-green'}`}
                title="Gerenciar Escalas"
             >
                <Hospital size={16} />
                <span>Escalas</span>
             </button>
        </div>
        
        <div className="flex gap-2">
            <button onClick={goToBack} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-50 text-gray-500">
                <ChevronLeft size={16} />
            </button>
            <button onClick={goToCurrent} className="px-3 rounded border hover:bg-gray-50 text-sm font-medium text-gray-600">
                Hoje
            </button>
            <button onClick={goToNext} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-50 text-gray-500">
                <ChevronRight size={16} />
            </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 overflow-hidden h-full relative">
       {showShiftManager && (
         <div className="absolute top-24 left-6 z-50 w-96 shadow-2xl animate-in fade-in zoom-in-95 duration-200 bg-white rounded-2xl ring-1 ring-black/5">
            <ShiftManager />
         </div>
       )}

      <style>{`
        .rbc-calendar { font-family: inherit; }
        .rbc-header { padding: 12px 0; font-weight: 600; font-size: 14px; text-transform: uppercase; color: #6b7280; border-bottom: none; }
        .rbc-time-header-content { border-left: 1px solid #f3f4f6; }
        .rbc-time-content { border-top: 1px solid #f3f4f6; }
        .rbc-time-view { border: none; }
        .rbc-day-slot .rbc-time-slot { border-top: 1px dashed #f3f4f6; }
        .rbc-timeslot-group { border-bottom: none; min-height: 60px; } /* Espaçamento maior */
        
        /* Eventos */
        .rbc-event {
            background-color: rgba(106, 128, 108, 0.15) !important; /* studio-green/15 */
            border-left: 4px solid #6A806C !important;
            border-radius: 4px !important; /* rounded-r-lg like */
            border-top: none !important;
            border-right: none !important;
            border-bottom: none !important;
            color: #2D2D2D !important;
            padding: 4px 8px !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .rbc-event-label { display: none; } /* Esconde horário default feio */
        .rbc-event-content { font-size: 12px; font-weight: 600; }
        
        /* Hoje */
        .rbc-today { background-color: transparent !important; }
        
        /* Time Gutter */
        .rbc-time-gutter .rbc-timeslot-group { border-bottom: none; }
        .rbc-label { font-size: 11px; color: #9ca3af; font-weight: 500; }

        /* Current Time Indicator (Gambiarra visual se suportado, senao default) */
        .rbc-current-time-indicator { background-color: #ef4444; height: 2px; }
      `}</style>
      
      <div style={{ height: 600 }}>
        <Calendar<CalendarEvent, object>
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          culture="pt-BR"
          messages={messages}
          views={['day', 'week']} // Limitando para ficar clean
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          min={new Date(0, 0, 0, 8, 0, 0)} // 08:00
          max={new Date(0, 0, 0, 19, 0, 0)} // 19:00
          components={{
            toolbar: CustomToolbar
          }}
          eventPropGetter={(event) => {
            if (event.type === 'block') {
                return {
                    className: 'event-block',
                    style: {
                        backgroundColor: '#fee2e2 !important', // red-100
                        borderLeft: '4px solid #ef4444 !important', // red-500
                        color: '#991b1b !important', // red-800
                        opacity: 0.8
                    }
                }
            }
            return {};
          }}
          formats={{
            timeGutterFormat: (date, culture, localizer) => 
                localizer?.format(date, 'HH:mm', culture) || '',
            dayFormat: (date, culture, localizer) =>
                localizer?.format(date, 'EEE dd', culture) || ''
          }}
        />
      </div>
    </div>
  );
}
