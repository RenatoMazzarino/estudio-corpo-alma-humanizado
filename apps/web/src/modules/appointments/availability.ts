"use server";

import { getDay, parseISO } from "date-fns";
import { createServiceClient } from "../../../lib/supabase/service";
import { AppError } from "../../shared/errors/AppError";
import { mapSupabaseError } from "../../shared/errors/mapSupabaseError";
import { getAvailableSlotsSchema } from "../../shared/validation/appointments";

interface GetSlotsParams {
  tenantId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  isHomeVisit?: boolean;
}

interface AppointmentSlotRow {
  start_time: string;
  finished_at: string | null;
  total_duration_minutes: number | null;
  status: string;
  is_home_visit: boolean | null;
  services:
    | {
        duration_minutes: number;
        buffer_before_minutes: number | null;
        buffer_after_minutes: number | null;
        custom_buffer_minutes: number | null;
      }
    | { duration_minutes: number; buffer_before_minutes: number | null; buffer_after_minutes: number | null; custom_buffer_minutes: number | null }[]
    | null;
}

interface AvailabilityBlockRow {
  start_time: string;
  end_time: string;
}

const resolveBuffer = (...values: Array<number | null | undefined>) => {
  const positive = values.find((value) => typeof value === "number" && value > 0);
  if (positive !== undefined) return positive;
  return 0;
};

const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

const parseTimeToMinutes = (time: string) => {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw ?? "0");
  const minute = Number(minuteRaw ?? "0");
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
};

const formatMinutes = (minutes: number) => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const mins = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
};

const getBrazilMinutes = (isoValue: string) => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return 0;
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

