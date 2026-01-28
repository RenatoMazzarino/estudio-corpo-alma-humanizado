"use server";

import { createClient } from "../../../lib/supabase/server";
import { addMinutes, format, parse, isBefore, isAfter, getDay } from "date-fns";

interface GetSlotsParams {
  tenantId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
}

export async function getAvailableSlots({ tenantId, serviceId, date }: GetSlotsParams): Promise<string[]> {
  const supabase = await createClient();

  // 1. Get Service Duration
  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .single();

  if (!service) return [];

  const duration = service.duration_minutes;

  // 2. Get Business Hours for the day
  const dayOfWeek = getDay(parse(date, "yyyy-MM-dd", new Date()));

  const { data: businessHour } = await supabase
    .from("business_hours")
    .select("open_time, close_time, is_closed")
    .eq("tenant_id", tenantId)
    .eq("day_of_week", dayOfWeek)
    .single();

  if (!businessHour || businessHour.is_closed) {
    return []; // Closed today
  }

  // 3. Get Existing Appointments
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

  const { data: appointments } = await supabase
    .from("appointments")
    .select("start_time, finished_at")
    .eq("tenant_id", tenantId)
    .neq("status", "canceled")
    .gte("start_time", startOfDay)
    .lte("start_time", endOfDay);

  // 4. Generate & Filter Slots
  const slots: string[] = [];
  const openTimeStr = businessHour.open_time.slice(0, 5); // Ensure HH:mm
  const closeTimeStr = businessHour.close_time.slice(0, 5); 
  
  const openTime = parse(`${date}T${openTimeStr}`, "yyyy-MM-dd'T'HH:mm", new Date());
  const closeTime = parse(`${date}T${closeTimeStr}`, "yyyy-MM-dd'T'HH:mm", new Date());

  let currentSlot = openTime;

  while (isBefore(currentSlot, closeTime)) {
    const potentialEnd = addMinutes(currentSlot, duration);

    // Filter 1: Must finish before or at close time
    if (isAfter(potentialEnd, closeTime)) {
      break; 
    }

    // Filter 2: Collision Detection
    const isColliding = appointments?.some((appt) => {
      const apptStart = new Date(appt.start_time);
      // Fallback if finished_at is null (old data)
      const apptEnd = appt.finished_at ? new Date(appt.finished_at) : addMinutes(apptStart, 30); 

      // Collision logic: (SlotStart < ApptEnd) AND (SlotEnd > ApptStart)
      return isBefore(currentSlot, apptEnd) && isAfter(potentialEnd, apptStart);
    });

    if (!isColliding) {
      slots.push(format(currentSlot, "HH:mm"));
    }

    // Advance 30 mins
    currentSlot = addMinutes(currentSlot, 30);
  }

  return slots;
}
