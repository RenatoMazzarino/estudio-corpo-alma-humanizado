import { format, isBefore, isSameMonth, parseISO, startOfDay, startOfMonth } from "date-fns";
import { useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { FIXED_TENANT_ID } from "../../../../lib/tenant-context";
import { getAvailableSlots, getDateBlockStatus, getMonthAvailableDays } from "../availability";

type UseInternalScheduleAvailabilityParams = {
  safeDate: string;
  initialDate?: string | null;
  selectedDate: string;
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
  const [isLoadingMonthAvailability, setIsLoadingMonthAvailability] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [hasBlocks, setHasBlocks] = useState(false);
  const [hasShiftBlock, setHasShiftBlock] = useState(false);
  const [blockStatus, setBlockStatus] = useState<"idle" | "loading">("idle");

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
          tenantId: FIXED_TENANT_ID,
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
    async function fetchSlots() {
      if (
        !selectedServiceId ||
        !selectedDate ||
        (selectedServiceAcceptsHomeVisit && !hasLocationChoice)
      ) {
        setAvailableSlots([]);
        setSelectedTime("");
        return;
      }

      if (monthAvailability[selectedDate] !== true) {
        setAvailableSlots([]);
        setSelectedTime("");
        return;
      }

      setIsLoadingSlots(true);
      try {
        const slots = await getAvailableSlots({
          tenantId: FIXED_TENANT_ID,
          serviceId: selectedServiceId,
          date: selectedDate,
          isHomeVisit,
          ignoreBlocks: true,
        });
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
        setAvailableSlots([]);
        setSelectedTime("");
      } finally {
        setIsLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [
    hasLocationChoice,
    initialTimeRef,
    isEditing,
    isHomeVisit,
    selectedDate,
    selectedServiceAcceptsHomeVisit,
    selectedServiceId,
    selectedTimeRef,
    setSelectedTime,
    monthAvailability,
  ]);

  useEffect(() => {
    async function fetchBlockStatus() {
      if (!selectedDate) {
        setHasBlocks(false);
        setHasShiftBlock(false);
        return;
      }
      setBlockStatus("loading");
      try {
        const result = await getDateBlockStatus({ tenantId: FIXED_TENANT_ID, date: selectedDate });
        setHasBlocks(result.hasBlocks);
        setHasShiftBlock(result.hasShift);
      } catch {
        setHasBlocks(false);
        setHasShiftBlock(false);
      } finally {
        setBlockStatus("idle");
      }
    }

    fetchBlockStatus();
  }, [selectedDate]);

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
    handleChangeScheduleMonth,
    handleSelectScheduleDay,
    hasBlocks,
    hasShiftBlock,
    isLoadingMonthAvailability,
    isLoadingSlots,
    isScheduleDayDisabled,
  };
}
