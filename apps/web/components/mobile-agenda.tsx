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
  isSameDay,
  isSameMonth,
  isToday,
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
  Leaf,
  MapPin,
  Phone,
  Plus,
  Search,
  Sparkles,
  X,
  Building2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

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

type AgendaView = "day" | "week" | "month";

type DayItem = {
  id: string;
  type: "appointment" | "block";
  start_time: string;
  finished_at: string | null;
  clientName: string;
  serviceName: string;
  status: string;
  is_home_visit: boolean | null;
  total_duration_minutes: number | null;
  phone?: string | null;
  address?: string | null;
};

const weekdayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];

export function MobileAgenda({ appointments, blocks }: MobileAgendaProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [view, setView] = useState<AgendaView>("day");
  const [fabOpen, setFabOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [monthPickerYear, setMonthPickerYear] = useState(() => new Date().getFullYear());
  const daySliderRef = useRef<HTMLDivElement | null>(null);
  const lastSnapIndex = useRef(0);
  const isUserScrolling = useRef(false);
  const skipAutoScrollSync = useRef(false);
  const scrollIdleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();

  const monthDays = useMemo(
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
    const query = searchParams.get("q") ?? "";
    setSearchTerm(query);
  }, [searchParams]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const nextQuery = searchTerm.trim();
      if (nextQuery) {
        params.set("q", nextQuery);
      } else {
        params.delete("q");
      }
      router.replace(`/?${params.toString()}`, { scroll: false });
    }, 400);
    return () => clearTimeout(handle);
  }, [searchTerm, isSearchOpen, router, searchParams]);

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
    setView("day");
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

  return (
    <div className="bg-studio-bg min-h-full flex flex-col">
      <header className="px-6 pb-4 bg-white rounded-b-3xl shadow-soft z-20 sticky top-0 relative safe-top safe-top-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[11px] font-extrabold text-studio-green uppercase tracking-widest">
                Olá, Corpo & Alma
              </p>
              <span className="text-[10px] text-muted flex items-center gap-1 uppercase tracking-wide">
                <Leaf className="w-3 h-3 text-studio-accent" /> Online
              </span>
            </div>

            <h1 className="text-2xl font-serif text-studio-text flex items-center gap-2 leading-tight">
              Sua Agenda de
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen((prev) => !prev)}
                className="text-studio-green border-b-2 border-studio-green/20 hover:border-studio-green transition capitalize"
              >
                {format(currentMonth, "MMMM", { locale: ptBR })}
              </button>
            </h1>
          </div>

          <div className="flex flex-col gap-2 items-end">
            <button
              onClick={handleGoToToday}
              className="bg-studio-light text-studio-green px-3 py-1.5 rounded-full text-xs font-extrabold shadow-soft hover:bg-studio-green hover:text-white transition flex items-center gap-1"
              type="button"
            >
              <CalendarCheck className="w-3 h-3" /> Hoje
            </button>

            <button
              type="button"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className="text-xs font-bold text-muted hover:text-studio-green transition flex items-center gap-1"
            >
              <Search className="w-3 h-3" /> Buscar
            </button>
          </div>
        </div>

        <div className="bg-studio-light p-1 rounded-2xl flex justify-between border border-line">
          <button
            type="button"
            onClick={() => setView("day")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              view === "day" ? "bg-white text-studio-green shadow-soft" : "text-muted hover:text-studio-green"
            }`}
          >
            DIA
          </button>
          <button
            type="button"
            onClick={() => setView("week")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              view === "week" ? "bg-white text-studio-green shadow-soft" : "text-muted hover:text-studio-green"
            }`}
          >
            SEMANA
          </button>
          <button
            type="button"
            onClick={() => setView("month")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
              view === "month" ? "bg-white text-studio-green shadow-soft" : "text-muted hover:text-studio-green"
            }`}
          >
            MÊS
          </button>
        </div>

        {isSearchOpen && (
          <div className="mt-3 flex items-center gap-2 bg-studio-light rounded-2xl px-3 py-2">
            <Search className="w-4 h-4 text-muted" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar cliente, serviço ou telefone"
              className="flex-1 bg-transparent text-sm text-studio-text placeholder:text-muted focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="w-7 h-7 rounded-full bg-white text-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {isMonthPickerOpen && (
          <div className="absolute left-6 right-6 top-full mt-2 bg-white rounded-2xl shadow-float border border-line p-4 z-30">
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
      </header>

      <main className="flex-1 overflow-hidden relative bg-studio-bg">
        <section className={`${view === "day" ? "block" : "hidden"} h-full`}>
          <div
            ref={daySliderRef}
            onScroll={handleDayScroll}
            className="flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
          >
            {monthDays.map((day) => {
              const { dayAppointments, dayBlocks, items } = getDayData(day);
              const appointmentCount = dayAppointments.length;
              const homeCount = dayAppointments.filter((appt) => appt.is_home_visit).length;
              const blockCount = dayBlocks.length;
              const showFreeLine = items.length > 0 && appointmentCount > 0;

              return (
                <div
                  key={day.toISOString()}
                  data-date={format(day, "yyyy-MM-dd")}
                  className="min-w-full h-full snap-center overflow-y-auto px-6 pb-28"
                >
                  <div className="text-center mb-4">
                    <h2
                      className={`text-[10px] font-extrabold uppercase tracking-widest mb-0.5 capitalize ${
                        isToday(day) ? "text-studio-green" : "text-muted"
                      }`}
                    >
                      {format(day, "EEEE", { locale: ptBR })}
                    </h2>
                    <p className="text-3xl font-serif text-studio-text capitalize">
                      {format(day, "dd MMM", { locale: ptBR })}
                    </p>
                    <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
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

                  {isToday(day) && (
                    <div className="flex items-center gap-2 mb-4 mt-2">
                      <span className="text-xs font-extrabold text-danger w-12 text-right">
                        {format(now, "HH:mm")}
                      </span>
                      <div className="flex-1 h-px bg-danger/70 relative">
                        <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-danger"></div>
                      </div>
                    </div>
                  )}

                  {items.length > 0 ? (
                    <div>
                      {items.map((item) => {
                        const startTimeDate = new Date(item.start_time);
                        const start = format(startTimeDate, "HH:mm");
                        let end = "";
                        if (item.finished_at) {
                          end = format(new Date(item.finished_at), "HH:mm");
                        } else if (item.total_duration_minutes) {
                          end = format(addMinutes(startTimeDate, item.total_duration_minutes), "HH:mm");
                        }

                        const isBlock = item.type === "block";
                        const isHomeVisit = item.is_home_visit;
                        const isCompleted = item.status === "completed";

                        return (
                          <div key={item.id} className="flex gap-4 group mb-4">
                            <span className="text-sm font-extrabold text-studio-text pt-3 w-12 text-right">
                              {start}
                            </span>
                            {isBlock ? (
                              <div className="flex-1 bg-white p-4 rounded-3xl shadow-soft border-l-4 border-red-400">
                                <div className="flex justify-between items-start mb-1">
                                  <h3 className="font-extrabold text-studio-text text-lg leading-tight">
                                    {item.clientName}
                                  </h3>
                                  <div className="w-7 h-7 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                                    <Hospital className="w-3.5 h-3.5" />
                                  </div>
                                </div>
                                <p className="text-sm text-muted">{item.serviceName}</p>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-red-100 text-red-600">
                                    Bloqueado
                                  </span>
                                  {end && <span className="text-[11px] text-muted">Até {end}</span>}
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => router.push(`/atendimento/${item.id}`)}
                                className={`flex-1 text-left bg-white p-4 rounded-3xl shadow-soft border-l-4 transition group active:scale-[0.99] relative overflow-hidden ${
                                  isHomeVisit ? "border-purple-500" : "border-studio-green"
                                }`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <h3 className="font-extrabold text-studio-text text-lg leading-tight">
                                    {item.clientName}
                                  </h3>
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                      isHomeVisit
                                        ? "bg-purple-50 text-purple-600"
                                        : "bg-green-50 text-studio-green"
                                    }`}
                                  >
                                    {isHomeVisit ? <Car className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                                  </div>
                                </div>
                                <p className="text-sm text-muted">{item.serviceName}</p>
                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${
                                      isCompleted
                                        ? "bg-green-100 text-green-700"
                                        : isHomeVisit
                                          ? "bg-purple-100 text-purple-700"
                                          : "bg-studio-green/10 text-studio-green"
                                    }`}
                                  >
                                    {isCompleted ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3" /> Finalizado
                                      </>
                                    ) : isHomeVisit ? (
                                      <>
                                        <Home className="w-3 h-3" /> Domicílio
                                      </>
                                    ) : (
                                      "Confirmado"
                                    )}
                                  </span>
                                  {item.phone && (
                                    <span className="text-[11px] text-muted flex items-center gap-1">
                                      <Phone className="w-3 h-3" /> {item.phone}
                                    </span>
                                  )}
                                  {item.address && isHomeVisit && (
                                    <span className="text-[11px] text-muted flex items-center gap-1">
                                      <MapPin className="w-3 h-3" /> {item.address}
                                    </span>
                                  )}
                                </div>
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {showFreeLine && (
                        <div className="flex gap-4 opacity-60">
                          <span className="text-sm font-extrabold text-muted pt-3 w-12 text-right">--:--</span>
                          <div className="flex-1 border-t-2 border-dashed border-line mt-5 flex items-center gap-2">
                            <span className="text-xs bg-studio-light px-2 rounded text-muted mt-[-1rem] ml-2">Livre</span>
                          </div>
                        </div>
                      )}
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
          className={`${view === "week" ? "block" : "hidden"} h-full overflow-y-auto p-6 pb-28 animate-in fade-in`}
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
                      setView("day");
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
          className={`${view === "month" ? "block" : "hidden"} h-full overflow-y-auto p-6 pb-28 animate-in fade-in`}
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
                      setView("day");
                    }}
                    className="relative flex justify-center"
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
                    {dayAppointments.length > 0 && (
                      <span className="absolute -bottom-2 w-1 h-1 bg-studio-green rounded-full"></span>
                    )}
                    {dayBlocks.length > 0 && (
                      <span className="absolute -bottom-2 text-[8px] text-red-400 font-extrabold">PLANT</span>
                    )}
                    {hasHome && (
                      <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                    )}
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

      <div className="absolute bottom-24 right-6 z-40 flex flex-col items-end gap-3">
        <div
          className={`flex flex-col items-end gap-3 transition-all duration-200 ${
            fabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
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
              router.push("/novo");
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
          className="w-14 h-14 bg-studio-green text-white rounded-full shadow-xl shadow-green-100 flex items-center justify-center z-50 hover:scale-105 transition active:scale-95"
          type="button"
        >
          {fabOpen ? <X className="w-6 h-6" /> : <Plus className="w-7 h-7" />}
        </button>
      </div>
    </div>
  );
}
