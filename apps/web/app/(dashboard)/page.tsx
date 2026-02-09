import { MobileAgenda } from "../../components/mobile-agenda";
import { FIXED_TENANT_ID } from "../../lib/tenant-context";
import { startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { unstable_noStore as noStore } from "next/cache";
import { getSettings } from "../../src/modules/settings/repository";
import { DEFAULT_PUBLIC_BASE_URL } from "../../src/shared/config";
import {
  listAppointmentsInRange,
  listAvailabilityBlocksInRange,
  searchAppointments,
} from "../../src/modules/appointments/repository";

// Interface dos dados
interface Appointment {
  id: string;
  service_id: string | null;
  service_name: string;
  start_time: string;
  status: string;
  finished_at: string | null;
  is_home_visit: boolean | null;
  total_duration_minutes: number | null;
  service_duration_minutes?: number | null;
  buffer_before_minutes?: number | null;
  buffer_after_minutes?: number | null;
  price: number | null;
  clients: {
    id: string;
    name: string;
    initials: string | null;
    phone: string | null;
    health_tags: string[] | null;
    endereco_completo: string | null;
  } | null;
}

type RawAppointment = Omit<Appointment, "clients"> & {
  clients: Appointment["clients"] | Appointment["clients"][] | null;
  services:
    | {
        duration_minutes: number | null;
        buffer_before_minutes: number | null;
        buffer_after_minutes: number | null;
        custom_buffer_minutes: number | null;
      }
    | {
        duration_minutes: number | null;
        buffer_before_minutes: number | null;
        buffer_after_minutes: number | null;
        custom_buffer_minutes: number | null;
      }[]
    | null;
};

const resolveBuffer = (...values: Array<number | null | undefined>) => {
  const positive = values.find((value) => typeof value === "number" && value > 0);
  if (positive !== undefined) return positive;
  return 0;
};

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; q?: string }>;
}) {
  noStore();
  const resolvedSearchParams = await searchParams;
  const today = new Date();
  
  // Buscar 2 meses para ter margem
  const queryStartDate = startOfMonth(subMonths(today, 1)).toISOString();
  const queryEndDate = endOfMonth(addMonths(today, 2)).toISOString();

  const query = resolvedSearchParams?.q?.trim();

  // 1. Buscar Agendamentos
  const [{ data: appointmentsData }, { data: settingsData }] = await Promise.all([
    query
      ? searchAppointments(FIXED_TENANT_ID, query, queryStartDate, queryEndDate)
      : listAppointmentsInRange(FIXED_TENANT_ID, queryStartDate, queryEndDate),
    getSettings(FIXED_TENANT_ID),
  ]);

  const rawAppointments = (appointmentsData ?? []) as unknown as RawAppointment[];
  const settings = settingsData ?? null;
  const appointments: Appointment[] = rawAppointments.map((appt) => {
    const service = Array.isArray(appt.services) ? appt.services[0] ?? null : appt.services;
    const serviceDuration = service?.duration_minutes ?? null;
    const bufferBefore = appt.is_home_visit
      ? resolveBuffer(
          service?.buffer_before_minutes,
          settings?.buffer_before_minutes,
          settings?.default_home_buffer,
          service?.custom_buffer_minutes,
          settings?.default_studio_buffer,
          30
        )
      : resolveBuffer(
          service?.buffer_before_minutes,
          settings?.buffer_before_minutes,
          service?.custom_buffer_minutes,
          settings?.default_studio_buffer,
          30
        );
    const bufferAfter = appt.is_home_visit
      ? resolveBuffer(
          service?.buffer_after_minutes,
          settings?.buffer_after_minutes,
          settings?.default_home_buffer,
          service?.custom_buffer_minutes,
          settings?.default_studio_buffer,
          30
        )
      : resolveBuffer(
          service?.buffer_after_minutes,
          settings?.buffer_after_minutes,
          service?.custom_buffer_minutes,
          settings?.default_studio_buffer,
          30
        );

    return {
      ...appt,
      clients: Array.isArray(appt.clients) ? appt.clients[0] ?? null : appt.clients,
      service_duration_minutes: serviceDuration,
      buffer_before_minutes: bufferBefore,
      buffer_after_minutes: bufferAfter,
    };
  });

  // 2. Buscar Bloqueios
  const { data: blocksData } = await listAvailabilityBlocksInRange(
    FIXED_TENANT_ID,
    queryStartDate,
    queryEndDate
  );

  const blocks = blocksData || [];

  return (
    <MobileAgenda
      appointments={appointments}
      blocks={blocks}
      signalPercentage={settings?.signal_percentage ?? 30}
      publicBaseUrl={settings?.public_base_url ?? DEFAULT_PUBLIC_BASE_URL}
    />
  );
}
