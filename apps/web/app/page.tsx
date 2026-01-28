import { createClient } from "../lib/supabase/server";
import { AppShell } from "../components/app-shell";
import { CalendarX, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import { format, addDays, subDays, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppointmentCard } from "../components/appointment-card"; // Importamos o novo card
import { FIXED_TENANT_ID } from "../lib/tenant-context";

// Interface dos dados (Atualizada)
interface Appointment {
  id: string;
  service_name: string;
  start_time: string;
  status: string;
  started_at: string | null; // Novo campo
  clients: {
    name: string;
    initials: string | null;
  } | null;
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const today = new Date();
  let selectedDate = today;

  if (params.date && typeof params.date === "string") {
    // FIX: Forçamos meio-dia para evitar problemas de fuso horário (UTC vs Local)
    // Se fosse 00:00, o fuso -3h jogaria para 21h do dia anterior
    selectedDate = parseISO(`${params.date}T12:00:00`);
  }
  
  const nextDay = format(addDays(selectedDate, 1), "yyyy-MM-dd");
  const prevDay = format(subDays(selectedDate, 1), "yyyy-MM-dd");
  const displayDate = format(selectedDate, "yyyy-MM-dd");

  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);

  const { data } = await supabase
    .from("appointments")
    .select(`
      *,
      clients ( name, initials )
    `)
    .eq("tenant_id", FIXED_TENANT_ID)
    .gte("start_time", startOfDay.toISOString())
    .lte("start_time", endOfDay.toISOString())
    .order("start_time", { ascending: true });

  const appointments = data as Appointment[] | null;
  
  // Filtra apenas os que NÃO foram cancelados/deletados para contagem
  const activeAppointments = appointments?.filter(a => a.status !== 'canceled') || [];
  const totalAtendimentos = activeAppointments.length;

  const dateTitle = format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  const isToday = isSameDay(selectedDate, today);

  return (
    <AppShell>
      {/* Navegação */}
      <div className="flex items-center justify-between mb-6 bg-white p-3 rounded-2xl shadow-sm border border-stone-100">
        <Link href={`/?date=${prevDay}`} className="p-2 hover:bg-stone-50 rounded-full text-gray-500 transition">
          <ChevronLeft size={20} />
        </Link>
        
        <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              {isToday ? "HOJE" : format(selectedDate, "yyyy", { locale: ptBR })}
            </span>
            <div className="flex items-center gap-2 text-gray-800 font-bold capitalize">
              <CalendarIcon size={14} className="text-studio-green" />
              {dateTitle}
            </div>
        </div>

        <Link href={`/?date=${nextDay}`} className="p-2 hover:bg-stone-50 rounded-full text-gray-500 transition">
          <ChevronRight size={20} />
        </Link>
      </div>

      {/* Resumo */}
      <div className="bg-studio-green text-white p-6 rounded-3xl shadow-lg shadow-green-100/50 mb-6 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        <h2 className="text-xl font-bold mb-1 relative z-10 capitalize">
          Agenda de {format(selectedDate, "EEEE", { locale: ptBR })}
        </h2>
        <p className="text-green-50 text-sm opacity-90 relative z-10">
          Você tem <strong className="text-white border-b border-white/30">{totalAtendimentos} atendimentos</strong> marcados.
        </p>
      </div>

      {/* LISTA DE CARDS INTELIGENTES */}
      <div className="space-y-3 pb-24">
        {activeAppointments.length > 0 ? (
          activeAppointments.map((item) => (
            <AppointmentCard key={item.id} appointment={item} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 opacity-60 border-2 border-dashed border-stone-200 rounded-3xl">
            <CalendarX size={48} className="mb-2 text-stone-300" />
            <p className="text-sm font-medium">Livre neste dia</p>
          </div>
        )}
      </div>

      {/* Botão Flutuante (+) */}
      <Link
        href={`/novo?date=${displayDate}`} 
        className="fixed bottom-24 right-4 bg-studio-green text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-all z-40 border-4 border-white"
      >
        <span className="text-3xl font-light mb-1">+</span>
      </Link>

    </AppShell>
  );
}