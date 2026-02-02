import { User, Search, UserPlus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { format, subDays, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { listClients } from "../../../src/modules/clients/repository";
import { listAppointmentsForClients } from "../../../src/modules/appointments/repository";
import { AppHeader } from "../../../components/ui/app-header";
import { SurfaceCard } from "../../../components/ui/surface-card";
import { Chip } from "../../../components/ui/chip";
import { IconButton } from "../../../components/ui/buttons";

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

  const grouped = clients.reduce<Record<string, ClientListItem[]>>((acc, client) => {
    const letter = (client.name?.[0] || "#").toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(client);
    return acc;
  }, {});

  const letters = Object.keys(grouped).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const dbSnapshot = JSON.stringify(clients, null, 2);

  const buildFilterHref = (nextFilter: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (nextFilter !== "all") params.set("filter", nextFilter);
    const qs = params.toString();
    return qs ? `/clientes?${qs}` : "/clientes";
  };

  return (
    <div className="flex flex-col min-h-full bg-studio-bg -mx-4 -mt-4">
      <AppHeader
        label="Gestão"
        title="Meus Clientes"
        subtitle="Organize, acompanhe e consulte o histórico."
        rightSlot={
          <Link href="/clientes/novo" aria-label="Novo cliente">
            <IconButton icon={<UserPlus className="w-5 h-5" />} />
          </Link>
        }
        bottomSlot={
          <div className="space-y-3">
            <form method="GET" className="relative">
              <Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Buscar por nome..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-paper border border-transparent focus:border-studio-green/30 focus:ring-2 focus:ring-studio-green/15 text-sm font-semibold text-studio-text transition"
              />
              {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
            </form>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: "all", label: "Todos" },
                { id: "vip", label: "VIP" },
                { id: "alert", label: "Atenção" },
                { id: "new", label: "Novos" },
              ].map((item) => (
                <Link
                  key={item.id}
                  href={buildFilterHref(item.id)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-extrabold tracking-wide whitespace-nowrap ${
                    filter === item.id
                      ? "bg-studio-green text-white shadow-soft"
                      : "bg-paper text-studio-text border border-line"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        }
      />

      <div className="relative flex-1 overflow-y-auto no-scrollbar pb-24">
        {letters.length > 0 && (
          <div className="pointer-events-none absolute right-2 top-40 z-20 flex flex-col gap-1">
            {letters.map((letter) => (
              <span
                key={letter}
                className="text-[9px] font-extrabold text-studio-green px-2 py-0.5 rounded-full bg-studio-light/80 border border-studio-green/10"
              >
                {letter}
              </span>
            ))}
          </div>
        )}

        {letters.map((letter) => (
          <section key={letter} className="px-6 pt-4">
            <div className="sticky top-[168px] z-10 bg-studio-bg/90 backdrop-blur py-2">
              <h3 className="text-[11px] font-extrabold text-studio-green uppercase tracking-[0.2em]">
                {letter}
              </h3>
            </div>

            <SurfaceCard className="p-0 overflow-hidden">
              {grouped[letter].map((client, index) => {
                const lastVisit = lastVisitMap.get(client.id);
                const lastVisitLabel = lastVisit
                  ? format(new Date(lastVisit), "dd MMM", { locale: ptBR })
                  : "Sem visitas";
                return (
                  <Link
                    key={client.id}
                    href={`/clientes/${client.id}`}
                    className={`flex items-center gap-4 px-4 py-4 transition active:scale-[0.99] hover:bg-studio-light/60 ${
                      index > 0 ? "border-t border-line" : ""
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-studio-light text-studio-green flex items-center justify-center font-serif font-bold text-sm">
                      {client.initials || <User className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <h4 className="font-extrabold text-studio-text text-sm truncate">{client.name}</h4>
                        {client.is_vip && <Chip tone="success">VIP</Chip>}
                        {client.needs_attention && <Chip tone="danger">Atenção</Chip>}
                      </div>
                      <p className="text-[11px] text-muted font-semibold">Última visita: {lastVisitLabel}</p>
                      {client.phone && (
                        <span className="mt-1 inline-flex text-[11px] text-muted bg-studio-light px-2 py-0.5 rounded-full">
                          {client.phone}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted/60" />
                  </Link>
                );
              })}
            </SurfaceCard>
          </section>
        ))}

        {clients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-70">
            <User className="w-12 h-12 text-muted mb-4" />
            <p className="text-muted text-sm">Nenhum cliente encontrado.</p>
          </div>
        )}

        <details className="mx-6 mt-6 mb-10 bg-white rounded-3xl border border-line p-4 shadow-soft">
          <summary className="text-xs font-extrabold text-muted uppercase tracking-widest cursor-pointer">
            Dados técnicos (DB)
          </summary>
          <pre className="mt-3 text-[10px] text-muted whitespace-pre-wrap">{dbSnapshot}</pre>
        </details>
      </div>
    </div>
  );
}
