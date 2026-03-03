
import { format, isSameDay, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCallback, useEffect, useMemo } from "react";
import type { MutableRefObject, UIEvent } from "react";
import { buildAgendaDayData } from "./mobile-agenda-day-data";
import type { AgendaView, Appointment, AvailabilityBlock } from "./mobile-agenda.types";

type Params = {
  appointmentsByDay: Map<string, Appointment[]>;
  blocksByDay: Map<string, AvailabilityBlock[]>;
  view: AgendaView;
  setViewAndSyncAction: (nextView: AgendaView, nextDate?: Date) => void;
  selectedDate: Date;
  setSelectedDateAction: (value: Date) => void;
  currentMonth: Date;
  setCurrentMonthAction: (value: Date) => void;
  setIsMonthPickerOpenAction: (value: boolean) => void;
  monthDays: Date[];
  daySliderRef: MutableRefObject<HTMLDivElement | null>;
  lastSnapIndex: MutableRefObject<number>;
  isUserScrolling: MutableRefObject<boolean>;
  skipAutoScrollSync: MutableRefObject<boolean>;
  scrollIdleTimeout: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setNowAction: (value: Date) => void;
};

export function useMobileAgendaDayNavigation({
  appointmentsByDay,
  blocksByDay,
  view,
  setViewAndSyncAction,
  selectedDate,
  setSelectedDateAction,
  currentMonth,
  setCurrentMonthAction,
  setIsMonthPickerOpenAction,
  monthDays,
  daySliderRef,
  lastSnapIndex,
  isUserScrolling,
  skipAutoScrollSync,
  scrollIdleTimeout,
  setNowAction,
}: Params) {
  const getDayData = useCallback(
    (day: Date) =>
      buildAgendaDayData({
        day,
        appointmentsByDay,
        blocksByDay,
      }),
    [appointmentsByDay, blocksByDay]
  );

  const scrollToDate = useCallback(
    (value: Date) => {
      if (!daySliderRef.current) return;
      const index = monthDays.findIndex((day) => isSameDay(day, value));
      if (index < 0) return;
      const width = daySliderRef.current.clientWidth;
      daySliderRef.current.scrollTo({ left: width * index, behavior: "smooth" });
      lastSnapIndex.current = index;
    },
    [daySliderRef, lastSnapIndex, monthDays]
  );

  useEffect(() => {
    if (view !== "day") return;
    if (skipAutoScrollSync.current) {
      skipAutoScrollSync.current = false;
      return;
    }
    if (isUserScrolling.current) return;
    scrollToDate(selectedDate);
  }, [isUserScrolling, scrollToDate, selectedDate, skipAutoScrollSync, view]);

  useEffect(() => {
    if (view !== "day") return;
    setNowAction(new Date());
    let interval: ReturnType<typeof setInterval> | null = null;
    const delay = 60000 - (Date.now() % 60000);
    const timeout = setTimeout(() => {
      setNowAction(new Date());
      interval = setInterval(() => setNowAction(new Date()), 60000);
    }, delay);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [setNowAction, view]);

  const handleDayScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
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
          setSelectedDateAction(nextDay);
        }
        isUserScrolling.current = false;
      }, 120);
    },
    [
      isUserScrolling,
      lastSnapIndex,
      monthDays,
      scrollIdleTimeout,
      selectedDate,
      setSelectedDateAction,
      skipAutoScrollSync,
    ]
  );

  const handleGoToToday = useCallback(() => {
    const today = new Date();
    isUserScrolling.current = false;
    skipAutoScrollSync.current = false;
    setSelectedDateAction(today);
    setCurrentMonthAction(startOfMonth(today));
    setViewAndSyncAction("day", today);
    setIsMonthPickerOpenAction(false);
  }, [
    isUserScrolling,
    setCurrentMonthAction,
    setIsMonthPickerOpenAction,
    setSelectedDateAction,
    setViewAndSyncAction,
    skipAutoScrollSync,
  ]);

  const monthLabels = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        format(new Date(currentMonth.getFullYear(), index, 1), "MMM", { locale: ptBR }).toUpperCase()
      ),
    [currentMonth]
  );

  return {
    monthLabels,
    handleDayScroll,
    handleGoToToday,
    getDayData,
  };
}
