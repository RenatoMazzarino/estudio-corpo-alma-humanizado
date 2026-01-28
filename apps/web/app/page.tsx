import { createClient } from "../lib/supabase/server";
import { AppShell } from "../components/app-shell";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FIXED_TENANT_ID } from "../lib/tenant-context";
import { AdminCalendar } from "../components/admin-calendar";
import { MobileAgenda } from "../components/mobile-agenda";

// Interface dos dados
interface Appointment {
  id: string;
  service_name: string;
  start_time: string;
  status: string;
  finished_at: string | null;
  clients: {
    name: string;
    initials: string | null;
  } | null;
}

export default async function Home() {
  const supabase = await createClient();
  const today = new Date();

  // Para o calendário funcionar bem, vamos buscar o mês inteiro (ou um range maior)
  // Assim a grade semanal fica preenchida
  const startRange = startOfMonth(today);
  const endRange = endOfMonth(today);
  
  // Ajuste: Vamos pegar logo -1 mês e +1 mês para garantir navegação fluida nessa V1?
  // Por enquanto, vamos pegar apenas o mês atual para simplificar a query inicia,
  // mas idealmente seria dinâmico via searchParams se o user navegar muito longe.
  // Para V1: pega TODOS os agendamentos futuros e do mês atual. 
  // O Supabase aguenta bem volumes pequenos.
  const queryStartDate = startRange.toISOString();

  const { data } = await supabase
    .from("appointments")
    .select(`
      id, service_name, start_time, finished_at, status,
      clients ( name, initials )
    `)
    .eq("tenant_id", FIXED_TENANT_ID)
    .gte("start_time", queryStartDate) // Pega do inicio do mês para frente
    .neq("status", "canceled")
    .order("start_time", { ascending: true });

  const appointments = (data as unknown) as Appointment[] || [];
  
  const totalAtendimentos = appointments.length;

  return (
    <AppShell>
      {/* Resumo Simples */}
      <div className="bg-studio-green text-white p-6 rounded-3xl shadow-lg shadow-green-100/50 mb-8 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        <h2 className="text-xl font-bold mb-1 relative z-10 capitalize">
          Visão Geral
        </h2>
        <p className="text-green-50 text-sm opacity-90 relative z-10">
           Exibindo <strong className="text-white border-b border-white/30">{totalAtendimentos} atendimentos</strong> ativos no calendário.
        </p>
      </div>

      {/* Calendário Visual */}
      <div className="pb-10">
        <h2 className="text-lg font-bold text-gray-800 mb-4 ml-2">Agenda Visual</h2>
        {/* Desktop View (>= 768px) */}
        <div className="hidden md:block">
            <AdminCalendar appointments={appointments} />
        </div>

        {/* Mobile View (< 768px) - Lista Estilo Gendo */}
        <div className="md:hidden">
            <MobileAgenda appointments={appointments} />
        </div>
      </div>

    </AppShell>
  );
}