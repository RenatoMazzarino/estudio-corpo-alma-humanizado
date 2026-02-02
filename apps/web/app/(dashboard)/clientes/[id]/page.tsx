import { ChevronLeft, CalendarClock } from "lucide-react";
import Link from "next/link";
import { FIXED_TENANT_ID } from "../../../../lib/tenant-context";
import { NotesSection } from "./notes-section";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getClientById } from "../../../../src/modules/clients/repository";
import { listAppointmentsForClient } from "../../../../src/modules/appointments/repository";
import { ClientProfile } from "./client-profile";
import { AppHeader } from "../../../../components/ui/app-header";
import { SurfaceCard } from "../../../../components/ui/surface-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface AppointmentHistoryItem {
  id: string;
  start_time: string;
  service_name: string;
  price: number | null;
  status: string;
}

export default async function ClientProfilePage(props: PageProps) {
  const params = await props.params;

  // 1. Busca dados do Cliente
  const { data: client } = await getClientById(FIXED_TENANT_ID, params.id);

  if (!client) {
    return <div>Cliente não encontrado.</div>;
  }

  // 2. Busca histórico de agendamentos
  const { data: historyData } = await listAppointmentsForClient(FIXED_TENANT_ID, params.id);
  const history = (historyData as AppointmentHistoryItem[] | null) ?? [];

  return (
    <div className="-mx-4 -mt-4">
      <AppHeader
        label="Clientes"
        title={client.name}
        subtitle={client.phone ?? "Cadastro completo do cliente"}
        leftSlot={
          <Link
            href="/clientes"
            className="w-10 h-10 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
            aria-label="Voltar"
          >
            <ChevronLeft size={20} />
          </Link>
        }
      />

      <main className="px-6 pt-6 pb-28 space-y-6">
        <ClientProfile client={client} />

        <NotesSection clientId={client.id} initialNotes={client.observacoes_gerais} />

        <section className="space-y-3">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-muted">
            Histórico de visitas
          </h2>
          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((apt) => {
                const isCompleted = apt.status === "completed";
                return (
                  <SurfaceCard key={apt.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-extrabold text-studio-text text-sm">{apt.service_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted mt-1">
                        <CalendarClock size={12} />
                        <span className="capitalize">
                          {format(new Date(apt.start_time), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-extrabold text-studio-green text-sm">
                        R$ {apt.price}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold mt-1 ${
                          isCompleted ? "bg-emerald-50 text-ok" : "bg-studio-light text-muted"
                        }`}
                      >
                        {isCompleted ? "Concluído" : "Agendado"}
                      </span>
                    </div>
                  </SurfaceCard>
                );
              })}
            </div>
          ) : (
            <SurfaceCard className="text-center py-10 text-muted border border-dashed border-line bg-studio-light/40">
              <p>Nenhuma visita registrada.</p>
            </SurfaceCard>
          )}
        </section>
      </main>
    </div>
  );
}
