
import { format, isSameDay, isSameMonth, isValid, parseISO, startOfMonth } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { cancelAppointment } from "../../app/actions";
import { DEFAULT_PUBLIC_BASE_URL } from "../../src/shared/config";
import { feedbackById, feedbackFromError } from "../../src/shared/feedback/user-feedback";
import { useSupabaseRealtimeRefresh } from "../../src/shared/realtime/use-supabase-realtime-refresh";
import { buildClientReferenceCode, buildServiceReferenceCode, normalizeReferenceToken } from "./appointment-reference";
import { useMobileAgendaDerivedData } from "./use-mobile-agenda-derived-data";
import { useMobileAgendaDetails } from "./use-mobile-agenda-details";
import { useMobileAgendaDetailsActions } from "./use-mobile-agenda-details-actions";
import { useMobileAgendaScreenState } from "./use-mobile-agenda-screen-state";
import { useMobileAgendaSearchEffect } from "./use-mobile-agenda-search-effect";
import { useMobileAgendaDayNavigation } from "./use-mobile-agenda-day-navigation";
import type { AgendaView, MobileAgendaProps } from "./mobile-agenda.types";
import { parseAgendaDate } from "./mobile-agenda.helpers";

export function useMobileAgendaScreenController({
  appointments,
  blocks,
  signalPercentage = 30,
  publicBaseUrl = DEFAULT_PUBLIC_BASE_URL,
  messageTemplates,
}: MobileAgendaProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialView = useMemo<AgendaView>(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "week" || viewParam === "month" || viewParam === "day") return viewParam;
    return "day";
  }, [searchParams]);

  const initialDate = useMemo(() => {
    const dateParam = searchParams.get("date");
    if (!dateParam) return new Date();
    const parsed = parseISO(dateParam);
    return isValid(parsed) ? parsed : new Date();
  }, [searchParams]);

  const {
    headerCompact,
    setHeaderCompact,
    isOnline,
    setIsOnline,
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    view,
    setView,
    isMonthPickerOpen,
    setIsMonthPickerOpen,
    isSearchOpen,
    setIsSearchOpen,
    searchTerm,
    setSearchTerm,
    searchMode,
    setSearchMode,
    searchResults,
    setSearchResults,
    isSearching,
    setIsSearching,
    detailsActionPending,
    setDetailsActionPending,
    actionSheet,
    setActionSheet,
    isActionPending,
    setIsActionPending,
    monthPickerYear,
    setMonthPickerYear,
    portalTarget,
    setPortalTarget,
    toast,
    showToast,
    daySliderRef,
    lastSnapIndex,
    availabilityRef,
    isUserScrolling,
    skipAutoScrollSync,
    pendingViewRef,
    selectedDateRef,
    scrollIdleTimeout,
    createdToastShown,
    now,
    setNow,
  } = useMobileAgendaScreenState({ initialDate, initialView });

  const redirectToLogin = useCallback((loginUrl?: string | null) => {
    if (typeof window === "undefined") return;
    const fallbackNext = `${window.location.pathname}${window.location.search}`;
    const fallbackLogin = `/auth/login?reason=forbidden&next=${encodeURIComponent(fallbackNext)}`;
    window.location.assign(loginUrl?.trim() || fallbackLogin);
  }, []);

  const {
    loadingAppointmentId,
    detailsOpen,
    detailsAppointmentId,
    detailsData,
    detailsLoading,
    openDetailsForAppointment,
    refreshAttendanceDetails,
    closeDetails,
  } = useMobileAgendaDetails({
    appointments,
    searchParams,
    router,
    selectedDateRef,
    setSelectedDate,
    setCurrentMonth,
    showToast,
  });

  const {
    timeColumnWidth,
    timeColumnGap,
    timelineLeftOffset,
    timeGridConfig,
    slotHeight,
    timeSlots,
    timelineHeight,
    monthDays,
    appointmentsByDay,
    blocksByDay,
    weekDays,
  } = useMobileAgendaDerivedData({
    appointments,
    blocks,
    currentMonth,
    selectedDate,
    view,
  });

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
    [pendingViewRef, setView, syncViewToUrl]
  );

  useEffect(() => {
    if (view === "month") return;
    if (!isSameMonth(selectedDate, currentMonth)) {
      setCurrentMonth(startOfMonth(selectedDate));
    }
  }, [currentMonth, selectedDate, setCurrentMonth, view]);

  useEffect(() => {
    setMonthPickerYear(currentMonth.getFullYear());
  }, [currentMonth, setMonthPickerYear]);

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
      if (pendingViewRef.current && viewParam !== pendingViewRef.current) return;
      if (viewParam !== view) setView(viewParam);
      if (pendingViewRef.current === viewParam) {
        pendingViewRef.current = null;
      }
    }
  }, [pendingViewRef, searchParams, selectedDateRef, setCurrentMonth, setSelectedDate, setView, view]);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate, selectedDateRef]);

  useEffect(() => {
    const container = document.querySelector("[data-shell-scroll]") as HTMLElement | null;
    if (!container) return;
    const handle = () => setHeaderCompact(container.scrollTop > 32);
    handle();
    container.addEventListener("scroll", handle, { passive: true });
    return () => container.removeEventListener("scroll", handle);
  }, [setHeaderCompact]);

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
  }, [setIsOnline]);

  useEffect(() => {
    setPortalTarget(document.getElementById("app-frame"));
  }, [setPortalTarget]);

  useMobileAgendaSearchEffect({
    isSearchOpen,
    searchTerm,
    searchMode,
    redirectToLoginAction: redirectToLogin,
    setIsSearchingAction: setIsSearching,
    setSearchModeAction: setSearchMode,
    setSearchResultsAction: setSearchResults,
  });

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
  }, [createdToastShown, router, searchParams, showToast]);

  const { monthLabels, handleDayScroll, handleGoToToday, getDayData } = useMobileAgendaDayNavigation({
    appointmentsByDay,
    blocksByDay,
    view,
    setViewAndSyncAction: setViewAndSync,
    selectedDate,
    setSelectedDateAction: setSelectedDate,
    currentMonth,
    setCurrentMonthAction: setCurrentMonth,
    setIsMonthPickerOpenAction: setIsMonthPickerOpen,
    monthDays,
    daySliderRef,
    lastSnapIndex,
    isUserScrolling,
    skipAutoScrollSync,
    scrollIdleTimeout,
    setNowAction: setNow,
  });

  const detailsAttendanceCode = useMemo(() => {
    const appointment = detailsData?.appointment;
    if (!appointment) return null;
    const persistedCode =
      typeof appointment.attendance_code === "string" ? appointment.attendance_code.trim() : "";
    if (persistedCode) return persistedCode;

    const startDate = parseAgendaDate(appointment.start_time);
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
        const itemDate = parseAgendaDate(item.start_time);
        if (!isValid(itemDate)) return false;
        return (
          format(itemDate, "yyyy-MM-dd") === dayKey &&
          normalizeReferenceToken(item.service_name ?? "") === normalizedServiceName
        );
      })
      .slice()
      .sort((a, b) => {
        const timeDiff = parseAgendaDate(a.start_time).getTime() - parseAgendaDate(b.start_time).getTime();
        if (timeDiff !== 0) return timeDiff;
        return a.id.localeCompare(b.id);
      });
    const sequenceIndex = sameServiceDayAppointments.findIndex((item) => item.id === appointment.id);
    const sequence = String(sequenceIndex >= 0 ? sequenceIndex + 1 : 1).padStart(2, "0");
    const dateToken = format(startDate, "ddMMyy");
    return `${serviceCode}-${clientCode}-${dateToken}-${sequence}`;
  }, [appointments, detailsData?.appointment]);

  const {
    handleSendMessage,
    handleSendPaymentCharge,
    handleSendPaymentReceipt,
    handleSendReminder,
    handleSendSurvey,
    handleConfirmClient,
    handleCancelAppointment,
    handleRecordPayment,
    handleSaveEvolutionFromDetails,
    handleStructureEvolutionFromDetails,
    handleOpenAttendance,
  } = useMobileAgendaDetailsActions({
    detailsData,
    publicBaseUrl,
    view,
    selectedDate,
    router,
    closeDetails,
    showToast,
    refreshAttendanceDetails,
    setDetailsActionPending,
  });

  const realtimeTables = useMemo(
    () => [
      { table: "appointments" },
      { table: "availability_blocks" },
      { table: "appointment_payments" },
      { table: "notification_jobs" },
    ],
    []
  );

  useSupabaseRealtimeRefresh({
    channelName: "mobile-agenda-live",
    tables: realtimeTables,
    onRefresh: () => {
      router.refresh();
      if (detailsOpen && detailsAppointmentId) {
        void refreshAttendanceDetails(detailsAppointmentId);
      }
    },
  });

  return {
    router,
    headerCompact,
    isOnline,
    currentMonth,
    view,
    monthPickerYear,
    monthLabels,
    isMonthPickerOpen,
    setIsMonthPickerOpen,
    setMonthPickerYear,
    setCurrentMonth,
    setSelectedDate,
    setViewAndSync,
    isSearchOpen,
    setIsSearchOpen,
    setSearchMode,
    searchTerm,
    setSearchTerm,
    isSearching,
    searchResults,
    detailsOpen,
    detailsLoading,
    detailsData,
    detailsAttendanceCode,
    detailsActionPending,
    setDetailsActionPending,
    signalPercentage,
    publicBaseUrl,
    messageTemplates,
    closeDetails,
    handleOpenAttendance,
    handleSendMessage,
    handleSendReminder,
    handleSendSurvey,
    handleSendPaymentCharge,
    handleSendPaymentReceipt,
    handleConfirmClient,
    handleCancelAppointment,
    handleRecordPayment,
    handleSaveEvolutionFromDetails,
    handleStructureEvolutionFromDetails,
    availabilityRef,
    selectedDate,
    monthDays,
    now,
    timeGridConfig,
    timeSlots,
    slotHeight,
    timelineHeight,
    timelineLeftOffset,
    timeColumnWidth,
    timeColumnGap,
    loadingAppointmentId,
    daySliderRef,
    handleDayScroll,
    handleGoToToday,
    openDetailsForAppointment,
    setActionSheet,
    getDayData,
    weekDays,
    actionSheet,
    portalTarget,
    isActionPending,
    setIsActionPending,
    cancelAppointment,
    feedbackById,
    feedbackFromError,
    toast,
    showToast,
  };
}
