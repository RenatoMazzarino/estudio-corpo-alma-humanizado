"use client";

import { Calendar, dateFnsLocalizer, View, Views, ToolbarProps } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

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
    id: string; // Adicionado id
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
  price?: number | null; // Adicionado
  is_home_visit?: boolean | null; // Adicionado
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
  
  const router = useRouter();

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

  const handleSelectEvent = (event: CalendarEvent) => {
      if (event.type === 'appointment') {
          router.push(`/atendimento/${event.id}`);
      }
      // Se for block, nada acontece por enquanto (ou abrir shift manager)
  };

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
      const view = toolbar.view;

      let formattedLabel = '';
      if (view === 'day') {
          formattedLabel = format(date, "d 'de' MMMM", { locale: ptBR });
      } else {
          formattedLabel = format(date, 'MMMM yyyy', { locale: ptBR });
      }

      return <span className="text-xl font-bold text-gray-800 capitalize">{formattedLabel}</span>;
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
    <>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 overflow-hidden h-full relative">
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
                background-color: rgba(93, 110, 86, 0.15) !important; /* studio-green/15 */
                border-left: 4px solid #5d6e56 !important;
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
              onSelectEvent={handleSelectEvent} // Click Handler
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
                // Custom style for completed/paid appointments?
                if (event.type === 'appointment') {
                    const appt = event.resource as Appointment;
                    if (appt.status === 'completed') {
                         return {
                            className: 'event-completed',
                            style: {
                                backgroundColor: '#f0fdf4 !important', // green-50
                                borderLeft: '4px solid #16a34a !important', // green-600
                                color: '#14532d !important',
                                opacity: 0.7
                            }
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

    </>
  );
}
