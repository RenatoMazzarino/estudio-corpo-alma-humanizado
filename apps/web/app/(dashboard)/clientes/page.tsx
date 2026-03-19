import { subDays, isAfter } from "date-fns";
import { listClients } from "../../../src/modules/clients/repository";
import { listAppointmentsForClients } from "../../../src/modules/appointments/repository";
import { listClientQuickChannels } from "../../../src/modules/clients/profile-data";
import { ClientsView } from "./clients-view";
import { requireDashboardAccessForPage } from "../../../src/modules/auth/dashboard-access";

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
  const { tenantId } = await requireDashboardAccessForPage("/clientes");
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q || "";
  const filter = resolvedSearchParams?.filter || "all";

  const { data } = await listClients(
    tenantId,
    query,
    filter === "vip" ? "vip" : filter === "alert" ? "alert" : undefined
  );
  let clients = (data as ClientListItem[] | null) ?? [];

  if (filter === "new") {
    const threshold = subDays(new Date(), 30);
    clients = clients.filter((client) => isAfter(new Date(client.created_at), threshold));
  }

  const clientIds = clients.map((client) => client.id);
  const [{ data: appointmentsData }, quickChannels] = await Promise.all([
    listAppointmentsForClients(tenantId, clientIds),
    listClientQuickChannels(tenantId, clients),
  ]);
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

  return (
    <ClientsView
      clients={clients}
      lastVisits={lastVisits}
      quickChannels={quickChannels}
      query={query}
      filter={filter}
    />
  );
}
