import { MobileAgenda } from "../../components/mobile-agenda";
import { FIXED_TENANT_ID } from "../../lib/tenant-context";
import { startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { unstable_noStore as noStore } from "next/cache";
import { getSettings } from "../../src/modules/settings/repository";
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
      ? service?.buffer_before_minutes ??
        settings?.buffer_before_minutes ??
        settings?.default_home_buffer ??
        service?.custom_buffer_minutes ??
        settings?.default_studio_buffer ??
        30
      : service?.buffer_before_minutes ??
        settings?.buffer_before_minutes ??
        service?.custom_buffer_minutes ??
        settings?.default_studio_buffer ??
        30;
    const bufferAfter = appt.is_home_visit
      ? service?.buffer_after_minutes ??
        settings?.buffer_after_minutes ??
        settings?.default_home_buffer ??
        service?.custom_buffer_minutes ??
        settings?.default_studio_buffer ??
        30
      : service?.buffer_after_minutes ??
        settings?.buffer_after_minutes ??
        service?.custom_buffer_minutes ??
        settings?.default_studio_buffer ??
        30;

    return {
      ...appt,
      clients: Array.isArray(appt.clients) ? appt.clients[0] ?? null : appt.clients,
      service_duration_minutes: serviceDuration,
      buffer_before_minutes: bufferBefore ?? 0,
      buffer_after_minutes: bufferAfter ?? 0,
    };
  });

  // 2. Buscar Bloqueios
  const { data: blocksData } = await listAvailabilityBlocksInRange(
    FIXED_TENANT_ID,
    queryStartDate,
    queryEndDate
  );

  const blocks = blocksData || [];

  const showCreated = resolvedSearchParams?.created === "1";

  return (
    <>
      {showCreated && (
        <div className="mx-5 mt-4 mb-2 bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-3 rounded-xl">
          Agendamento criado com sucesso.
        </div>
      )}
      <MobileAgenda appointments={appointments} blocks={blocks} />
    </>
  );
}
