import { format, isBefore, isSameMonth, startOfDay, startOfMonth } from "date-fns";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { getAvailableSlots, getMonthAvailableDays } from "../availability";

type UsePublicBookingAvailabilityParams = {
  activeMonth: Date;
  date: string;
  enabled: boolean;
  isHomeVisit: boolean;
  onlineCutoffBeforeCloseMinutes: number;
  onlineLastSlotBeforeCloseMinutes: number;
  selectedServiceId: string | null;
  setActiveMonth: Dispatch<SetStateAction<Date>>;
  setDate: Dispatch<SetStateAction<string>>;
  setSelectedTime: Dispatch<SetStateAction<string>>;
  tenantId: string;
};

export function usePublicBookingAvailability(params: UsePublicBookingAvailabilityParams) {
  const {
    activeMonth,
    date,
    enabled,
    isHomeVisit,
    onlineCutoffBeforeCloseMinutes,
    onlineLastSlotBeforeCloseMinutes,
    selectedServiceId,
    setActiveMonth,
    setDate,
    setSelectedTime,
    tenantId,
  } = params;

  const [monthAvailability, setMonthAvailability] = useState<Record<string, boolean>>({});
  const [daySlotsByDate, setDaySlotsByDate] = useState<Record<string, string[]>>({});
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [isLoadingDaySlots, setIsLoadingDaySlots] = useState(false);

  const availableSlots = useMemo(() => daySlotsByDate[date] ?? [], [date, daySlotsByDate]);

  useEffect(() => {
    if (!enabled || !selectedServiceId) return;
    let active = true;

    const loadAvailability = async () => {
      setIsLoadingMonth(true);
      setMonthAvailability({});
      try {
        const map = await getMonthAvailableDays({
          tenantId,
          serviceId: selectedServiceId,
          month: format(activeMonth, "yyyy-MM"),
          isHomeVisit,
          cutoffBeforeCloseMinutes: onlineCutoffBeforeCloseMinutes,
          lastSlotBeforeCloseMinutes: onlineLastSlotBeforeCloseMinutes,
        });
        if (!active) return;
        setMonthAvailability(map);
      } catch {
        if (!active) return;
        setMonthAvailability({});
      } finally {
        if (active) setIsLoadingMonth(false);
      }
    };

    loadAvailability();

    return () => {
      active = false;
    };
  }, [
    activeMonth,
    enabled,
    isHomeVisit,
    onlineCutoffBeforeCloseMinutes,
    onlineLastSlotBeforeCloseMinutes,
    selectedServiceId,
    tenantId,
  ]);

  useEffect(() => {
    if (!enabled || !selectedServiceId || !date) return;
    if (!monthAvailability[date]) {
      setSelectedTime("");
      return;
    }
    if (daySlotsByDate[date]) return;

    let active = true;
    const loadDaySlots = async () => {
      setIsLoadingDaySlots(true);
      try {
        const slots = await getAvailableSlots({
          tenantId,
          serviceId: selectedServiceId!,
          date,
          isHomeVisit,
          cutoffBeforeCloseMinutes: onlineCutoffBeforeCloseMinutes,
          lastSlotBeforeCloseMinutes: onlineLastSlotBeforeCloseMinutes,
        });
        if (!active) return;
        setDaySlotsByDate((prev) => ({ ...prev, [date]: slots }));
      } catch {
        if (!active) return;
        setDaySlotsByDate((prev) => ({ ...prev, [date]: [] }));
      } finally {
        if (active) setIsLoadingDaySlots(false);
      }
    };

    loadDaySlots();
    return () => {
      active = false;
    };
  }, [
    date,
    enabled,
    isHomeVisit,
    onlineCutoffBeforeCloseMinutes,
    onlineLastSlotBeforeCloseMinutes,
    selectedServiceId,
    setSelectedTime,
    tenantId,
    daySlotsByDate,
    monthAvailability,
  ]);

  useEffect(() => {
    setDaySlotsByDate({});
    setSelectedTime("");
  }, [isHomeVisit, selectedServiceId, setSelectedTime]);

  const handleChangeMonth = (next: Date) => {
    setActiveMonth(next);
    setDate(format(next, "yyyy-MM-01"));
    setSelectedTime("");
  };

  const handleSelectDay = (day: Date) => {
    const iso = format(day, "yyyy-MM-dd");
    setDate(iso);
    setSelectedTime("");
  };

  const isDayDisabled = (day: Date) => {
    const iso = format(day, "yyyy-MM-dd");
    const isPast = isBefore(day, startOfDay(new Date()));
    if (!isSameMonth(day, activeMonth)) return true;
    if (isPast || isLoadingMonth) return true;
    return monthAvailability[iso] !== true;
  };

  const resetAvailability = (today: Date) => {
    setDate(format(today, "yyyy-MM-dd"));
    setActiveMonth(startOfMonth(today));
    setSelectedTime("");
    setMonthAvailability({});
    setDaySlotsByDate({});
    setIsLoadingDaySlots(false);
    setIsLoadingMonth(false);
  };

  return {
    availableSlots,
    handleChangeMonth,
    handleSelectDay,
    isDayDisabled,
    isLoadingDaySlots,
    isLoadingMonth,
    resetAvailability,
  };
}
