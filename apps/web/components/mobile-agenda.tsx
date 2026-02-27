"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMinutes,
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
  ArrowUpCircle,
  CalendarPlus,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  Hospital,
  Search,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { ModuleHeader } from "./ui/module-header";
import { ModulePage } from "./ui/module-page";
import { FloatingActionMenu } from "./ui/floating-action-menu";
import { IconButton } from "./ui/buttons";
import { Toast, useToast } from "./ui/toast";
import { AppointmentCard } from "./agenda/appointment-card";
import { AgendaSearchModal, type SearchResults } from "./agenda/agenda-search-modal";
import { AppointmentDetailsSheet } from "./agenda/appointment-details-sheet";
import { AvailabilityManager, type AvailabilityManagerHandle } from "./availability-manager";
import {
  buildClientReferenceCode,
  buildServiceReferenceCode,
  normalizeReferenceToken,
} from "./agenda/appointment-reference";
import { cancelAppointment } from "../app/actions";
import {
  confirmPre,
  getAttendance,
  recordPayment,
  saveEvolution,
  sendMessage,
  sendReminder24h,
  structureEvolutionFromAudio,
} from "../app/(dashboard)/atendimento/[id]/actions";
import { DEFAULT_PUBLIC_BASE_URL } from "../src/shared/config";
import type { AttendanceOverview, MessageType } from "../lib/attendance/attendance-types";
import { applyAutoMessageTemplate } from "../src/shared/auto-messages.utils";
import { buildAppointmentReceiptPath } from "../src/shared/public-links";
import { feedbackById, feedbackFromError } from "../src/shared/feedback/user-feedback";
import {
  getDurationHeight,
  getOffsetForTime,
  getTimeRangeMinutes,
  type TimeGridConfig,
} from "../src/modules/agenda/time-grid";
import {
  hiddenAppointmentStatuses,
  type AgendaView,
  type Appointment,
  type AvailabilityBlock,
  type DayItem,
  type MobileAgendaProps,
} from "./agenda/mobile-agenda.types";

