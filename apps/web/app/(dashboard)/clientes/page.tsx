import { subDays, isAfter } from "date-fns";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { listClients } from "../../../src/modules/clients/repository";
import { listAppointmentsForClients } from "../../../src/modules/appointments/repository";
import { ClientsView } from "./clients-view";

interface ClientListItem {
  id: string;
  name: string;
  initials: string | null;
  phone: string | null;
  created_at: string;
  is_vip: boolean;
  needs_attention: boolean;
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q || "";
  const filter = resolvedSearchParams?.filter || "all";

  const { data } = await listClients(
    FIXED_TENANT_ID,
    query,
    filter === "vip" ? "vip" : filter === "alert" ? "alert" : undefined
  );
  let clients = (data as ClientListItem[] | null) ?? [];

  if (filter === "new") {
    const threshold = subDays(new Date(), 30);
    clients = clients.filter((client) => isAfter(new Date(client.created_at), threshold));
  }

  const clientIds = clients.map((client) => client.id);
  const { data: appointmentsData } = await listAppointmentsForClients(FIXED_TENANT_ID, clientIds);
  const lastVisitMap = new Map<string, string>();

  (appointmentsData ?? []).forEach((appointment) => {
    if (!appointment.client_id) return;
    if (lastVisitMap.has(appointment.client_id)) return;
    lastVisitMap.set(appointment.client_id, appointment.start_time);
  });

  const lastVisits: Record<string, string> = {};
  lastVisitMap.forEach((value, key) => {
    lastVisits[key] = value;
  });

  return <ClientsView clients={clients} lastVisits={lastVisits} query={query} filter={filter} />;
}
