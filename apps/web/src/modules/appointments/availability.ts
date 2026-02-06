"use server";

import { addMinutes, format, parse, isBefore, isAfter, getDay, parseISO } from "date-fns";
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
      .eq("day_of_week", getDay(parse(parsed.data.date, "yyyy-MM-dd", new Date())))
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
    ? service.buffer_before_minutes ??
      settings?.buffer_before_minutes ??
      settings?.default_home_buffer ??
      service.custom_buffer_minutes ??
      settings?.default_studio_buffer ??
      30
    : service.buffer_before_minutes ??
      settings?.buffer_before_minutes ??
      service.custom_buffer_minutes ??
      settings?.default_studio_buffer ??
      30;
  const bufferAfter = isHomeVisit
    ? service.buffer_after_minutes ??
      settings?.buffer_after_minutes ??
      settings?.default_home_buffer ??
      service.custom_buffer_minutes ??
      settings?.default_studio_buffer ??
      30
    : service.buffer_after_minutes ??
      settings?.buffer_after_minutes ??
      service.custom_buffer_minutes ??
      settings?.default_studio_buffer ??
      30;

  const startOfDayStr = `${parsed.data.date}T00:00:00`;
  const endOfDayStr = `${parsed.data.date}T23:59:59`;

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
      .gte("start_time", `${parsed.data.date}T00:00:00`)
      .lte("start_time", `${parsed.data.date}T23:59:59`)
  ]);

  const appointments = (appointmentsRes.data || []) as AppointmentSlotRow[];
  const blocks = (blocksRes.data || []) as AvailabilityBlockRow[];

  const slots: string[] = [];
  const openTimeStr = businessHour.open_time.slice(0, 5);
  const closeTimeStr = businessHour.close_time.slice(0, 5);

  const openTime = parse(`${parsed.data.date}T${openTimeStr}`, "yyyy-MM-dd'T'HH:mm", new Date());
  const closeTime = parse(`${parsed.data.date}T${closeTimeStr}`, "yyyy-MM-dd'T'HH:mm", new Date());

  let currentSlot = openTime;

  while (!isAfter(currentSlot, closeTime)) {
    const slotBlockStart = addMinutes(currentSlot, -bufferBefore);
    const slotBlockEnd = addMinutes(currentSlot, serviceDuration + bufferAfter);

    const collidesWithAppt = appointments.some((appt) => {
      const apptStart = parseISO(appt.start_time);
      const serviceData = Array.isArray(appt.services) ? appt.services[0] ?? null : appt.services;
      const apptDuration = serviceData?.duration_minutes ?? appt.total_duration_minutes ?? 30;
      const apptBufferBefore = appt.is_home_visit
        ? serviceData?.buffer_before_minutes ??
          settings?.buffer_before_minutes ??
          settings?.default_home_buffer ??
          serviceData?.custom_buffer_minutes ??
          settings?.default_studio_buffer ??
          30
        : serviceData?.buffer_before_minutes ??
          settings?.buffer_before_minutes ??
          serviceData?.custom_buffer_minutes ??
          settings?.default_studio_buffer ??
          30;
      const apptBufferAfter = appt.is_home_visit
        ? serviceData?.buffer_after_minutes ??
          settings?.buffer_after_minutes ??
          settings?.default_home_buffer ??
          serviceData?.custom_buffer_minutes ??
          settings?.default_studio_buffer ??
          30
        : serviceData?.buffer_after_minutes ??
          settings?.buffer_after_minutes ??
          serviceData?.custom_buffer_minutes ??
          settings?.default_studio_buffer ??
          30;

      const apptBlockStart = addMinutes(apptStart, -apptBufferBefore);
      const apptBlockEnd = addMinutes(apptStart, apptDuration + apptBufferAfter);

      return isBefore(slotBlockStart, apptBlockEnd) && isAfter(slotBlockEnd, apptBlockStart);
    });

    const collidesWithBlock = blocks.some((block) => {
      const blockStart = parseISO(block.start_time);
      const blockEnd = parseISO(block.end_time);

      return isBefore(slotBlockStart, blockEnd) && isAfter(slotBlockEnd, blockStart);
    });

    if (!collidesWithAppt && !collidesWithBlock) {
      slots.push(format(currentSlot, "HH:mm"));
    }

    currentSlot = addMinutes(currentSlot, 30);
  }

  return slots;
}
