import { createClient } from "../lib/supabase/server";
import { AppShell } from "../components/app-shell";
import { CheckCircle2, MapPin, Clock, CalendarX } from "lucide-react";

// Criamos um "Molde" para o TypeScript entender o formato dos dados
interface Appointment {
  id: string;
  service_name: string;
  start_time: string;
  clients: {
    name: string;
    initials: string | null;
  } | null;
}

// Formatador de Data/Hora
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

export default async function Home() {
  const supabase = await createClient();

  // Buscamos os dados
  const { data } = await supabase
    .from("appointments")
    .select(`
      *,
      clients (
        name,
        initials
      )
    `)
    .order("start_time", { ascending: true });

  // Dizemos ao TypeScript: "Isso aqui é uma lista de Agendamentos!"
  const appointments = data as Appointment[] | null;
  const totalAtendimentos = appointments?.length || 0;

  return (
    <AppShell>
      {/* Card de Boas Vindas */}
      <div className="bg-studio-green text-white p-6 rounded-3xl shadow-lg shadow-green-100/50 mb-6 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        
        <h2 className="text-2xl font-bold mb-1 relative z-10">Olá, Janaina 🌿</h2>
        <p className="text-green-50 text-sm opacity-90 relative z-10">
          Sua agenda hoje tem <strong className="text-white border-b border-white/30">{totalAtendimentos} atendimentos</strong>.
        </p>
      </div>

      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Próximos Clientes</h3>
        <span className="text-[10px] bg-white text-gray-500 px-3 py-1 rounded-full border border-stone-200 shadow-sm font-medium">Hoje</span>
      </div>

      {/* Lista Dinâmica */}
      <div className="space-y-3">
        {appointments && appointments.length > 0 ? (
          appointments.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 relative group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-full bg-studio-pink/20 flex items-center justify-center text-studio-green font-bold text-sm">
                        {item.clients?.initials || "VP"}
                      </div>
                      <div>
                          <h3 className="font-bold text-gray-800 text-base">{item.clients?.name || "Cliente"}</h3>
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
                    <span className="text-sm font-bold">{formatTime(item.start_time)}</span>
                  </div>
                  <button className="bg-studio-text text-white text-xs font-medium px-6 py-2.5 rounded-full hover:bg-black transition shadow-lg shadow-gray-200">
                    Iniciar
                  </button>
              </div>
            </div>
          ))
        ) : (
          /* Estado Vazio */
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 opacity-60">
            <CalendarX size={48} className="mb-2" />
            <p className="text-sm">Sem agendamentos hoje</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}