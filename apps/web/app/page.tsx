import { createServiceClient } from "../lib/supabase/service";
import { MobileAgenda } from "../components/mobile-agenda";
import { FIXED_TENANT_ID } from "../lib/tenant-context";
import { startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";

// Interface dos dados
interface Appointment {
  id: string;
  service_name: string;
  start_time: string;
  status: string;
  finished_at: string | null;
  is_home_visit: boolean | null;
  total_duration_minutes: number | null;
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
};

export default async function Home() {
  const supabase = createServiceClient();
  const today = new Date();
  
  // Buscar 2 meses para ter margem
  const queryStartDate = startOfMonth(subMonths(today, 1)).toISOString();
  const queryEndDate = endOfMonth(addMonths(today, 2)).toISOString();

  // 1. Buscar Agendamentos
  const { data: appointmentsData } = await supabase
    .from("appointments")
    .select(`
      id, service_name, start_time, finished_at, status, price,
      is_home_visit, total_duration_minutes,
      clients ( id, name, initials, phone, health_tags, endereco_completo )
    `)
    .eq("tenant_id", FIXED_TENANT_ID)
    .gte("start_time", queryStartDate)
    .lte("start_time", queryEndDate);

  const rawAppointments = (appointmentsData ?? []) as unknown as RawAppointment[];
  const appointments: Appointment[] = rawAppointments.map((appt) => ({
    ...appt,
    clients: Array.isArray(appt.clients) ? appt.clients[0] ?? null : appt.clients,
  }));

  // 2. Buscar Bloqueios
  const { data: blocksData } = await supabase
      .from("availability_blocks")
      .select("id, title, start_time, end_time")
      .eq("tenant_id", FIXED_TENANT_ID)
      .gte("start_time", queryStartDate)
      .lte("start_time", queryEndDate);

  const blocks = blocksData || [];

  return (
    <MobileAgenda 
        appointments={appointments} 
        blocks={blocks} 
    />
  );
}
