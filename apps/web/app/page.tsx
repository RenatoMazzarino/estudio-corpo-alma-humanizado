import { AppShell } from "../components/app-shell";
import { CheckCircle2, MapPin, Clock } from "lucide-react";

export default function Home() {
  return (
    <AppShell>
      {/* Card de Boas Vindas com VERDE SÁLVIA (#6A806C) FORÇADO */}
      <div className="bg-studio-green text-white p-6 rounded-3xl shadow-lg shadow-green-100/50 mb-6 relative overflow-hidden">
        
        {/* Efeito decorativo */}
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        
        <h2 className="text-2xl font-bold mb-1 relative z-10">Olá, Janaina 🌿</h2>
        <p className="text-green-50 text-sm opacity-90 relative z-10">
          Sua agenda hoje tem <strong className="text-white border-b border-white/30">4 atendimentos</strong>.
        </p>
      </div>

      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Próximo Cliente</h3>
        <span className="text-[10px] bg-white text-gray-500 px-3 py-1 rounded-full border border-stone-200 shadow-sm font-medium">Hoje, 27 Jan</span>
      </div>

      {/* Card de Agendamento */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 relative group hover:shadow-md transition-all">
        <div className="flex justify-between items-start mb-3">
            <div className="flex gap-3 items-center">
                {/* Avatar com fundo Rosa (#CEAEB9) */}
                <div className="w-12 h-12 rounded-full bg-studio-pink/20 flex items-center justify-center text-studio-green font-bold text-sm">AS</div>
                <div>
                    <h3 className="font-bold text-gray-800 text-base">Ana Souza</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      {/* Ícone Verde */}
                      <MapPin size={12} className="text-studio-green" />
                      <span>Drenagem Linfática</span>
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
              <span className="text-sm font-bold">09:00</span>
            </div>
            {/* Botão Preto Carvão (#2D2D2D) */}
            <button className="bg-studio-text text-white text-xs font-medium px-6 py-2.5 rounded-full hover:bg-black transition shadow-lg shadow-gray-200">
              Iniciar
            </button>
        </div>
      </div>
    </AppShell>
  );
}