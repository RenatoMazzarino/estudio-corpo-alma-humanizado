"use server";

import { eachDayOfInterval, endOfMonth, format, isBefore, parseISO, startOfDay, startOfMonth } from "date-fns";
import { getAvailableSlots as getAvailableSlotsImpl } from "../../../src/modules/appointments/availability";
import { listAppointmentsInRange, listAvailabilityBlocksInRange } from "../../../src/modules/appointments/repository";
import { requireDashboardAccessForServerAction } from "../../../src/modules/auth/dashboard-access";
import { extractDateKeyFromIsoLike } from "../../../src/shared/datetime";
import { BRAZIL_TIME_ZONE, BRAZIL_TZ_OFFSET } from "../../../src/shared/timezone";

interface GetSlotsParams {
  serviceId: string;
  date: string;
  isHomeVisit?: boolean;
  ignoreBlocks?: boolean;
}

export async function getAvailableSlots(params: GetSlotsParams): Promise<string[]> {
  const { tenantId } = await requireDashboardAccessForServerAction();
  return getAvailableSlotsImpl({ ...params, tenantId });
}

interface GetMonthAvailabilityParams {
  serviceId: string;
  month: string; // YYYY-MM
  isHomeVisit?: boolean;
  ignoreBlocks?: boolean;
}

export async function getMonthAvailableDays(params: GetMonthAvailabilityParams): Promise<Record<string, boolean>> {
  const { tenantId } = await requireDashboardAccessForServerAction();

  const base = parseISO(`${params.month}-01T00:00:00${BRAZIL_TZ_OFFSET}`);
  const start = startOfMonth(base);
  const end = endOfMonth(base);
  const today = startOfDay(new Date());
  const days = eachDayOfInterval({ start, end });

  const results = await Promise.all(
    days.map(async (day) => {
      const iso = format(day, "yyyy-MM-dd");
      if (isBefore(day, today)) return { date: iso, available: false };
      try {
        const slots = await getAvailableSlotsImpl({
          tenantId,
          serviceId: params.serviceId,
          date: iso,
          isHomeVisit: params.isHomeVisit,
          ignoreBlocks: params.ignoreBlocks,
        });
        return { date: iso, available: slots.length > 0 };
      } catch {
        return { date: iso, available: false };
      }
    })
  );

  return results.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.date] = item.available;
    return acc;
  }, {});
}

type MonthCalendarOverviewDay = {
  hasStudioAppointment: boolean;
  hasHomeVisit: boolean;
  hasShiftBlock: boolean;
  hasPartialBlock: boolean;
};

export async function getMonthCalendarOverview(monthStr: string): Promise<Record<string, MonthCalendarOverviewDay>> {
  const { tenantId } = await requireDashboardAccessForServerAction();

  const safeMonth = /^\d{4}-\d{2}$/.test(monthStr) ? monthStr : new Date().toISOString().slice(0, 7);
  const base = parseISO(`${safeMonth}-01T00:00:00${BRAZIL_TZ_OFFSET}`);
  const start = startOfMonth(base).toISOString();
  const end = endOfMonth(base).toISOString();

  const [{ data: appointments }, { data: blocks }] = await Promise.all([
    listAppointmentsInRange(tenantId, start, end),
    listAvailabilityBlocksInRange(tenantId, start, end),
  ]);

  const overview: Record<string, MonthCalendarOverviewDay> = {};

  (appointments ?? []).forEach((appointment) => {
    const key = format(parseISO(appointment.start_time), "yyyy-MM-dd");
    const day = overview[key] ?? {
      hasStudioAppointment: false,
      hasHomeVisit: false,
      hasShiftBlock: false,
      hasPartialBlock: false,
    };
    if (appointment.is_home_visit) {
      day.hasHomeVisit = true;
    } else {
      day.hasStudioAppointment = true;
    }
    overview[key] = day;
  });

  (blocks ?? []).forEach((block) => {
    const key =
      extractDateKeyFromIsoLike(block.start_time) ??
      format(parseISO(block.start_time), "yyyy-MM-dd");
    const day = overview[key] ?? {
      hasStudioAppointment: false,
      hasHomeVisit: false,
      hasShiftBlock: false,
      hasPartialBlock: false,
    };
    const isFullDayShift = (block.block_type ?? "personal") === "shift" && Boolean(block.is_full_day);
    if (isFullDayShift) {
      day.hasShiftBlock = true;
    } else {
      day.hasPartialBlock = true;
    }
    overview[key] = day;
  });

  return overview;
}

interface GetBlockStatusParams {
  date: string;
}

const getBrazilMinutes = (isoValue: string) => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
};

export async function getDateBlockStatus(
  params: GetBlockStatusParams
): Promise<{
  hasBlocks: boolean;
  hasShift: boolean;
  blockedRanges: Array<{ startMinutes: number; endMinutes: number }>;
  blockTitles: string[];
  primaryBlockTitle: string | null;
}> {
  const { tenantId } = await requireDashboardAccessForServerAction();
  const start = new Date(`${params.date}T00:00:00${BRAZIL_TZ_OFFSET}`).toISOString();
  const end = new Date(`${params.date}T23:59:59.999${BRAZIL_TZ_OFFSET}`).toISOString();

  const { data } = await listAvailabilityBlocksInRange(tenantId, start, end);
  const blocks = data ?? [];
  const normalizedBlocks = blocks.map((block) => {
    const blockType = (block.block_type ?? block.reason ?? "").toLowerCase();
    const blockTitle = (block.title ?? block.reason ?? "").trim();
    return {
      blockType,
      blockTitle: blockTitle.length > 0 ? blockTitle : "Bloqueio",
      start_time: block.start_time,
      end_time: block.end_time,
    };
  });

  const hasShift = normalizedBlocks.some((block) => block.blockType === "shift");
  const nonShiftBlockTitles = normalizedBlocks
    .filter((block) => block.blockType !== "shift")
    .map((block) => block.blockTitle);

  const blockedRanges = blocks
    .map((block) => {
      const startMinutes = getBrazilMinutes(block.start_time);
      const endMinutes = getBrazilMinutes(block.end_time);
      if (startMinutes == null || endMinutes == null) return null;
      return { startMinutes, endMinutes };
    })
    .filter((value): value is { startMinutes: number; endMinutes: number } => Boolean(value));

  return {
    hasBlocks: blocks.length > 0,
    hasShift,
    blockedRanges,
    blockTitles: nonShiftBlockTitles,
    primaryBlockTitle: nonShiftBlockTitles[0] ?? null,
  };
}
