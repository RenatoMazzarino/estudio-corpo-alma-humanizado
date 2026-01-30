import { createClient } from "../../lib/supabase/server";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Wallet, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format, addDays, subDays, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FIXED_TENANT_ID } from "../../lib/tenant-context";

// Interface dos dados
interface Appointment {
  id: string;
  service_name: string;
  price: number | null; 
  clients: {
    name: string;
  } | null;
}

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function CaixaPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  const today = new Date();
  let selectedDate = today;

  if (searchParams?.date && typeof searchParams.date === "string") {
    selectedDate = parseISO(searchParams.date);
  }
  
  const nextDay = format(addDays(selectedDate, 1), "yyyy-MM-dd");
  const prevDay = format(subDays(selectedDate, 1), "yyyy-MM-dd");

  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Busca Agendamentos FINALIZADOS ('completed')
  const { data } = await supabase
    .from("appointments")
    .select(`
      id,
      service_name,
      price,
      clients ( name )
    `)
    .eq("tenant_id", FIXED_TENANT_ID)
    .eq("status", "completed") // Updated from 'done' to 'completed'
    .gte("start_time", startOfDay.toISOString())
    .lte("start_time", endOfDay.toISOString());

  const appointments = data as Appointment[] | null;

  const totalFaturado = appointments?.reduce((acc, item) => {
    return acc + (item.price || 0);
  }, 0) || 0;

  const dateTitle = format(selectedDate, "d 'de' MMMM", { locale: ptBR });
  const isToday = isSameDay(selectedDate, today);

  return (
    <div className="flex flex-col h-full bg-stone-50 p-4 pb-24 overflow-y-auto">
      {/* Navegação de Data */}
      <div className="flex items-center justify-between mb-6 bg-white p-3 rounded-2xl shadow-sm border border-stone-100 sticky top-0 z-10">
        <Link href={`/caixa?date=${prevDay}`} className="p-2 hover:bg-stone-50 rounded-full text-gray-500 transition">
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

        <Link href={`/caixa?date=${nextDay}`} className="p-2 hover:bg-stone-50 rounded-full text-gray-500 transition">
          <ChevronRight size={20} />
        </Link>
      </div>

      {/* PLACAR DO DINHEIRO */}
      <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-xl shadow-gray-200 mb-6 relative overflow-hidden border border-gray-800 transform transition-transform hover:scale-[1.02] duration-300">
        <div className="absolute right-0 top-0 w-32 h-32 bg-studio-green/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Wallet size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Faturamento do Dia</span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFaturado)}
          </h2>
          <p className="text-gray-400 text-xs mt-2 flex items-center gap-1">
            <TrendingUp size={12} className="text-green-400" />
            Baseado em {appointments?.length || 0} atendimentos finalizados
          </p>
        </div>
      </div>

      {/* Lista de Entradas */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Histórico do Dia</h3>
        
        {appointments && appointments.length > 0 ? (
          appointments.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-gray-800 text-sm">{item.clients?.name}</h4>
                <p className="text-xs text-gray-500">{item.service_name}</p>
              </div>
              <div className="text-right">
                 {/* Se o preço for Zero/Null, mostramos um aviso visual */}
                 {item.price ? (
                    <span className="font-bold text-gray-800">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                    </span>
                 ) : (
                    <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-md flex items-center gap-1">
                      <AlertCircle size={10} /> Sem Valor
                    </span>
                 )}
              </div>
            </div>
          ))
        ) : (
           <div className="text-center py-10 opacity-50 flex flex-col items-center">
             <Wallet size={32} className="text-gray-300 mb-2" />
             <p className="text-sm text-gray-400">Nenhum valor entrou hoje.</p>
           </div>
        )}
      </div>
    </div>
  );
}
