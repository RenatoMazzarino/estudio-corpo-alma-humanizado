"use server";

import { eachDayOfInterval, endOfMonth, format, getDay, parseISO, startOfDay, startOfMonth } from "date-fns";
import { createServiceClient } from "../../../../lib/supabase/service";
import { getAvailableSlots as getAvailableSlotsImpl } from "../../../../src/modules/appointments/availability";
import { BRAZIL_TZ_OFFSET, BRAZIL_TIME_ZONE } from "../../../../src/shared/timezone";

interface GetSlotsParams {
  tenantId: string;
  serviceId: string;
  date: string;
  isHomeVisit?: boolean;
}

interface GetSlotsWithRulesParams extends GetSlotsParams {
  cutoffBeforeCloseMinutes?: number;
  lastSlotBeforeCloseMinutes?: number;
}

interface GetMonthAvailabilityParams {
  tenantId: string;
  serviceId: string;
  month: string; // YYYY-MM
  isHomeVisit?: boolean;
  cutoffBeforeCloseMinutes?: number;
  lastSlotBeforeCloseMinutes?: number;
}

const DEFAULT_CUTOFF_BEFORE_CLOSE_MINUTES = 60;
const DEFAULT_LAST_SLOT_BEFORE_CLOSE_MINUTES = 30;

function parseTimeToMinutes(time: string) {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw ?? "0");
  const minute = Number(minuteRaw ?? "0");
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
}

function getBrazilDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function getBrazilMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function applyPublicWindowRules(params: {
  dateIso: string;
  slots: string[];
  closeTime: string;
  cutoffBeforeCloseMinutes: number;
  lastSlotBeforeCloseMinutes: number;
}) {
  const closeMinutes = parseTimeToMinutes(params.closeTime.slice(0, 5));
  if (!Number.isFinite(closeMinutes)) return [];

  const latestSlotMinutes = closeMinutes - Math.max(0, params.lastSlotBeforeCloseMinutes);
  if (latestSlotMinutes < 0) return [];

  if (params.dateIso === getBrazilDateKey(new Date())) {
    const cutoffMinutes = closeMinutes - Math.max(0, params.cutoffBeforeCloseMinutes);
    if (getBrazilMinutes(new Date()) > cutoffMinutes) {
      return [];
    }
  }

  return params.slots.filter((slot) => {
    const slotMinutes = parseTimeToMinutes(slot);
    return Number.isFinite(slotMinutes) && slotMinutes <= latestSlotMinutes;
  });
}

export async function getAvailableSlots(params: GetSlotsWithRulesParams): Promise<string[]> {
  const rawSlots = await getAvailableSlotsImpl(params);
  const supabase = createServiceClient();
  const dayOfWeek = getDay(parseISO(`${params.date}T12:00:00${BRAZIL_TZ_OFFSET}`));
  const { data: businessHour } = await supabase
    .from("business_hours")
    .select("close_time, is_closed")
    .eq("tenant_id", params.tenantId)
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  if (!businessHour || businessHour.is_closed) return [];

  return applyPublicWindowRules({
    dateIso: params.date,
    slots: rawSlots,
    closeTime: businessHour.close_time,
    cutoffBeforeCloseMinutes:
      Number.isFinite(Number(params.cutoffBeforeCloseMinutes)) && Number(params.cutoffBeforeCloseMinutes) >= 0
        ? Number(params.cutoffBeforeCloseMinutes)
        : DEFAULT_CUTOFF_BEFORE_CLOSE_MINUTES,
    lastSlotBeforeCloseMinutes:
      Number.isFinite(Number(params.lastSlotBeforeCloseMinutes)) && Number(params.lastSlotBeforeCloseMinutes) >= 0
        ? Number(params.lastSlotBeforeCloseMinutes)
        : DEFAULT_LAST_SLOT_BEFORE_CLOSE_MINUTES,
  });
}

export async function getMonthAvailableDays(params: GetMonthAvailabilityParams): Promise<Record<string, boolean>> {
  const base = parseISO(`${params.month}-01T00:00:00${BRAZIL_TZ_OFFSET}`);
  const start = startOfMonth(base);
  const end = endOfMonth(base);
  const days = eachDayOfInterval({ start, end });
  const today = startOfDay(new Date());
  const supabase = createServiceClient();

  const { data: businessHours } = await supabase
    .from("business_hours")
    .select("day_of_week, close_time, is_closed")
    .eq("tenant_id", params.tenantId);

  const businessHoursByDay = new Map<number, { close_time: string; is_closed: boolean | null }>();
  (businessHours ?? []).forEach((item) => {
    if (item.day_of_week === null || item.day_of_week === undefined) return;
    businessHoursByDay.set(item.day_of_week, {
      close_time: item.close_time,
      is_closed: item.is_closed,
    });
  });

  const cutoffBeforeCloseMinutes =
    Number.isFinite(Number(params.cutoffBeforeCloseMinutes)) && Number(params.cutoffBeforeCloseMinutes) >= 0
      ? Number(params.cutoffBeforeCloseMinutes)
      : DEFAULT_CUTOFF_BEFORE_CLOSE_MINUTES;
  const lastSlotBeforeCloseMinutes =
    Number.isFinite(Number(params.lastSlotBeforeCloseMinutes)) && Number(params.lastSlotBeforeCloseMinutes) >= 0
      ? Number(params.lastSlotBeforeCloseMinutes)
      : DEFAULT_LAST_SLOT_BEFORE_CLOSE_MINUTES;

  const results = await Promise.all(
    days.map(async (day) => {
      const iso = format(day, "yyyy-MM-dd");
      if (day < today) return { date: iso, available: false };
      const dayOfWeek = getDay(parseISO(`${iso}T12:00:00${BRAZIL_TZ_OFFSET}`));
      const businessHour = businessHoursByDay.get(dayOfWeek);
      if (!businessHour || businessHour.is_closed) {
        return { date: iso, available: false };
      }
      const slots = await getAvailableSlotsImpl({
        tenantId: params.tenantId,
        serviceId: params.serviceId,
        date: iso,
        isHomeVisit: params.isHomeVisit,
      });
      const filtered = applyPublicWindowRules({
        dateIso: iso,
        slots,
        closeTime: businessHour.close_time,
        cutoffBeforeCloseMinutes,
        lastSlotBeforeCloseMinutes,
      });
      return { date: iso, available: filtered.length > 0 };
    })
  );

  return results.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.date] = item.available;
    return acc;
  }, {});
}