export async function getAvailableSlots({ tenantId, serviceId, date, isHomeVisit = false }: GetSlotsParams): Promise<string[]> {
  const supabase = createServiceClient();
  const parsed = getAvailableSlotsSchema.safeParse({ tenantId, serviceId, date, isHomeVisit });
  if (!parsed.success) {
    throw new AppError("Dados inválidos para disponibilidade", "VALIDATION_ERROR", 400, parsed.error);
  }

  const [serviceRes, settingsRes, businessHourRes] = await Promise.all([
    supabase
      .from("services")
      .select("duration_minutes, custom_buffer_minutes, buffer_before_minutes, buffer_after_minutes")
      .eq("id", parsed.data.serviceId)
      .single(),
    supabase
      .from("settings")
      .select("default_studio_buffer, default_home_buffer, buffer_before_minutes, buffer_after_minutes")
      .eq("tenant_id", parsed.data.tenantId)
      .single(),
    supabase
      .from("business_hours")
      .select("open_time, close_time, is_closed")
      .eq("tenant_id", parsed.data.tenantId)
      .eq("day_of_week", getDay(parseISO(`${parsed.data.date}T12:00:00-03:00`)))
      .single()
  ]);

  const serviceError = mapSupabaseError(serviceRes.error);
  if (serviceError) throw serviceError;
  if (settingsRes.error && settingsRes.error.code !== "PGRST116") {
    throw mapSupabaseError(settingsRes.error) ?? new AppError("Erro ao carregar settings", "SUPABASE_ERROR");
  }
  if (businessHourRes.error && businessHourRes.error.code !== "PGRST116") {
    throw mapSupabaseError(businessHourRes.error) ?? new AppError("Erro ao carregar horários", "SUPABASE_ERROR");
  }

  const service = serviceRes.data;
  const settings = settingsRes.data;
  const businessHour = businessHourRes.data;

  if (!service) return [];
  if (!businessHour || businessHour.is_closed) return [];

  const serviceDuration = service.duration_minutes || 30;
  const bufferBefore = isHomeVisit
    ? resolveBuffer(
        service.buffer_before_minutes,
        settings?.buffer_before_minutes,
        settings?.default_home_buffer,
        service.custom_buffer_minutes,
        settings?.default_studio_buffer,
        30
      )
    : resolveBuffer(
        service.buffer_before_minutes,
        settings?.buffer_before_minutes,
        service.custom_buffer_minutes,
        settings?.default_studio_buffer,
        30
      );
  const bufferAfter = isHomeVisit
    ? resolveBuffer(
        service.buffer_after_minutes,
        settings?.buffer_after_minutes,
        settings?.default_home_buffer,
        service.custom_buffer_minutes,
        settings?.default_studio_buffer,
        30
      )
    : resolveBuffer(
        service.buffer_after_minutes,
        settings?.buffer_after_minutes,
        service.custom_buffer_minutes,
        settings?.default_studio_buffer,
        30
      );

  const startOfDayStr = `${parsed.data.date}T00:00:00-03:00`;
  const endOfDayStr = `${parsed.data.date}T23:59:59-03:00`;

  const [appointmentsRes, blocksRes] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "start_time, finished_at, total_duration_minutes, status, is_home_visit, services(duration_minutes, buffer_before_minutes, buffer_after_minutes, custom_buffer_minutes)"
      )
      .eq("tenant_id", parsed.data.tenantId)
      .not("status", "in", "(canceled_by_client,canceled_by_studio,no_show)")
      .gte("start_time", startOfDayStr)
      .lte("start_time", endOfDayStr),
    supabase
      .from("availability_blocks")
      .select("start_time, end_time")
      .eq("tenant_id", parsed.data.tenantId)
      .gte("end_time", startOfDayStr)
      .lte("start_time", endOfDayStr)
  ]);

  const appointments = (appointmentsRes.data || []) as AppointmentSlotRow[];
  const blocks = (blocksRes.data || []) as AvailabilityBlockRow[];

  const slots: string[] = [];
  const openTimeStr = businessHour.open_time.slice(0, 5);
  const closeTimeStr = businessHour.close_time.slice(0, 5);

  const openMinutes = parseTimeToMinutes(openTimeStr);
  const closeMinutes = parseTimeToMinutes(closeTimeStr);

  let currentSlot = openMinutes;

  while (currentSlot <= closeMinutes) {
    const slotBlockStart = currentSlot - bufferBefore;
    const slotBlockEnd = currentSlot + serviceDuration + bufferAfter;

    const collidesWithAppt = appointments.some((appt) => {
      const apptStartMinutes = getBrazilMinutes(appt.start_time);
      const serviceData = Array.isArray(appt.services) ? appt.services[0] ?? null : appt.services;
      const apptBufferBefore = appt.is_home_visit
        ? resolveBuffer(
            serviceData?.buffer_before_minutes,
            settings?.buffer_before_minutes,
            settings?.default_home_buffer,
            serviceData?.custom_buffer_minutes,
            settings?.default_studio_buffer,
            30
          )
        : resolveBuffer(
            serviceData?.buffer_before_minutes,
            settings?.buffer_before_minutes,
            serviceData?.custom_buffer_minutes,
            settings?.default_studio_buffer,
            30
          );
      const apptBufferAfter = appt.is_home_visit
        ? resolveBuffer(
            serviceData?.buffer_after_minutes,
            settings?.buffer_after_minutes,
            settings?.default_home_buffer,
            serviceData?.custom_buffer_minutes,
            settings?.default_studio_buffer,
            30
          )
        : resolveBuffer(
            serviceData?.buffer_after_minutes,
            settings?.buffer_after_minutes,
            serviceData?.custom_buffer_minutes,
            settings?.default_studio_buffer,
            30
          );
      const apptServiceDuration = serviceData?.duration_minutes ?? 30;
      const apptTotalDuration =
        (appt.total_duration_minutes && appt.total_duration_minutes > 0
          ? appt.total_duration_minutes
          : apptServiceDuration + apptBufferBefore + apptBufferAfter) || apptServiceDuration;
      const apptBlockStart = apptStartMinutes - apptBufferBefore;
      const apptBlockEnd = apptStartMinutes + apptTotalDuration - apptBufferBefore;

      return slotBlockStart < apptBlockEnd && slotBlockEnd > apptBlockStart;
    });

    const collidesWithBlock = blocks.some((block) => {
      const blockStart = getBrazilMinutes(block.start_time);
      const blockEnd = getBrazilMinutes(block.end_time);

      return slotBlockStart < blockEnd && slotBlockEnd > blockStart;
    });

    if (!collidesWithAppt && !collidesWithBlock) {
      slots.push(formatMinutes(currentSlot));
    }

    currentSlot += 30;
  }

  return slots;
}
