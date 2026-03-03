
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useMemo } from "react";
import { getTimeRangeMinutes, type TimeGridConfig } from "../../src/modules/agenda/time-grid";
import { hiddenAppointmentStatuses, type AgendaView, type Appointment, type AvailabilityBlock } from "./mobile-agenda.types";
import { parseAgendaDate } from "./mobile-agenda.helpers";

type Params = {
  appointments: Appointment[];
  blocks: AvailabilityBlock[];
  currentMonth: Date;
  selectedDate: Date;
  view: AgendaView;
};

export function useMobileAgendaDerivedData({
  appointments,
  blocks,
  currentMonth,
  selectedDate,
  view,
}: Params) {
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
      const key = format(parseAgendaDate(appt.start_time), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(appt);
      map.set(key, list);
    });
    return map;
  }, [visibleAppointments]);

  const blocksByDay = useMemo(() => {
    const map = new Map<string, AvailabilityBlock[]>();
    blocks.forEach((block) => {
      const key = format(parseAgendaDate(block.start_time), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(block);
      map.set(key, list);
    });
    return map;
  }, [blocks]);

  const weekDays = useMemo(() => {
    if (view !== "week") return [] as Date[];
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate, view]);

  return {
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
  };
}

