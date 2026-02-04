"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMinutes,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarCheck,
  CalendarPlus,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Home,
  Hospital,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Sparkles,
  UserPlus,
  X,
  Building2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModuleHeader } from "./ui/module-header";
import { IconButton } from "./ui/buttons";
import {
  getDurationHeight,
  getOffsetForTime,
  getTimeRangeMinutes,
  type TimeGridConfig,
} from "../src/modules/agenda/time-grid";

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
  payment_status?: string | null;
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

interface SearchAppointmentResult {
  id: string;
  service_name: string;
  start_time: string;
  clients: { id: string; name: string; phone: string | null } | null;
}

interface SearchClientResult {
  id: string;
  name: string;
  phone: string | null;
}

interface SearchResults {
  appointments: SearchAppointmentResult[];
  clients: SearchClientResult[];
}

interface MobileAgendaProps {
  appointments: Appointment[];
  blocks: AvailabilityBlock[];
}

type AgendaView = "day" | "week" | "month";

type DayItem = {
  id: string;
  type: "appointment" | "block";
  start_time: string;
  finished_at: string | null;
  clientName: string;
  serviceName: string;
  status: string;
  payment_status?: string | null;
  is_home_visit: boolean | null;
  total_duration_minutes: number | null;
  phone?: string | null;
  address?: string | null;
};

const weekdayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];

