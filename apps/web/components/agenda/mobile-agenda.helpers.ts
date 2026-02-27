import { isValid, parseISO } from "date-fns";
import type { DayItem } from "./mobile-agenda.types";

export const parseAgendaDate = (value: string) => {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date(value);
};

export const formatAgendaDuration = (minutes: number | null) => {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!remainder) return `${hours}h`;
  return `${hours}h ${remainder}m`;
};

export const getAgendaServiceDuration = (item: DayItem) => {
  // For blocked slots, duration comes from start/end interval.
  // For appointments, keep planned duration so the card height stays stable
  // even after finishing earlier/later than expected.
  if (item.type === "block" && item.finished_at) {
    const startTime = parseAgendaDate(item.start_time);
    const endTime = parseAgendaDate(item.finished_at);
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
