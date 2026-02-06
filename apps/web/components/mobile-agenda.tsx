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
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Home,
  Hospital,
  Search,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModuleHeader } from "./ui/module-header";
import { ModulePage } from "./ui/module-page";
import { FloatingActionMenu } from "./ui/floating-action-menu";
import { IconButton } from "./ui/buttons";
import { Toast, useToast } from "./ui/toast";
import { AppointmentCard } from "./agenda/appointment-card";
import {
  AgendaSearchModal,
  type SearchAppointmentResult,
  type SearchClientResult,
  type SearchResults,
} from "./agenda/agenda-search-modal";
import { cancelAppointment } from "../app/actions";
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
  service_duration_minutes?: number | null;
  buffer_before_minutes?: number | null;
  buffer_after_minutes?: number | null;
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

type AgendaView = "day" | "week" | "month";

type DayItem = {
  id: string;
  type: "appointment" | "block";
  start_time: string;
  finished_at: string | null;
  service_duration_minutes: number | null;
  buffer_before_minutes: number | null;
  buffer_after_minutes: number | null;
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
  const [isOnline, setIsOnline] = useState(true);
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
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState<"preview" | "full">("preview");
  const [searchResults, setSearchResults] = useState<SearchResults>({ appointments: [], clients: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [loadingAppointmentId, setLoadingAppointmentId] = useState<string | null>(null);
  const [actionSheet, setActionSheet] = useState<{
    id: string;
    clientName: string;
    serviceName: string;
    startTime: string;
    returnTo: string;
  } | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => new Date().getFullYear());
  const { toast, showToast } = useToast();
  const daySliderRef = useRef<HTMLDivElement | null>(null);
  const lastSnapIndex = useRef(0);
  const isUserScrolling = useRef(false);
  const skipAutoScrollSync = useRef(false);
  const pendingViewRef = useRef<AgendaView | null>(null);
  const selectedDateRef = useRef<Date>(selectedDate);
  const scrollIdleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [now, setNow] = useState(() => new Date());
  const timeGridConfig = useMemo<TimeGridConfig>(
    () => ({
      startHour: 6,
      endHour: 22,
      hourHeight: 24,
    }),
    []
  );
  const slotHeight = timeGridConfig.hourHeight / 2;
  const pxPerMinute = timeGridConfig.hourHeight / 60;
  const timeSlots = useMemo(() => {
    const slots: { key: string; label: string; isHalf: boolean; minutes: number }[] = [];
    for (let hour = timeGridConfig.startHour; hour <= timeGridConfig.endHour; hour += 1) {
      const hourLabel = String(hour).padStart(2, "0");
      const minutesFromStart = (hour - timeGridConfig.startHour) * 60;
      slots.push({ key: `${hourLabel}:00`, label: `${hourLabel}:00`, isHalf: false, minutes: minutesFromStart });
      if (hour < timeGridConfig.endHour) {
        slots.push({
          key: `${hourLabel}:30`,
          label: "30",
          isHalf: true,
          minutes: minutesFromStart + 30,
        });
      }
    }
    return slots;
  }, [timeGridConfig]);
  const timelineHeight = useMemo(
    () => getTimeRangeMinutes(timeGridConfig) * pxPerMinute,
    [timeGridConfig, pxPerMinute]
  );

  const parseDate = useCallback((value: string) => {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : new Date(value);
  }, []);

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
      const key = format(parseDate(appt.start_time), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(appt);
      map.set(key, list);
    });
    return map;
  }, [appointments, parseDate]);

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
      const key = format(parseDate(block.start_time), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(block);
      map.set(key, list);
    });
    return map;
  }, [blocks, parseDate]);

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
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
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

  useEffect(() => {
    if (searchParams.get("created") !== "1") return;
    showToast("Agendamento criado com sucesso.", "success");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("created");
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [searchParams, router, showToast]);

  const getDayData = (day: Date) => {
    const key = format(day, "yyyy-MM-dd");
    const dayAppointments = (appointmentsByDay.get(key) ?? []).slice().sort((a, b) =>
      parseDate(a.start_time).getTime() - parseDate(b.start_time).getTime()
    );
    const dayBlocks = (blocksByDay.get(key) ?? []).slice().sort((a, b) =>
      parseDate(a.start_time).getTime() - parseDate(b.start_time).getTime()
    );

    const items: DayItem[] = [
      ...dayAppointments.map((appt) => ({
        id: appt.id,
        type: "appointment" as const,
        start_time: appt.start_time,
        finished_at: appt.finished_at,
        service_duration_minutes: appt.service_duration_minutes ?? null,
        buffer_before_minutes: appt.buffer_before_minutes ?? null,
        buffer_after_minutes: appt.buffer_after_minutes ?? null,
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
        service_duration_minutes: null,
        buffer_before_minutes: null,
        buffer_after_minutes: null,
        clientName: block.title,
        serviceName: "Plantão",
        status: "blocked",
        payment_status: null,
        is_home_visit: false,
        total_duration_minutes: null,
      })),
    ].sort((a, b) => parseDate(a.start_time).getTime() - parseDate(b.start_time).getTime());

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
      const targetLeft = index * width;
      if (Math.abs(container.scrollLeft - targetLeft) > 2) {
        container.scrollTo({ left: targetLeft, behavior: "smooth" });
      }
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
    isUserScrolling.current = false;
    skipAutoScrollSync.current = false;
    setSelectedDate(today);
    setCurrentMonth(startOfMonth(today));
    setViewAndSync("day", today);
    setIsMonthPickerOpen(false);
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

  const getServiceDuration = (item: DayItem) => {
    if (item.finished_at) {
      const startTime = parseDate(item.start_time);
      const endTime = parseDate(item.finished_at);
      const diffMinutes = Math.max(15, Math.round((endTime.getTime() - startTime.getTime()) / 60000));
      return diffMinutes;
    }
    if (item.service_duration_minutes) return item.service_duration_minutes;
    if (item.total_duration_minutes) {
      const bufferBefore = item.buffer_before_minutes ?? 0;
      const bufferAfter = item.buffer_after_minutes ?? 0;
      const serviceMinutes = item.total_duration_minutes - bufferBefore - bufferAfter;
      return serviceMinutes > 0 ? serviceMinutes : item.total_duration_minutes;
    }
    return 60;
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
    <>
      <Toast toast={toast} />
      <ModulePage
        header={
          <>
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
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}
                    aria-label={isOnline ? "Conectado" : "Sem conexão"}
                    title={isOnline ? "Conectado" : "Sem conexão"}
                  />
                  <IconButton
                    size="sm"
                    icon={<Search className="w-4 h-4" />}
                    aria-label="Buscar"
                    onClick={() => {
                      setSearchMode("preview");
                      setIsSearchOpen(true);
                    }}
                  />
                </div>
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
          </>
        }
        contentClassName="relative"
      >
        <main className="relative bg-studio-bg overflow-x-hidden">
        <section className={`${view === "day" ? "flex" : "hidden"} flex-col`}>
          <div
            ref={daySliderRef}
            onScroll={handleDayScroll}
            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
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
                  className="min-w-full snap-center px-6 pb-0 pt-5 flex flex-col"
                  style={{ scrollSnapStop: "always" }}
                >
                  <div className="text-center mb-5">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="w-10" aria-hidden="true"></div>
                      <h2
                        className={`text-[10px] font-extrabold uppercase tracking-widest capitalize ${
                          isToday(day) ? "text-studio-green" : "text-muted"
                        }`}
                      >
                        {format(day, "EEEE", { locale: ptBR })}
                      </h2>
                      <button
                        type="button"
                        onClick={handleGoToToday}
                        className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-studio-light text-studio-green hover:bg-studio-green hover:text-white transition"
                      >
                        Hoje
                      </button>
                    </div>
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

                  {items.length > 0 ? (
                    <div className="grid grid-cols-[72px_1fr] gap-4">
                      <div className="flex flex-col items-end text-xs text-muted font-semibold">
                        {timeSlots.map((slot) => (
                          <div
                            key={slot.key}
                            style={{ height: slotHeight }}
                            className={`flex items-start justify-end w-full ${
                              slot.isHalf ? "text-[10px] text-muted/60 pr-2" : "pr-1"
                            }`}
                          >
                            {slot.label}
                          </div>
                        ))}
                      </div>
                      <div
                        className="relative"
                        style={{
                          height: (() => {
                            const maxBottom = items.reduce((max, item) => {
                              const startTimeDate = parseDate(item.start_time);
                              const durationMinutes = getServiceDuration(item);
                              const bufferAfter = item.buffer_after_minutes ?? 0;
                              const endTimeDate = addMinutes(startTimeDate, durationMinutes + bufferAfter);
                              const endOffset = getOffsetForTime(endTimeDate, timeGridConfig);
                              if (endOffset === null) return max;
                              return Math.max(max, endOffset);
                            }, 0);
                            return Math.max(timelineHeight, maxBottom + 16);
                          })(),
                        }}
                      >
                        {timeSlots.map((slot, index) => (
                          <div
                            key={slot.key}
                            className={`absolute border-t pointer-events-none ${
                              slot.isHalf ? "border-line/30" : "border-line/60"
                            }`}
                            style={{
                              top: index * slotHeight,
                              left: slot.isHalf ? 12 : 0,
                              right: 0,
                            }}
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

                        {items.map((item) => {
                          const startTimeDate = parseDate(item.start_time);
                          const startLabel = format(startTimeDate, "HH:mm");
                          const isBlock = item.type === "block";
                          const isHomeVisit = item.is_home_visit;
                          const durationMinutes = getServiceDuration(item);
                          const bufferBefore = item.buffer_before_minutes ?? 0;
                          const bufferAfter = item.buffer_after_minutes ?? 0;
                          const apptHeight = getDurationHeight(durationMinutes, timeGridConfig);
                          const rawPreHeight =
                            bufferBefore > 0 ? getDurationHeight(bufferBefore, timeGridConfig) : 0;
                          const postHeight =
                            bufferAfter > 0 ? getDurationHeight(bufferAfter, timeGridConfig) : 0;

                          let endLabel = "";
                          if (item.finished_at) {
                            endLabel = format(parseDate(item.finished_at), "HH:mm");
                          } else if (durationMinutes) {
                            endLabel = format(addMinutes(startTimeDate, durationMinutes), "HH:mm");
                          }

                          const top = getOffsetForTime(startTimeDate, timeGridConfig);
                          if (top === null) return null;
                          const preHeight = rawPreHeight > 0 ? Math.min(rawPreHeight, top) : 0;
                          const wrapperTop = top - preHeight;
                          const wrapperHeight = preHeight + apptHeight + postHeight;

                          const returnTo = `/?view=day&date=${format(day, "yyyy-MM-dd")}`;

                          return (
                            <div
                              key={item.id}
                              className="absolute left-0 right-0 pr-2 pointer-events-auto"
                              style={{ top: wrapperTop, height: wrapperHeight }}
                            >
                              {isBlock ? (
                                <div className="h-full bg-white p-3.5 rounded-3xl shadow-soft border-l-4 border-red-400 flex flex-col justify-between overflow-hidden">
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
                                <div className="h-full flex flex-col">
                                  {preHeight > 0 && (
                                    <div className="pointer-events-none relative" style={{ height: preHeight }}>
                                      <div className="absolute inset-x-2 top-1 h-1.5 rounded-full bg-slate-200/80" />
                                      <div className="absolute left-2 top-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                        Buffer Pré + {formatDuration(bufferBefore)}
                                      </div>
                                    </div>
                                  )}

                                  <div style={{ height: apptHeight }}>
                                    <AppointmentCard
                                      data-card
                                      name={item.clientName}
                                      service={item.serviceName}
                                      durationLabel={durationMinutes ? formatDuration(durationMinutes) : null}
                                      statusLabel={getStatusLabel(item)}
                                      statusTone={getStatusTone(getStatusLabel(item))}
                                      startLabel={startLabel}
                                      endLabel={endLabel}
                                      phone={item.phone}
                                      isHomeVisit={!!isHomeVisit}
                                      loading={loadingAppointmentId === item.id}
                                      onOpen={() =>
                                        (() => {
                                          setLoadingAppointmentId(item.id);
                                          setTimeout(() => setLoadingAppointmentId(null), 2000);
                                          router.push(
                                            `/atendimento/${item.id}?return=${encodeURIComponent(returnTo)}`
                                          );
                                        })()
                                      }
                                      onLongPress={() => {
                                        setActionSheet({
                                          id: item.id,
                                          clientName: item.clientName,
                                          serviceName: item.serviceName,
                                          startTime: item.start_time,
                                          returnTo,
                                        });
                                      }}
                                      onWhatsapp={
                                        toWhatsappLink(item.phone)
                                          ? () => window.open(toWhatsappLink(item.phone) ?? "", "_blank")
                                          : undefined
                                      }
                                      onMaps={
                                        isHomeVisit && item.address
                                          ? () => {
                                              const mapsQuery = encodeURIComponent(item.address ?? "");
                                              window.open(
                                                `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
                                                "_blank"
                                              );
                                            }
                                          : undefined
                                      }
                                    />
                                  </div>

                                  {postHeight > 0 && (
                                    <div className="pointer-events-none relative" style={{ height: postHeight }}>
                                      <div className="absolute inset-x-2 bottom-1 h-1.5 rounded-full bg-slate-200/80" />
                                      <div className="absolute left-2 bottom-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                        Buffer Pós + {formatDuration(bufferAfter)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
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
          className={`${view === "week" ? "block" : "hidden"} p-6 pb-0 animate-in fade-in`}
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
                            {format(parseDate(appt.start_time), "HH:mm")}
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
          className={`${view === "month" ? "block" : "hidden"} p-6 pb-0 animate-in fade-in`}
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
      </ModulePage>

      {actionSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            aria-label="Fechar ações"
            onClick={() => setActionSheet(null)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative w-full max-w-[420px] rounded-t-3xl bg-white p-5 shadow-float">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted">
              Ações do agendamento
            </div>
            <div className="mt-2 text-sm font-extrabold text-studio-text">{actionSheet.clientName}</div>
            <div className="text-xs text-muted">
              {actionSheet.serviceName} • {format(parseDate(actionSheet.startTime), "dd MMM • HH:mm", { locale: ptBR })}
            </div>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  const nextReturn = actionSheet.returnTo;
                  setActionSheet(null);
                  router.push(
                    `/novo?appointmentId=${actionSheet.id}&returnTo=${encodeURIComponent(nextReturn)}`
                  );
                }}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-extrabold text-studio-text hover:bg-studio-light transition"
              >
                Editar agendamento
              </button>
              <button
                type="button"
                disabled={isActionPending}
                onClick={async () => {
                  setIsActionPending(true);
                  const result = await cancelAppointment(actionSheet.id);
                  if (!result.ok) {
                    showToast(result.error.message, "error");
                  } else {
                    showToast("Agendamento excluído.", "success");
                    setActionSheet(null);
                  }
                  setIsActionPending(false);
                }}
                className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-600 hover:bg-red-100 transition disabled:opacity-60"
              >
                Excluir agendamento
              </button>
              <button
                type="button"
                onClick={() => setActionSheet(null)}
                className="w-full rounded-2xl bg-studio-light px-4 py-3 text-sm font-extrabold text-studio-green"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <AgendaSearchModal
        open={isSearchOpen}
        searchTerm={searchTerm}
        isSearching={isSearching}
        results={searchResults}
        onClose={() => {
          setIsSearchOpen(false);
          setSearchTerm("");
        }}
        onSearchTermChange={setSearchTerm}
        onSearchClick={() => setSearchMode("full")}
        onSelectAppointment={(item) => {
          const returnTo = `/?view=${view}&date=${format(selectedDate, "yyyy-MM-dd")}`;
          setIsSearchOpen(false);
          setSearchTerm("");
          router.push(`/atendimento/${item.id}?return=${encodeURIComponent(returnTo)}`);
        }}
        onSelectClient={(client) => {
          setIsSearchOpen(false);
          setSearchTerm("");
          router.push(`/clientes/${client.id}`);
        }}
      />

      <FloatingActionMenu
        actions={[
          {
            label: "Novo Cliente",
            icon: <UserPlus className="w-5 h-5" />,
            onClick: () => router.push("/clientes/novo"),
            tone: "green",
          },
          {
            label: "Bloquear Plantão",
            icon: <Hospital className="w-5 h-5" />,
            onClick: () => router.push("/bloqueios"),
            tone: "danger",
          },
          {
            label: "Novo Agendamento",
            icon: <CalendarPlus className="w-5 h-5" />,
            onClick: () => {
              const dateParam = format(selectedDate, "yyyy-MM-dd");
              const returnTo = `/?view=${view}&date=${dateParam}`;
              router.push(`/novo?date=${dateParam}&returnTo=${encodeURIComponent(returnTo)}`);
            },
            tone: "neutral",
          },
          {
            label: "Conta a pagar",
            icon: <ArrowDownCircle className="w-5 h-5" />,
            disabled: true,
            helper: "Em dev",
          },
          {
            label: "Conta a receber",
            icon: <ArrowUpCircle className="w-5 h-5" />,
            disabled: true,
            helper: "Em dev",
          },
        ]}
      />
    </>
  );
}
