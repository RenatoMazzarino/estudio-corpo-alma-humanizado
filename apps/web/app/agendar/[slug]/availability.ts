"use server";

import { createClient } from "../../../lib/supabase/server";
import { addMinutes, format, parse, isBefore, isAfter, getDay, parseISO } from "date-fns";

interface GetSlotsParams {
  tenantId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  isHomeVisit?: boolean;
}

export async function getAvailableSlots({ tenantId, serviceId, date, isHomeVisit = false }: GetSlotsParams): Promise<string[]> {
  const supabase = await createClient();

  // 1. Fetch Parallel Data: Service, Settings, BusinessHours
  const [serviceRes, settingsRes, businessHourRes] = await Promise.all([
    supabase.from("services").select("duration_minutes, custom_buffer_minutes").eq("id", serviceId).single(),
    supabase.from("settings").select("default_studio_buffer, default_home_buffer").eq("tenant_id", tenantId).single(),
    supabase
      .from("business_hours")
      .select("open_time, close_time, is_closed")
      .eq("tenant_id", tenantId)
      .eq("day_of_week", getDay(parse(date, "yyyy-MM-dd", new Date())))
      .single()
  ]);

  const service = serviceRes.data;
  const settings = settingsRes.data;
  const businessHour = businessHourRes.data;

  // Validation
  if (!service) return [];
  if (!businessHour || businessHour.is_closed) return [];

  // 2. Calculate Effective Duration (Service + Buffer)
  const serviceDuration = service.duration_minutes || 30;
  
  let buffer = 0;
  if (isHomeVisit) {
    buffer = settings?.default_home_buffer || 60; // Default 60 if missing
  } else {
    // Studio: Prefer custom_buffer if set, else global default
    buffer = service.custom_buffer_minutes ?? (settings?.default_studio_buffer || 30);
  }

  const totalSlotDuration = serviceDuration + buffer;

  // 3. Fetch Constraints: Appointments & Blocks
  const startOfDayStr = `${date}T00:00:00`;
  const endOfDayStr = `${date}T23:59:59`;

  const [appointmentsRes, blocksRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("start_time, finished_at, total_duration_minutes")
      .eq("tenant_id", tenantId)
      .neq("status", "canceled")
      .gte("start_time", startOfDayStr)
      .lte("start_time", endOfDayStr),
    supabase
      .from("availability_blocks") // New Table
      .select("start_time, end_time")
      .eq("tenant_id", tenantId)
      .gte("end_time", startOfDayStr) // Overlapping logic optimization could be better but this is safe
      .lte("start_time", endOfDayStr) // Blocks starting before end of day? 
      // Actually simple overlap: (BlockEnd > DayStart) AND (BlockStart < DayEnd)
      // For simplicity, let's fetch any block that intersects the day. 
      // Supabase range query is tricky in one go. 
      // Let's stick to fetching what's mostly relevant.
      // Reverting to simple day filter:
      .gte("end_time", startOfDayStr)
      // Note: A block could span multiple days, but our current UI creates day-blocks (00:00-23:59).
      // If we assumed strictly 00:00 blocks, checking start_time is enough.
      // But let's be safe: Fetch blocks that start OR end within the day?
      // Or just fetch all blocks active in this day.
      // A block covers the day if: BlockStart <= DayEnd AND BlockEnd >= DayStart.
      // Supabase .or() is annoying. Let's just fetch broad and filter in JS if needed, or stick to start_time for typical usage.
      // Given the "ShiftManager" creates blocks with start_time in the day, simple filter works.
      .gte("start_time", `${date}T00:00:00`)
      .lte("start_time", `${date}T23:59:59`) 
  ]);

  const appointments = appointmentsRes.data || [];
  const blocks = blocksRes.data || [];

  // 4. Generate Slots
  const slots: string[] = [];
  const openTimeStr = businessHour.open_time.slice(0, 5);
  const closeTimeStr = businessHour.close_time.slice(0, 5);
  
  const openTime = parse(`${date}T${openTimeStr}`, "yyyy-MM-dd'T'HH:mm", new Date());
  const closeTime = parse(`${date}T${closeTimeStr}`, "yyyy-MM-dd'T'HH:mm", new Date());

  let currentSlot = openTime;

  // We limit the loop to avoid infinite loops if constraints are weird
  while (isBefore(currentSlot, closeTime)) {
    // Calculate the 'Occupied' time for this slot (Service + Buffer)
    const slotEndTime = addMinutes(currentSlot, totalSlotDuration);

    // Rule: Must finish within business hours
    if (isAfter(slotEndTime, closeTime)) {
      break; 
    }

    // 5. Collision Detection
    // We check if the PLANNED slot (Current -> Current + TotalDuration) collides with anything
    
    // A. Check Appointments
    const collidesWithAppt = appointments.some((appt) => {
        const apptStart = parseISO(appt.start_time); // Use parseISO for safety with timezone strings
        
        // Determine Appointment End
        let apptEnd: Date;
        if (appt.total_duration_minutes) {
             apptEnd = addMinutes(apptStart, appt.total_duration_minutes);
        } else if (appt.finished_at) {
             apptEnd = parseISO(appt.finished_at);
        } else {
             // Fallback default
             apptEnd = addMinutes(apptStart, 30);
        }

        // Overlap: (SlotStart < ApptEnd) && (SlotEnd > ApptStart)
        return isBefore(currentSlot, apptEnd) && isAfter(slotEndTime, apptStart);
    });

    // B. Check Blocks
    const collidesWithBlock = blocks.some((block) => {
        const blockStart = parseISO(block.start_time);
        const blockEnd = parseISO(block.end_time);

        return isBefore(currentSlot, blockEnd) && isAfter(slotEndTime, blockStart);
    });

    if (!collidesWithAppt && !collidesWithBlock) {
      slots.push(format(currentSlot, "HH:mm"));
    }

    // Interval Step: 30 minutes (Standard spacing, even if slots are longer)
    currentSlot = addMinutes(currentSlot, 30);
  }

  return slots;
}
