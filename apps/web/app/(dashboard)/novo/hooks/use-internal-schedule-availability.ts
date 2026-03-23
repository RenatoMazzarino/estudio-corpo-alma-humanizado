import { format, isBefore, isSameMonth, parseISO, startOfDay, startOfMonth } from "date-fns";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { getAvailableSlots, getDateBlockStatus, getMonthAvailableDays, getMonthCalendarOverview } from "../availability";

type UseInternalScheduleAvailabilityParams = {
  safeDate: string;
  initialDate?: string | null;
  selectedDate: string;
  selectedTime: string;
  selectedServiceId: string;
  selectedServiceAcceptsHomeVisit: boolean;
  hasLocationChoice: boolean;
  isHomeVisit: boolean;
  isEditing: boolean;
  initialTimeRef: MutableRefObject<string>;
  selectedTimeRef: MutableRefObject<string>;
  setSelectedDate: (value: string) => void;
  setSelectedTime: Dispatch<SetStateAction<string>>;
};

export function useInternalScheduleAvailability(params: UseInternalScheduleAvailabilityParams) {
  const {
    hasLocationChoice,
    initialDate,
    initialTimeRef,
    isEditing,
    isHomeVisit,
    safeDate,
    selectedDate,
    selectedTime,
    selectedServiceAcceptsHomeVisit,
    selectedServiceId,
    selectedTimeRef,
    setSelectedDate,
    setSelectedTime,
  } = params;

  const [activeMonth, setActiveMonth] = useState<Date>(() =>
    startOfMonth(parseISO(`${(initialDate ?? safeDate)}T00:00:00`))
  );
  const [monthAvailability, setMonthAvailability] = useState<Record<string, boolean>>({});
  const [monthCalendarOverview, setMonthCalendarOverview] = useState<
    Record<
      string,
      {
        hasStudioAppointment: boolean;
        hasHomeVisit: boolean;
        hasShiftBlock: boolean;
        hasPartialBlock: boolean;
      }
    >
  >({});
  const [isLoadingMonthAvailability, setIsLoadingMonthAvailability] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [hasBlocks, setHasBlocks] = useState(false);
  const [hasShiftBlock, setHasShiftBlock] = useState(false);
  const [blockedRanges, setBlockedRanges] = useState<Array<{ startMinutes: number; endMinutes: number }>>([]);
  const [selectedDateBlockTitle, setSelectedDateBlockTitle] = useState<string | null>(null);
  const [blockStatus, setBlockStatus] = useState<"idle" | "loading">("idle");
  const selectedDateHasAvailabilityKey = useMemo(
    () =>
      selectedDate
        ? Object.prototype.hasOwnProperty.call(monthAvailability, selectedDate)
        : false,
    [monthAvailability, selectedDate]
  );
  const selectedDateIsAvailable = useMemo(
    () => (selectedDate ? monthAvailability[selectedDate] === true : false),
    [monthAvailability, selectedDate]
  );
  const slotsRequestRef = useRef(0);

  useEffect(() => {
    if (!selectedDate) return;
    const parsed = parseISO(`${selectedDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return;
    setActiveMonth(startOfMonth(parsed));
  }, [selectedDate]);

  useEffect(() => {
    let active = true;
    async function loadMonthAvailability() {
      if (
        !selectedServiceId ||
        (selectedServiceAcceptsHomeVisit && !hasLocationChoice)
      ) {
        setMonthAvailability({});
        return;
      }

      setIsLoadingMonthAvailability(true);
      try {
        const map = await getMonthAvailableDays({
          serviceId: selectedServiceId,
          month: format(activeMonth, "yyyy-MM"),
          isHomeVisit,
          ignoreBlocks: true,
        });
        if (!active) return;
        setMonthAvailability(map);
      } catch {
        if (!active) return;
        setMonthAvailability({});
      } finally {
        if (active) setIsLoadingMonthAvailability(false);
      }
    }

    loadMonthAvailability();
    return () => {
      active = false;
    };
  }, [
    activeMonth,
    hasLocationChoice,
    isHomeVisit,
    selectedServiceAcceptsHomeVisit,
    selectedServiceId,
  ]);

  useEffect(() => {
    let active = true;

    async function loadMonthOverview() {
      try {
        const month = format(activeMonth, "yyyy-MM");
        const data = await getMonthCalendarOverview(month);
        if (!active) return;
        setMonthCalendarOverview(data);
      } catch {
        if (!active) return;
        setMonthCalendarOverview({});
      }
    }

    loadMonthOverview();
    return () => {
      active = false;
    };
  }, [activeMonth]);

  useEffect(() => {
    const requestId = ++slotsRequestRef.current;
    let active = true;

    async function fetchSlots() {
      if (
        !selectedServiceId ||
        !selectedDate ||
        (selectedServiceAcceptsHomeVisit && !hasLocationChoice)
      ) {
        setIsLoadingSlots(false);
        setAvailableSlots([]);
        setSelectedTime("");
        return;
      }

      if (!selectedDateHasAvailabilityKey) {
        setIsLoadingSlots(false);
        return;
      }

      if (!selectedDateIsAvailable) {
        setIsLoadingSlots(false);
        setAvailableSlots([]);
        setSelectedTime("");
        return;
      }

      setIsLoadingSlots(true);
      try {
        const slots = await getAvailableSlots({
          serviceId: selectedServiceId,
          date: selectedDate,
          isHomeVisit,
          ignoreBlocks: true,
        });
        if (!active || slotsRequestRef.current !== requestId) return;
        const normalizedSlots = slots;
        setAvailableSlots(normalizedSlots);
        const preferred = isEditing
          ? selectedTimeRef.current || initialTimeRef.current
          : "";
        if (preferred && normalizedSlots.includes(preferred)) {
          setSelectedTime(preferred);
        } else {
          setSelectedTime((currentValue) => {
            if (currentValue && normalizedSlots.includes(currentValue)) {
              return currentValue;
            }
            return "";
          });
        }
      } catch {
        if (!active || slotsRequestRef.current !== requestId) return;
        setAvailableSlots([]);
        setSelectedTime("");
      } finally {
        if (active && slotsRequestRef.current === requestId) {
          setIsLoadingSlots(false);
        }
      }
    }

    fetchSlots();

    return () => {
      active = false;
    };
  }, [
    hasLocationChoice,
    initialTimeRef,
    isEditing,
    isHomeVisit,
    selectedDateHasAvailabilityKey,
    selectedDateIsAvailable,
    selectedDate,
    selectedServiceAcceptsHomeVisit,
    selectedServiceId,
    selectedTimeRef,
    setSelectedTime,
  ]);

  useEffect(() => {
    async function fetchBlockStatus() {
      if (!selectedDate) {
        setHasBlocks(false);
        setHasShiftBlock(false);
        setBlockedRanges([]);
        setSelectedDateBlockTitle(null);
        return;
      }
      setBlockStatus("loading");
      try {
        const result = await getDateBlockStatus({ date: selectedDate });
        setHasBlocks(result.hasBlocks);
        setHasShiftBlock(result.hasShift);
        setBlockedRanges(result.blockedRanges);
        setSelectedDateBlockTitle(result.primaryBlockTitle);
      } catch {
        setHasBlocks(false);
        setHasShiftBlock(false);
        setBlockedRanges([]);
        setSelectedDateBlockTitle(null);
      } finally {
        setBlockStatus("idle");
      }
    }

    fetchBlockStatus();
  }, [selectedDate]);

  const hasSelectedTimeBlock = useMemo(() => {
    if (!selectedTime) return false;
    const [hourRaw, minuteRaw] = selectedTime.split(":");
    const hour = Number(hourRaw ?? "0");
    const minute = Number(minuteRaw ?? "0");
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
    const selectedMinutes = hour * 60 + minute;

    return blockedRanges.some((range) => {
      if (range.endMinutes === range.startMinutes) return true;
      if (range.endMinutes < range.startMinutes) {
        return selectedMinutes >= range.startMinutes || selectedMinutes < range.endMinutes;
      }
      return selectedMinutes >= range.startMinutes && selectedMinutes < range.endMinutes;
    });
  }, [blockedRanges, selectedTime]);

  const checkScheduleDayBlockStatus = useCallback(async (dateIso: string) => {
    try {
      const result = await getDateBlockStatus({ date: dateIso });
      return {
        hasShiftBlock: result.hasShift,
        hasBlocks: result.hasBlocks,
        blockTitle: result.primaryBlockTitle,
      };
    } catch {
      return {
        hasShiftBlock: false,
        hasBlocks: false,
        blockTitle: null,
      };
    }
  }, []);

  const handleSelectScheduleDay = (day: Date) => {
    const iso = format(day, "yyyy-MM-dd");
    setSelectedDate(iso);
    setSelectedTime("");
  };

  const handleChangeScheduleMonth = (nextMonth: Date) => {
    setActiveMonth(startOfMonth(nextMonth));
    setSelectedTime("");
  };

  const isScheduleDayDisabled = (day: Date) => {
    if (!isSameMonth(day, activeMonth)) return true;
    if (isBefore(day, startOfDay(new Date()))) return true;
    if (!selectedServiceId) return true;
    if (selectedServiceAcceptsHomeVisit && !hasLocationChoice) return true;
    const iso = format(day, "yyyy-MM-dd");
    if (!(iso in monthAvailability)) return isLoadingMonthAvailability;
    return monthAvailability[iso] !== true;
  };

  return {
    activeMonth,
    availableSlots,
    blockStatus,
    checkScheduleDayBlockStatus,
    handleChangeScheduleMonth,
    handleSelectScheduleDay,
    hasBlocks,
    hasSelectedTimeBlock,
    hasShiftBlock,
    isLoadingMonthAvailability,
    isLoadingSlots,
    isScheduleDayDisabled,
    monthCalendarOverview,
    selectedDateBlockTitle,
  };
}
