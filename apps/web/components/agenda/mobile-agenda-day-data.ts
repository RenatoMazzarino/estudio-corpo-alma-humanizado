import { format } from "date-fns";
import { parseAgendaDate } from "./mobile-agenda.helpers";
import type { Appointment, AvailabilityBlock, DayItem } from "./mobile-agenda.types";

type Params = {
  day: Date;
  appointmentsByDay: Map<string, Appointment[]>;
  blocksByDay: Map<string, AvailabilityBlock[]>;
};

export function buildAgendaDayData({ day, appointmentsByDay, blocksByDay }: Params) {
  const key = format(day, "yyyy-MM-dd");
  const dayAppointments = (appointmentsByDay.get(key) ?? []).slice().sort((a, b) =>
    parseAgendaDate(a.start_time).getTime() - parseAgendaDate(b.start_time).getTime()
  );
  const dayBlocks = (blocksByDay.get(key) ?? []).slice().sort((a, b) =>
    parseAgendaDate(a.start_time).getTime() - parseAgendaDate(b.start_time).getTime()
  );

  const blockItems = dayBlocks
    .filter((block) => !((block.block_type ?? "") === "shift" && block.is_full_day))
    .map((block) => ({
      id: block.id,
      type: "block" as const,
      start_time: block.start_time,
      finished_at: block.end_time,
      service_duration_minutes: null,
      buffer_before_minutes: null,
      buffer_after_minutes: null,
      clientName: block.title,
      serviceName: "Plantão",
      status: "blocked",
      payment_status: null,
      is_home_visit: false,
      total_duration_minutes: null,
      price: null,
      block_type: block.block_type ?? null,
      is_full_day: block.is_full_day ?? null,
    }));

  const items: DayItem[] = [
    ...dayAppointments.map((appt) => ({
      id: appt.id,
      type: "appointment" as const,
      start_time: appt.start_time,
      finished_at: appt.finished_at,
      service_duration_minutes: appt.service_duration_minutes ?? null,
      buffer_before_minutes: appt.buffer_before_minutes ?? null,
      buffer_after_minutes: appt.buffer_after_minutes ?? null,
      clientName: appt.clients?.name ?? "",
      serviceName: appt.service_name,
      status: appt.status,
      payment_status: appt.payment_status ?? null,
      is_home_visit: appt.is_home_visit ?? null,
      total_duration_minutes: appt.total_duration_minutes ?? null,
      price: appt.price ?? null,
      phone: appt.clients?.phone ?? null,
      address: appt.clients?.endereco_completo ?? null,
      is_vip:
        Array.isArray(appt.clients?.health_tags) &&
        appt.clients.health_tags.some((tag) => String(tag ?? "").toLowerCase().includes("vip")),
    })),
    ...blockItems,
  ].sort((a, b) => parseAgendaDate(a.start_time).getTime() - parseAgendaDate(b.start_time).getTime());

  return { dayAppointments, dayBlocks, items };
}
