import { AppShell } from "../../../components/app-shell";
import { ChevronLeft, CalendarClock } from "lucide-react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/server";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { NotesSection } from "./notes-section";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientProfilePage(props: PageProps) {
  const params = await props.params;
  const supabase = await createClient();

  // 1. Busca dados do Cliente
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .eq("tenant_id", FIXED_TENANT_ID)
    .single();

  if (!client) {
    return <div>Cliente não encontrado.</div>;
  }

  // 2. Busca histórico de agendamentos
  const { data: history } = await supabase
    .from("appointments")
    .select("id, start_time, service_name, price, status")
    .eq("client_id", params.id)
    .eq("tenant_id", FIXED_TENANT_ID)
    .order("start_time", { ascending: false });

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clientes" className="p-2 bg-white rounded-full text-gray-600 shadow-sm border border-stone-100">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">{client.name}</h1>
            {client.phone && <p className="text-xs text-gray-400">{client.phone}</p>}
        </div>
        <div className="w-10 h-10 rounded-full bg-studio-green text-white flex items-center justify-center font-bold">
            {client.initials}
        </div>
      </div>

      {/* Seção 1: Prontuário (Client Component para edição) */}
      <NotesSection clientId={client.id} initialNotes={client.observacoes_gerais} />

      {/* Seção 2: Histórico */}
      <h2 className="font-bold text-gray-800 mb-3 ml-1">Histórico de Visitas</h2>
      <div className="space-y-3 pb-20">
        {history && history.length > 0 ? (
            history.map((apt) => {
                const isCompleted = apt.status === "completed";
                return (
                <div key={apt.id} className="bg-white p-4 rounded-2xl border border-stone-100 flex justify-between items-center">
                    <div>
                        <p className="font-bold text-gray-700">{apt.service_name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            <CalendarClock size={12} />
                            <span className="capitalize">{format(new Date(apt.start_time), "dd 'de' MMM, yyyy", { locale: ptBR })}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-studio-green text-sm">R$ {apt.price}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold mt-1 
                            ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {isCompleted ? 'Concluído' : 'Agendado'}
                        </span>
                    </div>
                </div>
                );
            })
        ) : (
            <div className="text-center py-8 text-gray-400 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                <p>Nenhuma visita registrada.</p>
            </div>
        )}
      </div>

    </AppShell>
  );
}