export function MobileAgenda({ appointments, blocks }: MobileAgendaProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [headerCompact, setHeaderCompact] = useState(false);
  const initialView = useMemo<AgendaView>(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "week" || viewParam === "month" || viewParam === "day") {
      return viewParam;
    }
    return "day";
  }, [searchParams]);
  const initialDate = useMemo(() => {
    const dateParam = searchParams.get("date");
    if (!dateParam) return new Date();
    const parsed = parseISO(dateParam);
    return isValid(parsed) ? parsed : new Date();
  }, [searchParams]);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(initialDate));
  const [view, setView] = useState<AgendaView>(initialView);
  const [fabOpen, setFabOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState<"preview" | "full">("preview");
  const [searchResults, setSearchResults] = useState<SearchResults>({ appointments: [], clients: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => new Date().getFullYear());
  const daySliderRef = useRef<HTMLDivElement | null>(null);
  const lastSnapIndex = useRef(0);
  const isUserScrolling = useRef(false);
  const skipAutoScrollSync = useRef(false);
  const pendingViewRef = useRef<AgendaView | null>(null);
  const selectedDateRef = useRef<Date>(selectedDate);
  const scrollIdleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [now, setNow] = useState(() => new Date());
  const dragState = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    scrollLeft: number;
    mode: "x" | "y" | null;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    mode: null,
  });
  const timeGridConfig = useMemo<TimeGridConfig>(
    () => ({
      startHour: 6,
      endHour: 22,
      hourHeight: 72,
    }),
    []
  );
  const timelineHeight = useMemo(
    () => getTimeRangeMinutes(timeGridConfig) * (timeGridConfig.hourHeight / 60),
    [timeGridConfig]
  );
  const hours = useMemo(
    () =>
      Array.from(
        { length: timeGridConfig.endHour - timeGridConfig.startHour + 1 },
        (_, idx) => timeGridConfig.startHour + idx
      ),
    [timeGridConfig]
  );

  const monthDays = useMemo<Date[]>(
    () =>
      eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      }),
    [currentMonth]
  );

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((appt) => {
      const key = format(new Date(appt.start_time), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(appt);
      map.set(key, list);
    });
    return map;
  }, [appointments]);

  const syncViewToUrl = useCallback(
    (nextView: AgendaView, nextDate?: Date) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", nextView);
      const dateToUse = nextDate ?? selectedDate;
      params.set("date", format(dateToUse, "yyyy-MM-dd"));
      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, selectedDate]
  );

  const setViewAndSync = useCallback(
    (nextView: AgendaView, nextDate?: Date) => {
      pendingViewRef.current = nextView;
      setView(nextView);
      syncViewToUrl(nextView, nextDate);
    },
    [syncViewToUrl]
  );

  const blocksByDay = useMemo(() => {
    const map = new Map<string, AvailabilityBlock[]>();
    blocks.forEach((block) => {
      const key = format(new Date(block.start_time), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(block);
      map.set(key, list);
    });
    return map;
  }, [blocks]);

  useEffect(() => {
    if (view === "month") return;
    if (!isSameMonth(selectedDate, currentMonth)) {
      setCurrentMonth(startOfMonth(selectedDate));
    }
  }, [selectedDate, currentMonth, view]);

  useEffect(() => {
    setMonthPickerYear(currentMonth.getFullYear());
  }, [currentMonth]);

  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const parsed = parseISO(dateParam);
      if (isValid(parsed) && !isSameDay(parsed, selectedDateRef.current)) {
        setSelectedDate(parsed);
        setCurrentMonth(startOfMonth(parsed));
      }
    }
    const viewParam = searchParams.get("view");
    if (viewParam === "day" || viewParam === "week" || viewParam === "month") {
      if (pendingViewRef.current && viewParam !== pendingViewRef.current) {
        return;
      }
      if (viewParam !== view) {
        setView(viewParam);
      }
      if (pendingViewRef.current === viewParam) {
        pendingViewRef.current = null;
      }
    }
  }, [searchParams, view]);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    const container = document.querySelector("[data-shell-scroll]") as HTMLElement | null;
    if (!container) return;
    const handle = () => setHeaderCompact(container.scrollTop > 32);
    handle();
    container.addEventListener("scroll", handle, { passive: true });
    return () => container.removeEventListener("scroll", handle);
  }, []);

  useEffect(() => {
    if (!isSearchOpen) {
      setSearchMode("preview");
      setSearchResults({ appointments: [], clients: [] });
      return;
    }
    const query = searchTerm.trim();
    if (query.length < 3) {
      setSearchResults({ appointments: [], clients: [] });
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setIsSearching(true);
      try {
        const limit = searchMode === "full" ? 20 : 5;
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as SearchResults;
        setSearchResults({
          appointments: data.appointments ?? [],
          clients: data.clients ?? [],
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSearchResults({ appointments: [], clients: [] });
        }
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [searchTerm, isSearchOpen, searchMode]);

  const getDayData = (day: Date) => {
    const key = format(day, "yyyy-MM-dd");
    const dayAppointments = (appointmentsByDay.get(key) ?? []).slice().sort((a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    const dayBlocks = (blocksByDay.get(key) ?? []).slice().sort((a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const items: DayItem[] = [
      ...dayAppointments.map((appt) => ({
        id: appt.id,
        type: "appointment" as const,
        start_time: appt.start_time,
        finished_at: appt.finished_at,
        clientName: appt.clients?.name ?? "Cliente",
        serviceName: appt.service_name,
        status: appt.status,
        payment_status: appt.payment_status ?? null,
        is_home_visit: appt.is_home_visit ?? false,
        total_duration_minutes: appt.total_duration_minutes ?? null,
        phone: appt.clients?.phone ?? null,
        address: appt.clients?.endereco_completo ?? null,
      })),
      ...dayBlocks.map((block) => ({
        id: block.id,
        type: "block" as const,
        start_time: block.start_time,
        finished_at: block.end_time,
        clientName: block.title,
        serviceName: "Plantão",
        status: "blocked",
        payment_status: null,
        is_home_visit: false,
        total_duration_minutes: null,
      })),
    ].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return { dayAppointments, dayBlocks, items };
  };

  const scrollToDate = useCallback(
    (date: Date) => {
      if (!daySliderRef.current) return;
      const index = monthDays.findIndex((day) => isSameDay(day, date));
      if (index < 0) return;
      const width = daySliderRef.current.clientWidth;
      daySliderRef.current.scrollTo({ left: width * index, behavior: "smooth" });
      lastSnapIndex.current = index;
    },
    [monthDays]
  );

  useEffect(() => {
    if (view !== "day") return;
    if (skipAutoScrollSync.current) {
      skipAutoScrollSync.current = false;
      return;
    }
    if (isUserScrolling.current) return;
    scrollToDate(selectedDate);
  }, [selectedDate, view, scrollToDate]);

  useEffect(() => {
    if (view !== "day") return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const delay = 60000 - (Date.now() % 60000);
    const timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60000);
    }, delay);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [view]);

  const handleDayScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    isUserScrolling.current = true;
    if (scrollIdleTimeout.current) {
      clearTimeout(scrollIdleTimeout.current);
    }
    scrollIdleTimeout.current = setTimeout(() => {
      const width = container.clientWidth || 1;
      const index = Math.round(container.scrollLeft / width);
      if (index === lastSnapIndex.current) {
        isUserScrolling.current = false;
        return;
      }
      const nextDay = monthDays[index];
      if (!nextDay) {
        isUserScrolling.current = false;
        return;
      }
      lastSnapIndex.current = index;
      if (!isSameDay(nextDay, selectedDate)) {
        skipAutoScrollSync.current = true;
        setSelectedDate(nextDay);
      }
      isUserScrolling.current = false;
    }, 120);
  };

  const handleGoToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(startOfMonth(today));
    setViewAndSync("day", today);
  };

  const monthLabels = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        format(new Date(2024, index, 1), "MMM", { locale: ptBR }).toUpperCase()
      ),
    []
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const monthGridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "";
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!remainder) return `${hours}h`;
    return `${hours}h ${remainder}m`;
  };

  const getStatusLabel = (item: DayItem) => {
    if (item.status === "completed") {
      return item.payment_status === "paid" ? "Concluído e pago" : "Concluído pendente";
    }
    if (item.status === "confirmed" || item.status === "in_progress") {
      return "Confirmado";
    }
    if (item.status === "pending") return "Agendado";
    return "Agendado";
  };

  const getStatusTone = (label: string) => {
    if (label === "Concluído e pago") return "bg-green-100 text-green-700";
    if (label === "Concluído pendente") return "bg-orange-100 text-orange-700";
    if (label === "Confirmado") return "bg-studio-green/10 text-studio-green";
    return "bg-studio-light text-studio-text";
  };

  const toWhatsappLink = (phone?: string | null) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (!digits) return null;
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    return `https://wa.me/${withCountry}`;
  };

  return (
    <div className="bg-studio-bg min-h-full flex flex-col relative -mx-4">
      <div className="relative z-30">
        <ModuleHeader
          kicker="Olá, Janaina"
          title={
            <div className="flex items-center gap-2">
              <span>Sua Agenda de</span>
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen((prev) => !prev)}
                className="text-studio-green border-b-2 border-studio-green/20 hover:border-studio-green transition capitalize"
              >
                {format(currentMonth, "MMMM", { locale: ptBR })}
              </button>
            </div>
          }
          rightSlot={
            <IconButton
              size="sm"
              icon={<Search className="w-4 h-4" />}
              aria-label="Buscar"
              onClick={() => {
                setSearchMode("preview");
                setIsSearchOpen(true);
              }}
            />
          }
          bottomSlot={
            <div className="bg-studio-light p-1 rounded-2xl flex justify-between border border-line">
              <button
                type="button"
                onClick={() => setViewAndSync("day")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  view === "day" ? "bg-white text-studio-green shadow-soft" : "text-muted hover:text-studio-green"
                }`}
              >
                DIA
              </button>
              <button
                type="button"
                onClick={() => setViewAndSync("week")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  view === "week" ? "bg-white text-studio-green shadow-soft" : "text-muted hover:text-studio-green"
                }`}
              >
                SEMANA
              </button>
              <button
                type="button"
                onClick={() => setViewAndSync("month")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  view === "month" ? "bg-white text-studio-green shadow-soft" : "text-muted hover:text-studio-green"
                }`}
              >
                MÊS
              </button>
            </div>
          }
          compact={headerCompact}
          className={`${headerCompact ? "min-h-[120px]" : "min-h-[150px]"}`}
        />

        {isMonthPickerOpen && (
          <div className="absolute left-6 right-6 top-full mt-2 bg-white rounded-2xl shadow-float border border-line p-4 z-50 pointer-events-auto">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setMonthPickerYear((prev) => prev - 1)}
                className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-sm font-extrabold text-studio-text">{monthPickerYear}</div>
              <button
                type="button"
                onClick={() => setMonthPickerYear((prev) => prev + 1)}
                className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {monthLabels.map((label, index) => {
                const isActive =
                  monthPickerYear === currentMonth.getFullYear() && index === currentMonth.getMonth();
                return (
                  <button
                    key={`${label}-${index}`}
                    type="button"
                    onClick={() => {
                      const next = new Date(monthPickerYear, index, 1);
                      setCurrentMonth(startOfMonth(next));
                      setSelectedDate(next);
                      setViewAndSync(view, next);
                      setIsMonthPickerOpen(false);
                    }}
                    className={`py-2 rounded-xl text-xs font-extrabold transition ${
                      isActive
                        ? "bg-studio-green text-white shadow-soft"
                        : "bg-studio-light text-muted hover:text-studio-green hover:bg-studio-green/10"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-studio-bg">
        <section className={`${view === "day" ? "block" : "hidden"} h-full`}>
          <div
            ref={daySliderRef}
            onScroll={handleDayScroll}
            onPointerDown={(event) => {
              if (event.pointerType !== "mouse") return;
              if (!daySliderRef.current) return;
              dragState.current = {
                active: true,
                startX: event.clientX,
                startY: event.clientY,
                scrollLeft: daySliderRef.current.scrollLeft,
                mode: null,
              };
              daySliderRef.current.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (event.pointerType !== "mouse") return;
              if (!dragState.current.active || !daySliderRef.current) return;
              const dx = event.clientX - dragState.current.startX;
              const dy = event.clientY - dragState.current.startY;
              if (!dragState.current.mode) {
                if (Math.abs(dx) > Math.abs(dy) + 4) {
                  dragState.current.mode = "x";
                } else if (Math.abs(dy) > Math.abs(dx) + 4) {
                  dragState.current.mode = "y";
                }
              }
              if (dragState.current.mode === "x") {
                event.preventDefault();
                daySliderRef.current.scrollLeft = dragState.current.scrollLeft - dx;
              }
            }}
            onPointerUp={(event) => {
              if (event.pointerType !== "mouse") return;
              dragState.current.active = false;
              dragState.current.mode = null;
              daySliderRef.current?.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => {
              dragState.current.active = false;
              dragState.current.mode = null;
            }}
            className="flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {monthDays.map((day) => {
              const { dayAppointments, dayBlocks, items } = getDayData(day);
              const appointmentCount = dayAppointments.length;
              const homeCount = dayAppointments.filter((appt) => appt.is_home_visit).length;
              const blockCount = dayBlocks.length;
              const nowOffset = isToday(day) ? getOffsetForTime(now, timeGridConfig) : null;

              return (
                <div
                  key={day.toISOString()}
                  data-date={format(day, "yyyy-MM-dd")}
                  className="min-w-full h-full snap-center overflow-y-auto px-6 pb-0 pt-5"
                >
                  <div className="text-center mb-5">
                    <h2
                      className={`text-[10px] font-extrabold uppercase tracking-widest mb-0.5 capitalize ${
                        isToday(day) ? "text-studio-green" : "text-muted"
                      }`}
                    >
                      {format(day, "EEEE", { locale: ptBR })}
                    </h2>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-3xl font-serif text-studio-text capitalize">
                        {format(day, "dd MMM", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
                      {isToday(day) && (
                        <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-studio-green/10 text-studio-green">
                          Hoje
                        </span>
                      )}
                      {appointmentCount > 0 && (
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-studio-green/10 text-studio-green">
                          <Sparkles className="w-3 h-3" /> {appointmentCount} atendimentos
                        </span>
                      )}
                      {homeCount > 0 && (
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-purple-50 text-purple-700">
                          <Home className="w-3 h-3" /> {homeCount} domicílio
                        </span>
                      )}
                      {appointmentCount === 0 && blockCount > 0 && (
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-red-100 text-red-600">
                          <Hospital className="w-3 h-3" /> Bloqueado
                        </span>
                      )}
                      {appointmentCount === 0 && blockCount === 0 && (
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-studio-light text-muted">
                          Agenda livre
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end mb-2">
                    <button
                      type="button"
                      onClick={handleGoToToday}
                      className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-studio-light text-studio-green hover:bg-studio-green hover:text-white transition"
                    >
                      Hoje
                    </button>
                  </div>

                  {items.length > 0 ? (
                    <div className="grid grid-cols-[56px_1fr] gap-4">
                      <div className="flex flex-col items-end text-xs text-muted font-semibold">
                        {hours.map((hour) => (
                          <div
                            key={hour}
                            style={{ height: timeGridConfig.hourHeight }}
                            className="flex items-start justify-end w-full"
                          >
                            {String(hour).padStart(2, "0")}:00
                          </div>
                        ))}
                      </div>
                      <div
                        className="relative"
                        style={{
                          height: (() => {
                            let lastBottom = 0;
                            items.forEach((item) => {
                              const startTimeDate = new Date(item.start_time);
                              const top = getOffsetForTime(startTimeDate, timeGridConfig);
                              if (top === null) return;
                              let durationMinutes = item.total_duration_minutes ?? 60;
                              if (item.finished_at) {
                                durationMinutes = Math.max(
                                  15,
                                  Math.round(
                                    (new Date(item.finished_at).getTime() - startTimeDate.getTime()) / 60000
                                  )
                                );
                              }
                              const height = Math.max(getDurationHeight(durationMinutes, timeGridConfig), 96);
                              const nextTop = top < lastBottom + 12 ? lastBottom + 12 : top;
                              lastBottom = nextTop + height;
                            });
                            return Math.max(timelineHeight, lastBottom + 16);
                          })(),
                        }}
                      >
                        {hours.map((hour, index) => (
                          <div
                            key={hour}
                            className="absolute left-0 right-0 border-t border-line/60"
                            style={{ top: index * timeGridConfig.hourHeight }}
                          />
                        ))}

                        {nowOffset !== null && (
                          <div
                            className="absolute left-0 right-0 flex items-center gap-2 z-20"
                            style={{ top: nowOffset }}
                          >
                            <span className="text-[11px] font-extrabold text-danger w-12 text-right">
                              {format(now, "HH:mm")}
                            </span>
                            <div className="flex-1 h-px bg-danger/70 relative">
                              <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-danger"></div>
                            </div>
                          </div>
                        )}

                        {(() => {
                          let lastBottom = 0;
                          return items.map((item) => {
                            const startTimeDate = new Date(item.start_time);
                            const startLabel = format(startTimeDate, "HH:mm");
                            let endLabel = "";
                            let durationMinutes = item.total_duration_minutes ?? 60;
                            if (item.finished_at) {
                              endLabel = format(new Date(item.finished_at), "HH:mm");
                              durationMinutes = Math.max(
                                15,
                                Math.round(
                                  (new Date(item.finished_at).getTime() - startTimeDate.getTime()) / 60000
                                )
                              );
                            } else if (item.total_duration_minutes) {
                              endLabel = format(addMinutes(startTimeDate, item.total_duration_minutes), "HH:mm");
                            }

                            const topRaw = getOffsetForTime(startTimeDate, timeGridConfig);
                            if (topRaw === null) return null;
                            const height = Math.max(getDurationHeight(durationMinutes, timeGridConfig), 96);
                            const top = topRaw < lastBottom + 12 ? lastBottom + 12 : topRaw;
                            lastBottom = top + height;
                            const isBlock = item.type === "block";
                            const isHomeVisit = item.is_home_visit;

                            return (
                              <div
                                key={item.id}
                                className="absolute left-0 right-0 pr-2"
                                style={{ top, height, minHeight: 96 }}
                              >
                                {isBlock ? (
                                  <div className="h-full bg-white p-4 rounded-3xl shadow-soft border-l-4 border-red-400 flex flex-col justify-between overflow-hidden">
                                    <div className="flex justify-between items-start mb-1">
                                      <h3 className="font-extrabold text-studio-text text-sm leading-tight line-clamp-1">
                                        {item.clientName}
                                      </h3>
                                      <div className="w-7 h-7 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                                        <Hospital className="w-3.5 h-3.5" />
                                      </div>
                                    </div>
                                    <p className="text-xs text-muted line-clamp-1">{item.serviceName}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-red-100 text-red-600">
                                        Bloqueado
                                      </span>
                                      {endLabel && <span className="text-[11px] text-muted">Até {endLabel}</span>}
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/atendimento/${item.id}`)}
                                    className={`h-full w-full text-left bg-white p-4 rounded-3xl shadow-soft border-l-4 transition group active:scale-[0.99] relative overflow-hidden ${
                                      isHomeVisit ? "border-purple-500" : "border-studio-green"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="min-w-0">
                                        <h3 className="font-extrabold text-studio-text text-sm leading-tight line-clamp-1">
                                          {item.clientName}
                                        </h3>
                                        <p className="text-xs text-muted line-clamp-1">
                                          {item.serviceName}
                                          {item.total_duration_minutes
                                            ? ` (${formatDuration(item.total_duration_minutes)})`
                                            : ""}
                                        </p>
                                      </div>
                                      <span
                                        className={`text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full ${
                                          isHomeVisit
                                            ? "bg-purple-100 text-purple-700"
                                            : "bg-green-100 text-green-700"
                                        }`}
                                      >
                                        {isHomeVisit ? "Domicílio" : "Estúdio"}
                                      </span>
                                    </div>

                                    <div className="mt-3 border-t border-line pt-2 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 text-[11px] text-muted flex-wrap">
                                        <span
                                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.08em] px-2 py-1 rounded-full ${getStatusTone(
                                            getStatusLabel(item)
                                          )}`}
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-current inline-block"></span>
                                          {getStatusLabel(item)}
                                        </span>
                                        <span className="font-semibold">
                                          {startLabel}
                                          {endLabel ? ` – ${endLabel}` : ""}
                                        </span>
                                        {item.phone && (
                                          <span className="inline-flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {item.phone}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {toWhatsappLink(item.phone) && (
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              window.open(toWhatsappLink(item.phone) ?? "", "_blank");
                                            }}
                                            className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center"
                                            aria-label="Abrir WhatsApp"
                                          >
                                          <MessageCircle className="w-4 h-4" />
                                          </button>
                                        )}
                                        {isHomeVisit && item.address && (
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              const mapsQuery = encodeURIComponent(item.address ?? "");
                                              window.open(
                                                `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
                                                "_blank"
                                              );
                                            }}
                                            className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center"
                                            aria-label="Abrir GPS"
                                          >
                                            <MapPin className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                      <div className="w-16 h-16 bg-white border-2 border-dashed border-line rounded-full flex items-center justify-center mb-4 text-muted">
                        <Sparkles size={28} />
                      </div>
                      <h3 className="text-muted font-bold text-sm">Agenda Livre</h3>
                      <p className="text-xs text-muted mt-1">Nenhum agendamento para este dia.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section
          className={`${view === "week" ? "block" : "hidden"} h-full overflow-y-auto p-6 pb-0 animate-in fade-in`}
        >
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-extrabold text-studio-text capitalize">
              {weekDays.length > 0 ? (() => {
                const startOfWeek = weekDays[0];
                const endOfWeek = weekDays[weekDays.length - 1];
                return startOfWeek && endOfWeek
                  ? `${format(startOfWeek, "dd MMM", { locale: ptBR })} - ${format(endOfWeek, "dd MMM", { locale: ptBR })}`
                  : "";
              })() : ""}
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {weekDays.map((day) => {
              const { dayAppointments, dayBlocks } = getDayData(day);
              const hasAppointments = dayAppointments.length > 0;
              const hasBlocks = dayBlocks.length > 0;

              if (hasAppointments) {
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day);
                      setViewAndSync("day", day);
                      setIsMonthPickerOpen(false);
                    }}
                    className="bg-white p-4 rounded-3xl border-l-4 border-studio-green shadow-soft text-left active:scale-[0.99] transition"
                  >
                    <div className="flex justify-between border-b border-line pb-2 mb-2">
                      <span className="font-extrabold text-studio-text capitalize">
                        {format(day, "EEE, dd", { locale: ptBR })}
                      </span>
                      <span className="text-xs font-extrabold bg-studio-green/10 text-studio-green px-2 rounded-full">
                        {dayAppointments.length} atendimentos
                      </span>
                    </div>
                    <div className="space-y-2">
                      {dayAppointments.slice(0, 3).map((appt) => (
                        <div key={appt.id} className="flex justify-between text-sm">
                          <span className="text-muted">
                            {format(new Date(appt.start_time), "HH:mm")}
                          </span>
                          <span className="font-bold">
                            {appt.clients?.name ?? "Cliente"}
                            {appt.is_home_visit ? " (Dom)" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              }

              if (hasBlocks) {
                return (
                  <div key={day.toISOString()} className="bg-white p-4 rounded-3xl border-l-4 border-red-400 shadow-soft opacity-90">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-studio-text capitalize">
                        {format(day, "EEE, dd", { locale: ptBR })}
                      </span>
                      <span className="text-xs font-extrabold bg-red-100 text-danger px-2 py-1 rounded-full flex items-center gap-1">
                        <Hospital className="w-3 h-3" /> PLANTÃO
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-2">Bloqueado para agendamento online.</p>
                  </div>
                );
              }

              return (
                <div key={day.toISOString()} className="bg-studio-light p-4 rounded-3xl border border-dashed border-line text-center">
                  <span className="font-extrabold text-muted capitalize">
                    {format(day, "EEE, dd", { locale: ptBR })}
                  </span>
                  <p className="text-xs text-muted">Agenda livre</p>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className={`${view === "month" ? "block" : "hidden"} h-full overflow-y-auto p-6 pb-0 animate-in fade-in`}
        >
          <div className="bg-white rounded-3xl shadow-soft p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-extrabold text-studio-text capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                  className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {weekdayLabels.map((label, index) => (
                <div key={`${label}-${index}`} className="text-[10px] font-extrabold text-muted uppercase">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-4 gap-x-1 text-center text-sm">
              {monthGridDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayAppointments = appointmentsByDay.get(key) ?? [];
                const dayBlocks = blocksByDay.get(key) ?? [];
                const hasHome = dayAppointments.some((appt) => appt.is_home_visit);
                const isCurrent = isSameMonth(day, currentMonth);
                const isDayToday = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day);
                      setViewAndSync("day", day);
                    }}
                    className="relative flex flex-col items-center"
                  >
                    <span
                      className={`w-8 h-8 flex items-center justify-center rounded-full font-extrabold transition ${
                        isDayToday
                          ? "bg-studio-green text-white shadow-soft"
                          : isCurrent
                            ? "text-studio-text"
                            : "text-muted/60"
                      }`}
                    >
                      {format(day, "dd")}
                    </span>
                    <div className="absolute -bottom-2 flex items-center gap-1">
                      {dayAppointments.length > 0 && <span className="w-1.5 h-1.5 bg-studio-green rounded-full" />}
                      {dayBlocks.length > 0 && <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />}
                      {hasHome && <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 p-3 rounded-2xl bg-studio-light text-studio-green text-xs">
              <span className="font-extrabold">Legenda:</span>
              <span className="ml-2 inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-studio-green inline-block"></span> atendimentos
              </span>
              <span className="ml-2 inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span> domicílio
              </span>
              <span className="ml-2 inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span> bloqueio
              </span>
            </div>
          </div>
        </section>
      </main>

      {isSearchOpen && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center p-6">
          <div className="bg-white w-full max-h-[80vh] rounded-3xl shadow-float overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white px-6 pt-5 pb-4 shadow-soft z-10">
              <div className="flex items-center gap-3">
                <IconButton
                  size="sm"
                  icon={<ChevronLeft className="w-4 h-4" />}
                  aria-label="Voltar"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchTerm("");
                  }}
                />
                <Search className="w-4 h-4 text-muted" />
                <input
                  autoFocus
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar em tudo..."
                  className="flex-1 bg-transparent text-sm text-studio-text placeholder:text-muted focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSearchMode("full")}
                  className="text-xs font-extrabold text-studio-green px-3 py-1.5 rounded-full bg-studio-light"
                >
                  Buscar
                </button>
              </div>
              <p className="text-[11px] text-muted mt-2">Digite ao menos 3 letras para ver resultados.</p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8">
              {isSearching && (
                <div className="py-6 text-xs text-muted">Buscando...</div>
              )}

              {!isSearching && searchTerm.trim().length < 3 && (
                <div className="py-10 text-center text-xs text-muted">Digite para começar a buscar.</div>
              )}

              {!isSearching && searchTerm.trim().length >= 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-studio-green">
                      Agenda
                    </h3>
                    <div className="mt-2 space-y-2">
                      {searchResults.appointments.length === 0 && (
                        <p className="text-xs text-muted">Nenhum atendimento encontrado.</p>
                      )}
                      {searchResults.appointments.map((item) => {
                        const when = format(new Date(item.start_time), "dd MMM • HH:mm", { locale: ptBR });
                        const clientName = item.clients?.name ?? "Cliente";
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchTerm("");
                              router.push(`/atendimento/${item.id}`);
                            }}
                            className="w-full text-left bg-paper rounded-2xl px-4 py-3 border border-line hover:bg-studio-light transition"
                          >
                            <div className="text-sm font-extrabold text-studio-text">{clientName}</div>
                            <div className="text-xs text-muted">{item.service_name} • {when}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-studio-green">
                      Clientes
                    </h3>
                    <div className="mt-2 space-y-2">
                      {searchResults.clients.length === 0 && (
                        <p className="text-xs text-muted">Nenhum cliente encontrado.</p>
                      )}
                      {searchResults.clients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setIsSearchOpen(false);
                            setSearchTerm("");
                            router.push(`/clientes/${client.id}`);
                          }}
                          className="w-full text-left bg-paper rounded-2xl px-4 py-3 border border-line hover:bg-studio-light transition"
                        >
                          <div className="text-sm font-extrabold text-studio-text">{client.name}</div>
                          {client.phone && <div className="text-xs text-muted">{client.phone}</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="absolute right-6 z-40 flex flex-col items-end gap-3"
        style={{ bottom: "calc(48px + env(safe-area-inset-bottom) + 10px)" }}
      >
        <div
          className={`flex flex-col items-end gap-3 transition-all duration-200 ${
            fabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <button
            onClick={() => {
              setFabOpen(false);
              router.push("/clientes/novo");
            }}
            className="group flex items-center gap-3 pl-4 pr-2 py-2 bg-white rounded-full shadow-float border border-line hover:bg-studio-green/10 transition"
            type="button"
          >
            <span className="text-sm font-extrabold text-studio-text">Novo Cliente</span>
            <div className="w-10 h-10 bg-studio-light text-studio-green rounded-full flex items-center justify-center group-hover:bg-studio-green group-hover:text-white transition">
              <UserPlus className="w-5 h-5" />
            </div>
          </button>

          <button
            onClick={() => {
              setFabOpen(false);
              router.push("/bloqueios");
            }}
            className="group flex items-center gap-3 pl-4 pr-2 py-2 bg-white rounded-full shadow-float border border-line hover:bg-red-50 transition"
            type="button"
          >
            <span className="text-sm font-extrabold text-studio-text">Bloquear Plantão</span>
            <div className="w-10 h-10 bg-red-100 text-red-500 rounded-full flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition">
              <Hospital className="w-5 h-5" />
            </div>
          </button>

          <button
            onClick={() => {
              setFabOpen(false);
              const dateParam = format(selectedDate, "yyyy-MM-dd");
              const returnTo = `/?view=${view}&date=${dateParam}`;
              router.push(`/novo?date=${dateParam}&returnTo=${encodeURIComponent(returnTo)}`);
            }}
            className="group flex items-center gap-3 pl-4 pr-2 py-2 bg-white rounded-full shadow-float border border-line hover:bg-studio-green/10 transition"
            type="button"
          >
            <span className="text-sm font-extrabold text-studio-text">Novo Agendamento</span>
            <div className="w-10 h-10 bg-studio-bg text-studio-green rounded-full flex items-center justify-center group-hover:bg-studio-green group-hover:text-white transition">
              <CalendarPlus className="w-5 h-5" />
            </div>
          </button>
        </div>

        <button
          onClick={() => setFabOpen((prev) => !prev)}
          className="w-11 h-11 bg-studio-green text-white rounded-full shadow-xl shadow-green-100 flex items-center justify-center z-50 hover:scale-105 transition active:scale-95"
          type="button"
        >
          {fabOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
