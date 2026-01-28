import { AppShell } from "../../components/app-shell";
import { ArrowRight, CreditCard, Banknote, QrCode } from "lucide-react";

export default function CaixaPage() {
  return (
    <AppShell>
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-xl font-bold text-gray-800">Finalizar Atendimento</h2>
      </div>

      {/* Resumo do Carrinho */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100 mb-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Resumo</h3>
          <div className="flex justify-between items-center mb-2 border-b border-gray-50 pb-2">
              <div>
                  <p className="font-semibold text-gray-800">Drenagem Linfática</p>
                  <p className="text-xs text-gray-500">Prof. Carla (40%)</p>
              </div>
              <span className="font-bold text-gray-800">R$ 150,00</span>
          </div>
          {/* Upsell Sugerido */}
          <div className="bg-purple-50 p-3 rounded-2xl flex items-center justify-between mt-2 border border-purple-100">
              <div className="flex items-center gap-3">
                  <div className="bg-white p-1.5 rounded-lg text-purple-600 shadow-sm"><Banknote size={16} /></div>
                  <div className="text-xs">
                      <p className="font-bold text-purple-900">Sugerir: Home Care</p>
                      <p className="text-purple-700">+ R$ 50,00</p>
                  </div>
              </div>
              <button className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-lg font-bold shadow-md hover:scale-105 transition">+</button>
          </div>
      </div>

      {/* Métodos de Pagamento */}
      <div className="grid grid-cols-2 gap-3 mb-6">
          <button className="p-4 border-2 border-studio-green bg-green-50 rounded-2xl flex flex-col items-center justify-center text-studio-green font-bold shadow-sm transition hover:scale-[1.02]">
              <CreditCard size={24} className="mb-2" />
              Cartão
          </button>
          <button className="p-4 border border-gray-200 bg-white rounded-2xl flex flex-col items-center justify-center text-gray-400 font-medium shadow-sm transition hover:border-gray-300">
              <QrCode size={24} className="mb-2" />
              Pix
          </button>
      </div>

      {/* VISUALIZAÇÃO DO SPLIT (A Mágica da Lei Salão Parceiro) */}
      <div className="bg-studio-text rounded-3xl p-6 text-white shadow-xl shadow-gray-300 mb-20 relative overflow-hidden">
          {/* Fundo decorativo */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>

          <div className="flex justify-between items-end mb-4 relative z-10">
              <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider font-bold">Total Transação</p>
                  <p className="text-3xl font-bold tracking-tight">R$ 150,00</p>
              </div>
              <div className="text-right">
                  <p className="text-gray-400 text-[10px]">Taxa Maq.</p>
                  <p className="text-sm font-mono text-red-400">- R$ 3,80</p>
              </div>
          </div>
          
          <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden flex mb-5 relative z-10">
              <div className="bg-studio-pink h-full" style={{ width: "40%" }}></div> {/* Parte Profissional */}
              <div className="bg-studio-green h-full" style={{ width: "60%" }}></div> {/* Parte Estúdio */}
          </div>

          <div className="space-y-3 relative z-10">
              <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-studio-pink"></span>
                      <span className="text-gray-300">Profissional (Carla)</span>
                  </div>
                  <span className="font-mono font-bold">R$ 58,48</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-studio-green"></span>
                      <span className="text-gray-300">Estúdio (Caixa)</span>
                  </div>
                  <span className="font-mono font-bold">R$ 87,72</span>
              </div>
          </div>

          <button className="w-full mt-8 bg-studio-green hover:bg-studio-green-dark text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex justify-center items-center gap-2 active:scale-95">
              <span>Cobrar Agora</span>
              <ArrowRight size={18} />
          </button>
          <p className="text-[9px] text-gray-500 text-center mt-3 flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            Split Automático Ativo
          </p>
      </div>
    </AppShell>
  );
}