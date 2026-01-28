import { createClient } from "../lib/supabase/server";
import { AppShell } from "../components/app-shell";
import { CheckCircle2, MapPin, Clock, CalendarX, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import { format, addDays, subDays, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Interface dos dados
interface Appointment {
  id: string;
  service_name: string;
  start_time: string;
  clients: {
    name: string;
    initials: string | null;
  } | null;
}

// Props da página
interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // 1. Define a data atual (ou a que veio na URL)
  const today = new Date();
  const selectedDate = params.date ? parseISO(params.date) : today;
  
  // Variáveis para navegação (Ontem e Amanhã)
  const nextDay = format(addDays(selectedDate, 1), "yyyy-MM-dd");
  const prevDay = format(subDays(selectedDate, 1), "yyyy-MM-dd");

  // 2. Busca Agendamentos DO DIA SELECIONADO
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
    .gte("start_time", startOfDay.toISOString())
    .lte("start_time", endOfDay.toISOString())
    .order("start_time", { ascending: true });

  const appointments = data as Appointment[] | null;
  const totalAtendimentos = appointments?.length || 0;

  // Formatação bonita para o título
  const dateTitle = format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  const isToday = isSameDay(selectedDate, today);

  return (
    <AppShell>
      {/* Cabeçalho de Navegação de Data */}
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

      {/* Resumo do Dia */}
      <div className="bg-studio-green text-white p-6 rounded-3xl shadow-lg shadow-green-100/50 mb-6 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        <h2 className="text-xl font-bold mb-1 relative z-10 capitalize">
          Agenda de {format(selectedDate, "EEEE", { locale: ptBR })}
        </h2>
        <p className="text-green-50 text-sm opacity-90 relative z-10">
          Você tem <strong className="text-white border-b border-white/30">{totalAtendimentos} atendimentos</strong> marcados.
        </p>
      </div>

      {/* LISTA DINÂMICA */}
      <div className="space-y-3">
        {appointments && appointments.length > 0 ? (
          appointments.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 relative group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-full bg-studio-pink/20 flex items-center justify-center text-studio-green font-bold text-sm">
                        {item.clients?.initials || "C"}
                      </div>
                      <div>
                          <h3 className="font-bold text-gray-800 text-base">{item.clients?.name}</h3>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin size={12} className="text-studio-green" />
                            <span>{item.service_name}</span>
                          </div>
                      </div>
                  </div>
                  <span className="bg-green-50 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-green-100">
                    <CheckCircle2 size={10} />
                    CONFIRMADO
                  </span>
              </div>
              
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-stone-50">
                  <div className="flex items-center gap-2 text-gray-700 bg-stone-50 px-3 py-1.5 rounded-lg">
                    <Clock size={14} className="text-gray-400" />
                    <span className="text-sm font-bold">
                      {format(new Date(item.start_time), "HH:mm")}
                    </span>
                  </div>
                  <button className="bg-studio-text text-white text-xs font-medium px-6 py-2.5 rounded-full hover:bg-black transition shadow-lg shadow-gray-200">
                    Iniciar
                  </button>
              </div>
            </div>
          ))
        ) : (
          /* Estado Vazio */
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 opacity-60 border-2 border-dashed border-stone-200 rounded-3xl">
            <CalendarX size={48} className="mb-2 text-stone-300" />
            <p className="text-sm font-medium">Livre neste dia</p>
            <span className="text-xs text-stone-400">Nenhum agendamento encontrado</span>
          </div>
        )}
      </div>

      {/* --- NOVO: Botão Flutuante de Agendar (+) --- */}
      {/* Ele fica fixo no canto inferior direito, acima do menu */}
      <Link
        href={`/novo?date=${format(selectedDate, "yyyy-MM-dd")}`} 
        className="absolute bottom-24 right-4 bg-studio-green text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-all z-40 border-4 border-white"
      >
        <span className="text-3xl font-light mb-1">+</span>
      </Link>

    </AppShell>
  );
}