export function MobileAgenda({
  appointments,
  blocks,
  signalPercentage = 30,
  publicBaseUrl = DEFAULT_PUBLIC_BASE_URL,
  messageTemplates,
}: MobileAgendaProps) {
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
  const [searchMode, setSearchMode] = useState<"quick" | "full">("quick");
  const [searchResults, setSearchResults] = useState<SearchResults>({ appointments: [], clients: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [loadingAppointmentId, setLoadingAppointmentId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsAppointmentId, setDetailsAppointmentId] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<AttendanceOverview | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsActionPending, setDetailsActionPending] = useState(false);
  const [actionSheet, setActionSheet] = useState<{
    id: string;
    clientName: string;
    serviceName: string;
    startTime: string;
    returnTo: string;
  } | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => new Date().getFullYear());
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const redirectToLogin = useCallback((loginUrl?: string | null) => {
    if (typeof window === "undefined") return;
    const fallbackNext = `${window.location.pathname}${window.location.search}`;
    const fallbackLogin = `/auth/login?reason=forbidden&next=${encodeURIComponent(fallbackNext)}`;
    window.location.assign(loginUrl?.trim() || fallbackLogin);
  }, []);
  const { toast, showToast } = useToast();
  const daySliderRef = useRef<HTMLDivElement | null>(null);
  const lastSnapIndex = useRef(0);
  const availabilityRef = useRef<AvailabilityManagerHandle | null>(null);
  const isUserScrolling = useRef(false);
  const skipAutoScrollSync = useRef(false);
  const pendingViewRef = useRef<AgendaView | null>(null);
  const selectedDateRef = useRef<Date>(selectedDate);
  const scrollIdleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const createdToastShown = useRef(false);
  const autoOpenedAppointmentRef = useRef<string | null>(null);
  const pendingAutoOpenAppointmentRef = useRef<string | null>(null);
  const pendingAutoOpenDelayMsRef = useRef<number>(0);
  const timeColumnWidth = 44;
  const timeColumnGap = 6;
  const timelineLeftOffset = timeColumnWidth + timeColumnGap;
  const timeGridConfig = useMemo<TimeGridConfig>(
    () => ({
      startHour: 6,
      endHour: 22,
      hourHeight: 120,
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
          label: `${hourLabel}:30`,
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

  const visibleAppointments = useMemo(
    () => appointments.filter((appt) => !hiddenAppointmentStatuses.has(appt.status)),
    [appointments]
  );

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    visibleAppointments.forEach((appt) => {
      const key = format(parseDate(appt.start_time), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(appt);
      map.set(key, list);
    });
    return map;
  }, [visibleAppointments, parseDate]);

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
    setPortalTarget(document.getElementById("app-frame"));
  }, []);

  useEffect(() => {
    if (!isSearchOpen) {
      setSearchMode("quick");
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
        const data = (await response.json()) as SearchResults & {
          loginRequired?: boolean;
          loginUrl?: string | null;
        };
        if (response.status === 401 || data.loginRequired) {
          redirectToLogin(data.loginUrl);
          return;
        }
        if (!response.ok) return;
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
  }, [searchTerm, isSearchOpen, searchMode, redirectToLogin]);

  useEffect(() => {
    if (searchParams.get("created") !== "1") {
      createdToastShown.current = false;
      return;
    }
    if (createdToastShown.current) return;
    createdToastShown.current = true;
    showToast(feedbackById("booking_created", { durationMs: 1800 }));
    const params = new URLSearchParams(searchParams.toString());
    params.delete("created");
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [searchParams, router, showToast]);

  const fetchAttendanceDetails = useCallback(
    async (appointmentId: string) => {
      setDetailsLoading(true);
      let timeoutId: number | null = null;
      try {
        const data = await Promise.race([
          getAttendance(appointmentId),
          new Promise<null>((_, reject) => {
            timeoutId = window.setTimeout(() => reject(new Error("details_timeout")), 10000);
          }),
        ]);
        setDetailsData(data ?? null);
      } catch {
        showToast(
          feedbackById("agenda_details_load_failed", {
            message: "Não foi possível carregar os detalhes agora. Tente abrir novamente.",
          })
        );
        setDetailsData(null);
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        setDetailsLoading(false);
        setLoadingAppointmentId(null);
      }
    },
    [showToast]
  );

  const openDetailsForAppointment = useCallback((appointmentId: string) => {
    setLoadingAppointmentId(appointmentId);
    setDetailsAppointmentId(appointmentId);
    setDetailsOpen(true);
  }, []);

  useEffect(() => {
    if (!detailsOpen || !detailsAppointmentId) {
      setDetailsData(null);
      setDetailsLoading(false);
      setLoadingAppointmentId(null);
      return;
    }
    fetchAttendanceDetails(detailsAppointmentId);
  }, [detailsOpen, detailsAppointmentId, fetchAttendanceDetails]);

  useEffect(() => {
    const appointmentToOpen = searchParams.get("openAppointment");
    if (!appointmentToOpen) {
      autoOpenedAppointmentRef.current = null;
      return;
    }
    if (autoOpenedAppointmentRef.current === appointmentToOpen) {
      return;
    }

    const targetAppointment = appointments.find((item) => item.id === appointmentToOpen);
    if (!targetAppointment) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("openAppointment");
      params.delete("fromAttendance");
      router.replace(`/?${params.toString()}`, { scroll: false });
      return;
    }

    const targetDate = parseDate(targetAppointment.start_time);
    if (isValid(targetDate) && !isSameDay(targetDate, selectedDateRef.current)) {
      setSelectedDate(targetDate);
      setCurrentMonth(startOfMonth(targetDate));
    }

    autoOpenedAppointmentRef.current = appointmentToOpen;
    pendingAutoOpenAppointmentRef.current = appointmentToOpen;
    pendingAutoOpenDelayMsRef.current = searchParams.get("fromAttendance") === "1" ? 80 : 0;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("openAppointment");
    params.delete("fromAttendance");
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [appointments, openDetailsForAppointment, parseDate, router, searchParams]);

  useEffect(() => {
    if (searchParams.get("openAppointment")) return;
    const pendingAppointmentId = pendingAutoOpenAppointmentRef.current;
    if (!pendingAppointmentId) return;

    pendingAutoOpenAppointmentRef.current = null;
    const delayMs = pendingAutoOpenDelayMsRef.current;
    pendingAutoOpenDelayMsRef.current = 0;

    window.setTimeout(() => {
      openDetailsForAppointment(pendingAppointmentId);
    }, delayMs);
  }, [openDetailsForAppointment, searchParams]);

  const getDayData = (day: Date) => {
    const key = format(day, "yyyy-MM-dd");
    const dayAppointments = (appointmentsByDay.get(key) ?? []).slice().sort((a, b) =>
      parseDate(a.start_time).getTime() - parseDate(b.start_time).getTime()
    );
    const dayBlocks = (blocksByDay.get(key) ?? []).slice().sort((a, b) =>
      parseDate(a.start_time).getTime() - parseDate(b.start_time).getTime()
    );

    const blockItems = dayBlocks
      .filter((block) => !((block.block_type ?? "") === "shift" && block.is_full_day))
      .map((block) => ({
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
        price: null,
        block_type: block.block_type ?? null,
        is_full_day: block.is_full_day ?? null,
      }));

    const items: DayItem[] = [
      ...dayAppointments.map((appt) => ({
        id: appt.id,
        type: "appointment" as const,
        start_time: appt.start_time,
        finished_at: appt.finished_at,
        service_duration_minutes: appt.service_duration_minutes ?? null,
        buffer_before_minutes: appt.buffer_before_minutes ?? null,
        buffer_after_minutes: appt.buffer_after_minutes ?? null,
        clientName: appt.clients?.name ?? "",
        serviceName: appt.service_name,
        status: appt.status,
        payment_status: appt.payment_status ?? null,
        is_home_visit: appt.is_home_visit ?? null,
        total_duration_minutes: appt.total_duration_minutes ?? null,
        price: appt.price ?? null,
        phone: appt.clients?.phone ?? null,
        address: appt.clients?.endereco_completo ?? null,
      })),
      ...blockItems,
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
    setNow(new Date());
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


  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "";
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!remainder) return `${hours}h`;
    return `${hours}h ${remainder}m`;
  };

  const getServiceDuration = (item: DayItem) => {
    // For blocked slots, duration comes from start/end interval.
    // For appointments, keep planned duration so the card height stays stable
    // even after finishing earlier/later than expected.
    if (item.type === "block" && item.finished_at) {
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

  const toWhatsappLink = useCallback((phone?: string | null) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (!digits) return null;
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    return `https://wa.me/${withCountry}`;
  }, []);

  const resolvePublicBaseUrl = () => {
    const raw = publicBaseUrl.trim();
    if (!raw) {
      if (typeof window === "undefined") return "";
      return window.location.origin.replace(/\/$/, "");
    }
    return /^https?:\/\//i.test(raw) ? raw.replace(/\/$/, "") : `https://${raw.replace(/\/$/, "")}`;
  };

  const detailsAttendanceCode = useMemo(() => {
    const appointment = detailsData?.appointment;
    if (!appointment) return null;

    const persistedCode =
      typeof appointment.attendance_code === "string" ? appointment.attendance_code.trim() : "";
    if (persistedCode) return persistedCode;

    const startDate = parseDate(appointment.start_time);
    if (!isValid(startDate)) return null;

    const serviceCode = buildServiceReferenceCode(appointment.service_name);
    const clientCode = buildClientReferenceCode({
      clientName: appointment.clients?.name ?? null,
      phone: appointment.clients?.phone ?? null,
      appointmentId: appointment.id,
    });

    const dayKey = format(startDate, "yyyy-MM-dd");
    const normalizedServiceName = normalizeReferenceToken(appointment.service_name ?? "");
    const sameServiceDayAppointments = appointments
      .filter((item) => {
        const itemDate = parseDate(item.start_time);
        if (!isValid(itemDate)) return false;
        return (
          format(itemDate, "yyyy-MM-dd") === dayKey &&
          normalizeReferenceToken(item.service_name ?? "") === normalizedServiceName
        );
      })
      .slice()
      .sort((a, b) => {
        const timeDiff = parseDate(a.start_time).getTime() - parseDate(b.start_time).getTime();
        if (timeDiff !== 0) return timeDiff;
        return a.id.localeCompare(b.id);
      });

    const sequenceIndex = sameServiceDayAppointments.findIndex((item) => item.id === appointment.id);
    const sequence = String(sequenceIndex >= 0 ? sequenceIndex + 1 : 1).padStart(2, "0");
    const dateToken = format(startDate, "ddMMyy");

    return `${serviceCode}-${clientCode}-${dateToken}-${sequence}`;
  }, [appointments, detailsData?.appointment, parseDate]);

  const buildMessage = (
    type: MessageType,
    appointment: AttendanceOverview["appointment"],
    options?: { paymentId?: string | null; chargeAmount?: number | null }
  ) => {
    const name = appointment.clients?.name?.trim() ?? "";
    const greeting = name ? `Olá, ${name}!` : "Olá!";
    const startDate = new Date(appointment.start_time);
    const dayOfWeek = format(startDate, "EEEE", { locale: ptBR });
    const dayOfWeekLabel = dayOfWeek ? `${dayOfWeek[0]?.toUpperCase() ?? ""}${dayOfWeek.slice(1)}` : "";
    const dateLabel = format(startDate, "dd/MM", { locale: ptBR });
    const timeLabel = format(startDate, "HH:mm", { locale: ptBR });
    const serviceName = (appointment.service_name ?? "").trim() || "Seu atendimento";
    const dateLine = [dayOfWeekLabel, dateLabel].filter(Boolean).join(", ");
    const serviceSegment = serviceName ? ` 💆‍♀️ Serviço: ${serviceName}` : "";
    const clientAddress =
      appointment.clients?.endereco_completo?.trim() ||
      [
        appointment.address_logradouro,
        appointment.address_numero,
        appointment.address_bairro,
        appointment.address_cidade,
        appointment.address_estado,
      ]
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
        .join(", ");
    const locationLine = appointment.is_home_visit
      ? clientAddress
        ? `No endereço informado: ${clientAddress}`
        : "Atendimento domiciliar (endereço a confirmar)"
      : "No estúdio";
    const confirmationReplyOptions = "1 - Confirmar\n2 - Reagendar\n3 - Falar com a Jana";

    if (type === "created_confirmation") {
      return applyAutoMessageTemplate(messageTemplates.created_confirmation, {
        greeting,
        date_line: dateLine,
        time: timeLabel,
        service_name: serviceName,
        location_line: locationLine,
        service_segment: serviceSegment,
      }).trim();
    }
    if (type === "reminder_24h") {
      const serviceLine = serviceName ? `para o seu ${serviceName} às ${timeLabel}.` : `para o seu horário às ${timeLabel}.`;
      return applyAutoMessageTemplate(messageTemplates.reminder_24h, {
        greeting,
        service_line: serviceLine,
        service_name: serviceName,
        time: timeLabel,
        date_line: dateLine,
        location_line: locationLine,
        confirmation_reply_options: confirmationReplyOptions,
      }).trim();
    }

    if (type === "payment_charge") {
      const base = resolvePublicBaseUrl();
      const paymentLink = base ? `${base}/pagamento` : "";
      const chargeAmount =
        typeof options?.chargeAmount === "number" && Number.isFinite(options.chargeAmount)
          ? options.chargeAmount
          : null;
      const chargeLabel =
        chargeAmount !== null
          ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(chargeAmount)
          : "";
      const paymentLinkBlock = paymentLink
        ? `💰 Valor pendente: ${chargeLabel || "conforme combinado"}\nLink:\n${paymentLink}\n\n`
        : "";

      return applyAutoMessageTemplate(messageTemplates.payment_charge, {
        greeting,
        service_name: serviceName,
        payment_link_block: paymentLinkBlock,
      }).trim();
    }

    if (type === "payment_receipt") {
      const base = resolvePublicBaseUrl();
      const receiptPath = buildAppointmentReceiptPath({
        appointmentId: appointment.id,
        attendanceCode: appointment.attendance_code ?? null,
      });
      const receiptLink = base && receiptPath ? `${base}${receiptPath}` : "";
      const receiptBlock = receiptLink
        ? `🧾 Acesse seu recibo digital aqui:\n${receiptLink}\n\n`
        : "";
      return applyAutoMessageTemplate(messageTemplates.payment_receipt, {
        greeting,
        service_name: serviceName,
        receipt_link_block: receiptBlock,
      }).trim();
    }

    if (name) {
      return `Obrigada pelo atendimento, ${name}! Pode avaliar nossa experiência de 0 a 10?`;
    }
    return "Obrigada pelo atendimento! Pode avaliar nossa experiência de 0 a 10?";
  };

  const openWhatsapp = useCallback(
    (phone: string | null | undefined, message: string) => {
      const link = toWhatsappLink(phone);
      if (!link) return false;
      const url = `${link}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
      return true;
    },
    [toWhatsappLink]
  );

  const handleSendMessage = async (type: MessageType) => {
    if (!detailsData) return;
    const phone = detailsData.appointment.clients?.phone ?? null;
    if (!phone) {
      showToast(feedbackById("whatsapp_missing_phone"));
      return;
    }
    setDetailsActionPending(true);
    const message = buildMessage(type, detailsData.appointment);
    openWhatsapp(phone, message);
    const result = await sendMessage({
      appointmentId: detailsData.appointment.id,
      type,
      channel: "whatsapp",
      payload: { message },
    });
    if (!result?.ok) {
      showToast(feedbackFromError(result?.error, "whatsapp"));
      setDetailsActionPending(false);
      return;
    }
    showToast(feedbackById("message_recorded"));
    await fetchAttendanceDetails(detailsData.appointment.id);
    router.refresh();
    setDetailsActionPending(false);
  };

  const handleSendPaymentCharge = async () => {
    if (!detailsData) return;
    const phone = detailsData.appointment.clients?.phone ?? null;
    if (!phone) {
      showToast(feedbackById("whatsapp_missing_phone"));
      return;
    }

    const totalAmount = Number(detailsData.checkout?.total ?? detailsData.appointment.price ?? 0);
    const paidAmount = (detailsData.payments ?? [])
      .filter((payment) => payment.status === "paid")
      .reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0);
    const remainingAmount = Math.max(totalAmount - paidAmount, 0);

    setDetailsActionPending(true);
    const message = buildMessage("payment_charge", detailsData.appointment, {
      chargeAmount: remainingAmount,
    });
    openWhatsapp(phone, message);

    const result = await sendMessage({
      appointmentId: detailsData.appointment.id,
      type: "payment_charge",
      channel: "whatsapp",
      payload: { message, remaining_amount: remainingAmount },
    });

    if (!result.ok) {
      showToast(feedbackFromError(result.error, "whatsapp"));
      setDetailsActionPending(false);
      return;
    }

    showToast(feedbackById("message_recorded"));
    await fetchAttendanceDetails(detailsData.appointment.id);
    router.refresh();
    setDetailsActionPending(false);
  };

  const handleSendPaymentReceipt = async (paymentId: string | null) => {
    if (!detailsData || !paymentId) return;
    const phone = detailsData.appointment.clients?.phone ?? null;
    if (!phone) {
      showToast(feedbackById("whatsapp_missing_phone"));
      return;
    }

    setDetailsActionPending(true);
    const base = resolvePublicBaseUrl();
    const receiptPath = buildAppointmentReceiptPath({
      appointmentId: detailsData.appointment.id,
      attendanceCode: detailsData.appointment.attendance_code ?? null,
    });
    const receiptLink = base && receiptPath ? `${base}${receiptPath}` : "";
    const message = buildMessage("payment_receipt", detailsData.appointment, { paymentId });
    openWhatsapp(phone, message);

    const result = await sendMessage({
      appointmentId: detailsData.appointment.id,
      type: "payment_receipt",
      channel: "whatsapp",
      payload: { message, payment_id: paymentId, receipt_link: receiptLink || null },
    });

    if (!result.ok) {
      showToast(feedbackFromError(result.error, "whatsapp"));
      setDetailsActionPending(false);
      return;
    }

    showToast(feedbackById("message_recorded"));
    await fetchAttendanceDetails(detailsData.appointment.id);
    router.refresh();
    setDetailsActionPending(false);
  };

  const handleSendReminder = async () => {
    if (!detailsData) return;
    const phone = detailsData.appointment.clients?.phone ?? null;
    if (!phone) {
      showToast(feedbackById("whatsapp_missing_phone"));
      return;
    }
    setDetailsActionPending(true);
    const message = buildMessage("reminder_24h", detailsData.appointment);
    openWhatsapp(phone, message);
    const result = await sendReminder24h({ appointmentId: detailsData.appointment.id, message });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "whatsapp"));
      setDetailsActionPending(false);
      return;
    }
    showToast(feedbackById("reminder_recorded"));
    await fetchAttendanceDetails(detailsData.appointment.id);
    router.refresh();
    setDetailsActionPending(false);
  };

  const handleSendSurvey = async () => {
    if (!detailsData) return;
    const phone = detailsData.appointment.clients?.phone ?? null;
    if (!phone) {
      showToast(feedbackById("whatsapp_missing_phone"));
      return;
    }

    setDetailsActionPending(true);
    const message = buildMessage("post_survey", detailsData.appointment);
    openWhatsapp(phone, message);

    const result = await sendMessage({
      appointmentId: detailsData.appointment.id,
      type: "post_survey",
      channel: "whatsapp",
      payload: { message },
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "whatsapp"));
      setDetailsActionPending(false);
      return;
    }

    showToast(feedbackById("message_recorded"));
    await fetchAttendanceDetails(detailsData.appointment.id);
    router.refresh();
    setDetailsActionPending(false);
  };

  const handleConfirmClient = async () => {
    if (!detailsData) return;
    setDetailsActionPending(true);
    const result = await confirmPre({ appointmentId: detailsData.appointment.id, channel: "manual" });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      setDetailsActionPending(false);
      return;
    }
    showToast(feedbackById("client_confirmed"));
    await fetchAttendanceDetails(detailsData.appointment.id);
    router.refresh();
    setDetailsActionPending(false);
  };

  const handleCancelAppointment = async (options?: { notifyClient?: boolean }) => {
    if (!detailsData) return;
    setDetailsActionPending(true);
    const result = await cancelAppointment(detailsData.appointment.id, options);
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      setDetailsActionPending(false);
      return;
    }
    showToast(feedbackById("appointment_cancelled"));
    setDetailsOpen(false);
    setDetailsAppointmentId(null);
    setDetailsData(null);
    setLoadingAppointmentId(null);
    router.refresh();
    setDetailsActionPending(false);
  };

  const handleRecordPayment = async (payload: {
    type: "signal" | "full";
    amount: number;
    method: "pix" | "card" | "cash" | "other";
  }) => {
    if (!detailsData) return;
    if (!payload.amount || payload.amount <= 0) {
      showToast(feedbackById("payment_invalid_amount"));
      return;
    }
    setDetailsActionPending(true);
    const result = await recordPayment({
      appointmentId: detailsData.appointment.id,
      method: payload.method,
      amount: payload.amount,
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      setDetailsActionPending(false);
      return;
    }
    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: payload.type === "signal" ? "Sinal registrado." : "Pagamento integral registrado.",
      })
    );
    await fetchAttendanceDetails(detailsData.appointment.id);
    router.refresh();
    setDetailsActionPending(false);
  };

  const handleSaveEvolutionFromDetails = async (text: string) => {
    if (!detailsData) return { ok: false as const };
    setDetailsActionPending(true);
    const result = await saveEvolution({
      appointmentId: detailsData.appointment.id,
      payload: {
        text,
      },
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      setDetailsActionPending(false);
      return { ok: false as const };
    }

    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: "Evolução salva.",
      })
    );
    await fetchAttendanceDetails(detailsData.appointment.id);
    router.refresh();
    setDetailsActionPending(false);
    return { ok: true as const };
  };

  const handleStructureEvolutionFromDetails = async (text: string) => {
    if (!detailsData) return { ok: false as const, structuredText: null };
    setDetailsActionPending(true);
    const result = await structureEvolutionFromAudio({
      appointmentId: detailsData.appointment.id,
      transcript: text,
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "attendance"));
      setDetailsActionPending(false);
      return { ok: false as const, structuredText: null };
    }

    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: "Flora organizou a evolução.",
      })
    );
    setDetailsActionPending(false);
    return { ok: true as const, structuredText: result.data.structuredText };
  };

  const handleOpenAttendance = () => {
    if (!detailsData) return;
    const returnTo = `/?view=${view}&date=${format(selectedDate, "yyyy-MM-dd")}`;
    setDetailsOpen(false);
    router.push(`/atendimento/${detailsData.appointment.id}?return=${encodeURIComponent(returnTo)}`);
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
                      setSearchMode("quick");
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
            className={`${headerCompact ? "min-h-30" : "min-h-37.5"}`}
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
              const hasShiftBlock = dayBlocks.some(
                (block) => (block.block_type ?? "") === "shift" && block.is_full_day
              );
              const hasPartialBlocks = dayBlocks.some(
                (block) => !((block.block_type ?? "") === "shift" && block.is_full_day)
              );
              const nowOffset = now && isToday(day) ? getOffsetForTime(now, timeGridConfig) : null;

              return (
                <div
                  key={day.toISOString()}
                  data-date={format(day, "yyyy-MM-dd")}
                  className="min-w-full snap-center px-3 pb-0 pt-5 flex flex-col"
                  style={{ scrollSnapStop: "always" }}
                >
                  <div className="text-center mb-5">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="w-10" aria-hidden="true"></div>
                      <h2
                        className={`text-[10px] font-extrabold uppercase tracking-widest ${
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
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-dom/20 text-dom-strong">
                          <Home className="w-3 h-3" /> {homeCount} domicílio
                        </span>
                      )}
                      {hasShiftBlock && (
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-red-100 text-red-600">
                          <Hospital className="w-3 h-3" /> Plantão
                        </span>
                      )}
                      {!hasShiftBlock && appointmentCount === 0 && blockCount > 0 && (
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-amber-100 text-amber-700">
                          Bloqueio parcial
                        </span>
                      )}
                      {hasShiftBlock && hasPartialBlocks && (
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-amber-100 text-amber-700">
                          Bloqueio parcial
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
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `${timeColumnWidth}px minmax(0, 1fr)`,
                        columnGap: timeColumnGap,
                      }}
                    >
                      <div className="flex flex-col items-end text-xs text-muted font-semibold">
                        {timeSlots.map((slot) => (
                          <div
                            key={slot.key}
                            style={{ height: slotHeight }}
                            className={`flex items-start justify-end w-full ${
                              slot.isHalf ? "text-[10px] text-muted/60 pr-1" : "pr-0.5"
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
                            className="absolute border-t border-dashed border-[#e5e5e5] pointer-events-none"
                            style={{
                              top: index * slotHeight,
                              left: slot.isHalf ? 12 : 0,
                              right: 0,
                            }}
                          />
                        ))}

                        {nowOffset !== null && now && (
                          <div
                            className="absolute flex items-center gap-2 z-20"
                            style={{ top: nowOffset, left: -timelineLeftOffset, right: 0 }}
                          >
                            <span
                              className="text-[11px] font-extrabold text-danger text-right pr-2"
                              style={{ width: timeColumnWidth }}
                            >
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
                          const isHomeVisit =
                            typeof item.is_home_visit === "boolean" ? item.is_home_visit : Boolean(item.address);
                          const durationMinutes = getServiceDuration(item);
                          const isCompact = durationMinutes <= 30;
                          const bufferBefore = item.buffer_before_minutes ?? 0;
                          const bufferAfter = item.buffer_after_minutes ?? 0;
                          const apptHeight = getDurationHeight(durationMinutes, timeGridConfig);
                          const rawPreHeight =
                            bufferBefore > 0 ? getDurationHeight(bufferBefore, timeGridConfig) : 0;
                          const postHeight =
                            bufferAfter > 0 ? getDurationHeight(bufferAfter, timeGridConfig) : 0;
                          const accentColor = isHomeVisit ? "var(--color-dom)" : "var(--color-studio-green)";
                          const stripeColor = isHomeVisit
                            ? "rgba(192,164,176,0.2)"
                            : "rgba(93,110,86,0.16)";
                          const bufferStyle = {
                            borderLeftColor: accentColor,
                            backgroundImage: `repeating-linear-gradient(135deg, ${stripeColor} 0, ${stripeColor} 6px, transparent 6px, transparent 12px)`,
                          } as const;

                          let endLabel = "";
                          if (isBlock && item.finished_at) {
                            endLabel = format(parseDate(item.finished_at), "HH:mm");
                          } else if (durationMinutes) {
                            endLabel = format(addMinutes(startTimeDate, durationMinutes), "HH:mm");
                          }

                          const top = getOffsetForTime(startTimeDate, timeGridConfig);
                          if (top === null) return null;
                          const preHeight = rawPreHeight > 0 ? Math.min(rawPreHeight, top) : 0;
                          const wrapperTop = top - preHeight;
                          const wrapperHeight = preHeight + apptHeight + postHeight;
                          const hasPreBuffer = preHeight > 0;
                          const hasPostBuffer = postHeight > 0;

                          const returnTo = `/?view=day&date=${format(day, "yyyy-MM-dd")}`;

                          return (
                            <div
                              key={item.id}
                              className="absolute left-0 right-0 pr-1 pointer-events-auto"
                              style={{ top: wrapperTop, height: wrapperHeight }}
                            >
                              {isBlock ? (
                                <div className="h-full bg-white p-3.5 rounded-3xl shadow-soft border-l-4 border-amber-400 flex flex-col justify-between overflow-hidden">
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
                                      <div
                                        className="absolute inset-0 rounded-2xl rounded-b-none border-l-4 border-dashed px-3 py-1 flex items-start overflow-hidden"
                                        style={bufferStyle}
                                      >
                                        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted/80 leading-none whitespace-nowrap">
                                          Buffer Pré · {formatDuration(bufferBefore)}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  <div style={{ height: apptHeight }}>
                                    <AppointmentCard
                                      data-card
                                      name={item.clientName}
                                      service={item.serviceName}
                                      durationLabel={durationMinutes ? formatDuration(durationMinutes) : null}
                                      startLabel={startLabel}
                                      endLabel={endLabel}
                                      status={item.status}
                                      paymentStatus={item.payment_status ?? null}
                                      isHomeVisit={!!isHomeVisit}
                                      compact={isCompact}
                                      hasPreBuffer={hasPreBuffer}
                                      hasPostBuffer={hasPostBuffer}
                                      loading={loadingAppointmentId === item.id}
                                      onOpen={() => openDetailsForAppointment(item.id)}
                                      onLongPress={() => {
                                        setActionSheet({
                                          id: item.id,
                                          clientName: item.clientName,
                                          serviceName: item.serviceName,
                                          startTime: item.start_time,
                                          returnTo,
                                        });
                                      }}
                                    />
                                  </div>

                                  {postHeight > 0 && (
                                    <div className="pointer-events-none relative" style={{ height: postHeight }}>
                                      <div
                                        className="absolute inset-0 rounded-2xl rounded-t-none border-l-4 border-dashed px-3 py-1 flex items-end overflow-hidden"
                                        style={bufferStyle}
                                      >
                                        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted/80 leading-none whitespace-nowrap">
                                          Buffer Pós · {formatDuration(bufferAfter)}
                                        </span>
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
              const hasShiftBlock = dayBlocks.some(
                (block) => (block.block_type ?? "") === "shift" && block.is_full_day
              );
              const partialBlocks = dayBlocks.filter(
                (block) => !((block.block_type ?? "") === "shift" && block.is_full_day)
              );
              const hasBlocks = partialBlocks.length > 0;

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
                        <div key={appt.id} className="flex items-center gap-2 text-sm">
                          <span className="text-xs font-semibold text-muted">
                            {format(parseDate(appt.start_time), "HH:mm")}
                          </span>
                          <span className="text-xs text-muted">•</span>
                          <span className="font-bold text-studio-text truncate">
                            {appt.clients?.name ?? ""}
                          </span>
                          {appt.is_home_visit && (
                            <span className="ml-auto flex items-center justify-center w-6 h-6 rounded-full bg-dom/20 text-dom-strong">
                              <Car className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              }

              if (hasShiftBlock || hasBlocks) {
                return (
                  <div
                    key={day.toISOString()}
                    className={`bg-white p-4 rounded-3xl shadow-soft opacity-90 ${
                      hasBlocks ? "border-l-4 border-amber-400" : "border border-stone-100"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-studio-text capitalize">
                        {format(day, "EEE, dd", { locale: ptBR })}
                      </span>
                      <div className="flex items-center gap-2">
                        {hasShiftBlock && (
                          <span className="text-xs font-extrabold bg-red-100 text-danger px-2 py-1 rounded-full flex items-center gap-1">
                            <Hospital className="w-3 h-3" /> PLANTÃO
                          </span>
                        )}
                        {hasBlocks && (
                          <span className="text-xs font-extrabold bg-amber-100 text-amber-700 px-2 py-1 rounded-full flex items-center gap-1">
                            Bloqueio parcial
                          </span>
                        )}
                      </div>
                    </div>
                    {hasBlocks ? (
                      <p className="text-xs text-muted mt-2">
                        {partialBlocks.length} bloqueio(s) parcial(is) neste dia.
                      </p>
                    ) : (
                      <p className="text-xs text-muted mt-2">Plantão programado.</p>
                    )}
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
          <AvailabilityManager ref={availabilityRef} />
        </section>
        </main>
      </ModulePage>

      {actionSheet &&
        (() => {
          const actionSheetNode = (
            <div className={`${portalTarget ? "absolute" : "fixed"} inset-0 z-50 flex items-end justify-center`}>
              <button
                type="button"
                aria-label="Fechar ações"
                onClick={() => setActionSheet(null)}
                className="absolute inset-0 bg-black/40"
              />
              <div className="relative w-full max-w-105 rounded-t-3xl bg-white p-5 shadow-float">
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted">
                  Ações do agendamento
                </div>
                <div className="mt-2 text-sm font-extrabold text-studio-text">{actionSheet.clientName}</div>
                <div className="text-xs text-muted">
                  {actionSheet.serviceName} •{" "}
                  {format(parseDate(actionSheet.startTime), "dd MMM • HH:mm", { locale: ptBR })}
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextReturn = actionSheet.returnTo;
                      setActionSheet(null);
                      router.push(`/novo?appointmentId=${actionSheet.id}&returnTo=${encodeURIComponent(nextReturn)}`);
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
                        showToast(feedbackFromError(result.error, "agenda"));
                      } else {
                        showToast(feedbackById("appointment_deleted"));
                        setActionSheet(null);
                        router.refresh();
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
          );

          return portalTarget ? createPortal(actionSheetNode, portalTarget) : actionSheetNode;
        })()}

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

      <AppointmentDetailsSheet
        open={detailsOpen}
        loading={detailsLoading}
        details={detailsData}
        attendanceCode={detailsAttendanceCode}
        actionPending={detailsActionPending}
        signalPercentage={signalPercentage}
        publicBaseUrl={publicBaseUrl}
        messageTemplates={messageTemplates}
        onClose={() => {
          setDetailsOpen(false);
          setDetailsAppointmentId(null);
          setDetailsData(null);
          setDetailsLoading(false);
          setLoadingAppointmentId(null);
          setDetailsActionPending(false);
        }}
        onStartSession={handleOpenAttendance}
        onSendCreatedMessage={() => handleSendMessage("created_confirmation")}
        onSendReminder={handleSendReminder}
        onSendSurvey={handleSendSurvey}
        onSendPaymentCharge={handleSendPaymentCharge}
        onSendPaymentReceipt={handleSendPaymentReceipt}
        onConfirmClient={handleConfirmClient}
        onCancelAppointment={handleCancelAppointment}
        onRecordPayment={handleRecordPayment}
        onSaveEvolution={handleSaveEvolutionFromDetails}
        onStructureEvolution={handleStructureEvolutionFromDetails}
        onNotify={(feedback) => showToast(feedback)}
      />

      <FloatingActionMenu
        actions={[
          {
            label: "Lançamentos financeiros",
            icon: <ArrowUpCircle className="w-5 h-5" />,
            disabled: true,
            helper: "Em dev",
          },
          {
            label: "Bloquear horário",
            icon: <Clock className="w-5 h-5" />,
            onClick: () => {
              availabilityRef.current?.openBlockModal(selectedDate);
            },
            tone: "neutral",
          },
          {
            label: "Novo Cliente",
            icon: <UserPlus className="w-5 h-5" />,
            onClick: () => router.push("/clientes/novo"),
            tone: "green",
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
        ]}
      />
    </>
  );
}
