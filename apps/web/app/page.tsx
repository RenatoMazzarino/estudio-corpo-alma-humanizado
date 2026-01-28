import { createClient } from "../lib/supabase/server";
import { AppShell } from "../components/app-shell";
import { startOfMonth, format } from "date-fns";
import { FIXED_TENANT_ID } from "../lib/tenant-context";
import { DesktopCalendar } from "../components/desktop-calendar";
import { MobileAgenda } from "../components/mobile-agenda";
import Link from "next/link";

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

  // Busca agendamentos do mês atual em diante
  const startRange = startOfMonth(today);
  const queryStartDate = startRange.toISOString();

  const { data } = await supabase
    .from("appointments")
    .select(`
      id, service_name, start_time, finished_at, status,
      clients ( name, initials )
    `)
    .eq("tenant_id", FIXED_TENANT_ID)
    .gte("start_time", queryStartDate)
    .neq("status", "canceled")
    .order("start_time", { ascending: true });

  const appointments = (data as unknown) as Appointment[] || [];
  const todayStr = format(today, "yyyy-MM-dd");

  return (
    <AppShell>
      {/* VERSÃO DESKTOP */}
      <div className="hidden md:block h-full">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-2xl font-bold text-studio-text font-serif">Agenda da Semana</h2>
        </div>
        <DesktopCalendar appointments={appointments} />
      </div>

      {/* VERSÃO MOBILE */}
      <div className="md:hidden">
        <MobileAgenda appointments={appointments} />
      </div>

      {/* Botão Flutuante (FAB) - Visível em todos os tamanhos */}
      <Link
        href={`/novo?date=${todayStr}`} 
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-studio-green text-white w-14 h-14 md:w-16 md:h-16 rounded-full shadow-xl shadow-green-100 flex items-center justify-center hover:scale-110 transition-all z-50 border-4 border-white"
      >
        <span className="text-3xl md:text-4xl font-light mb-1">+</span>
      </Link>
    </AppShell>
  );
}