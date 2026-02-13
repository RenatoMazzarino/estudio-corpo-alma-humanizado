import type { AutoMessageTemplates } from "../../src/shared/auto-messages.types";

export interface AppointmentClient {
  id: string;
  name: string;
  initials: string | null;
  phone?: string | null;
  health_tags?: string[] | null;
  endereco_completo?: string | null;
}

export interface Appointment {
  id: string;
  service_name: string;
  start_time: string;
  finished_at: string | null;
  clients: AppointmentClient | null;
  status: string;
  payment_status?: string | null;
  is_home_visit?: boolean | null;
  total_duration_minutes?: number | null;
  service_duration_minutes?: number | null;
  buffer_before_minutes?: number | null;
  buffer_after_minutes?: number | null;
  price?: number | null;
}

export interface AvailabilityBlock {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  block_type?: string | null;
  is_full_day?: boolean | null;
}

export interface MobileAgendaProps {
  appointments: Appointment[];
  blocks: AvailabilityBlock[];
  signalPercentage?: number;
  publicBaseUrl?: string;
  messageTemplates: AutoMessageTemplates;
}

export type AgendaView = "day" | "week" | "month";

export type DayItem = {
  id: string;
  type: "appointment" | "block";
  start_time: string;
  finished_at: string | null;
  service_duration_minutes: number | null;
  buffer_before_minutes: number | null;
  buffer_after_minutes: number | null;
  clientName: string;
  serviceName: string;
  status: string;
  payment_status?: string | null;
  is_home_visit: boolean | null;
  total_duration_minutes: number | null;
  price?: number | null;
  phone?: string | null;
  address?: string | null;
  block_type?: string | null;
  is_full_day?: boolean | null;
};

export const hiddenAppointmentStatuses = new Set(["canceled_by_client", "canceled_by_studio", "no_show"]);
