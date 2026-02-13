import { FIXED_TENANT_ID } from "../../../../lib/tenant-context";
import { NotesSection } from "./notes-section";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getClientById,
  listClientAddresses,
  listClientEmails,
  listClientHealthItems,
  listClientPhones,
} from "../../../../src/modules/clients/repository";
import { listAppointmentsForClient } from "../../../../src/modules/appointments/repository";
import { ClientProfile } from "./client-profile";
import { SurfaceCard } from "../../../../components/ui/surface-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface AppointmentHistoryItem {
  id: string;
  start_time: string;
  service_name: string;
  price: number | null;
  price_override: number | null;
  status: string;
  is_home_visit: boolean | null;
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
  const [{ data: addresses }, { data: phones }, { data: emails }, { data: healthItems }] =
    await Promise.all([
      listClientAddresses(FIXED_TENANT_ID, params.id),
      listClientPhones(FIXED_TENANT_ID, params.id),
      listClientEmails(FIXED_TENANT_ID, params.id),
      listClientHealthItems(FIXED_TENANT_ID, params.id),
    ]);
  const history = (historyData as AppointmentHistoryItem[] | null) ?? [];
  const resolvedPhones =
    phones && phones.length > 0
      ? phones
      : client.phone
      ? [
          {
            id: "legacy-phone",
            client_id: client.id,
            tenant_id: client.tenant_id,
            label: "Principal",
            number_raw: client.phone,
            number_e164: null,
            is_primary: true,
            is_whatsapp: true,
            created_at: client.created_at ?? new Date().toISOString(),
            updated_at: client.created_at ?? new Date().toISOString(),
          },
        ]
      : [];

  const visitsCount = history.length;
  const absencesCount = history.filter((apt) => apt.status === "no_show").length;
  const lastVisit = history[0]?.start_time ?? null;
  const lastVisitLabel = lastVisit ? format(new Date(lastVisit), "dd MMM", { locale: ptBR }) : "Sem visitas";

  return (
    <div className="-mx-4 -mt-4">
      <div className="relative bg-paper min-h-dvh">
        <div className="safe-top absolute top-0 left-0 w-full px-6 pt-6 flex justify-between items-center z-40 pointer-events-none">
          <Link
            href="/clientes"
            className="pointer-events-auto w-10 h-10 rounded-full bg-white/85 backdrop-blur text-gray-700 flex items-center justify-center shadow-sm hover:bg-white transition"
            aria-label="Voltar"
          >
            <ChevronLeft size={20} />
          </Link>
        </div>

        <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
          <ClientProfile
            client={client}
            metrics={{
              visits: visitsCount,
              absences: absencesCount,
              lastVisitLabel,
            }}
            addresses={addresses ?? []}
            phones={resolvedPhones}
            emails={emails ?? []}
            healthItems={healthItems ?? []}
          />

          <section className="px-6 pt-5 pb-4 space-y-5">
            <NotesSection clientId={client.id} initialNotes={client.observacoes_gerais} />

            <div>
              <h3 className="text-[11px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 pl-1">
                Histórico recente
              </h3>
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((apt) => {
                    const startDate = new Date(apt.start_time);
                    const isCompleted = apt.status === "completed";
                    return (
                      <div key={apt.id} className="bg-white rounded-2xl p-4 shadow-sm border border-white flex gap-4">
                        <div className="min-w-13.5 text-center">
                          <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">
                            {format(startDate, "MMM", { locale: ptBR })}
                          </p>
                          <p className="text-lg font-black text-studio-text">
                            {format(startDate, "dd")}
                          </p>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-extrabold text-studio-text text-sm">{apt.service_name}</h4>
                          <p className="text-xs text-muted font-semibold mt-0.5">
                            {apt.is_home_visit ? "Domicílio" : "No estúdio"} •{" "}
                            {(() => {
                              const finalPrice = apt.price_override ?? apt.price;
                              return finalPrice ? `R$ ${finalPrice.toFixed(2)}` : "Sem valor";
                            })()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-1 rounded-xl text-[10px] font-extrabold border ${
                              isCompleted
                                ? "bg-studio-light text-studio-green border-studio-green/10"
                                : "bg-dom/20 text-dom-strong border-dom/35"
                            }`}
                          >
                            {isCompleted ? "Concluído" : apt.is_home_visit ? "Domicílio" : "Agendado"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <SurfaceCard className="text-center py-10 text-muted border border-dashed border-line bg-studio-light/40">
                  <p>Nenhuma visita registrada.</p>
                </SurfaceCard>
              )}
            </div>

          </section>
        </main>
      </div>
    </div>
  );
}
