"use client";

import { useState } from "react";
import { createShiftBlocks, clearMonthBlocks } from "../app/(dashboard)/admin/escala/actions";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Trash2, CheckCircle2 } from "lucide-react";

export function ShiftManager() {
  // Padrão para o próximo mês, já que escalas costumam ser planejadas com antecedência
  const [selectedMonth, setSelectedMonth] = useState(format(addMonths(new Date(), 1), "yyyy-MM"));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  async function handleCreate(type: 'even' | 'odd') {
    setLoading(true);
    setMessage(null);
    try {
      await createShiftBlocks(type, selectedMonth);
      setMessage({ 
        type: 'success', 
        text: `Escala de dias ${type === 'even' ? 'Pares' : 'Ímpares'} criada com sucesso para ${format(new Date(selectedMonth + '-01'), 'MMMM/yyyy', { locale: ptBR })}!` 
      });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: `Erro ao criar escala: ${error instanceof Error ? error.message : 'Desconhecido'}` });
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    if (!confirm("Tem certeza? Isso apagará TODOS os bloqueios deste mês.")) return;

    setLoading(true);
    setMessage(null);
    try {
      await clearMonthBlocks(selectedMonth);
      setMessage({ type: 'success', text: "Escala do mês limpa com sucesso!" });
    } catch (error) { // Usando a variável erro explicitamente
          console.error(error);
          setMessage({ type: 'error', text: `Erro ao limpar escala: ${error instanceof Error ? error.message : 'Desconhecido'}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
      
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-green-50 text-studio-green rounded-lg">
            <Calendar size={24} />
        </div>
        <div>
            <h2 className="text-xl font-bold text-gray-800">Gerenciar Plantões 🏥</h2>
            <p className="text-xs text-gray-500">Defina sua escala de trabalho mensal</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Seletor de Mês */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Mês de Referência</label>
            <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-stone-50 border-stone-100 border rounded-xl py-3 px-4 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
            />
        </div>

        {/* Feedback de Sucesso/Erro */}
        {message && (
            <div className={`p-4 rounded-xl text-sm flex items-center gap-2 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.type === 'success' && <CheckCircle2 size={16} />}
                {message.text}
            </div>
        )}

        {/* Botões de Ação */}
        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={() => handleCreate('even')}
                disabled={loading}
                className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-studio-green/20 hover:border-studio-green hover:bg-green-50 transition-all text-studio-green font-bold disabled:opacity-50"
            >
                <span className="text-lg mb-1">2, 4, 6...</span>
                <span className="text-xs uppercase">Dias Pares</span>
            </button>
            <button 
                onClick={() => handleCreate('odd')}
                disabled={loading}
                className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-studio-green/20 hover:border-studio-green hover:bg-green-50 transition-all text-studio-green font-bold disabled:opacity-50"
            >
                <span className="text-lg mb-1">1, 3, 5...</span>
                <span className="text-xs uppercase">Dias Ímpares</span>
            </button>
        </div>

        <button 
            onClick={handleClear}
            disabled={loading}
            className="w-full text-red-500 hover:text-red-700 text-sm font-medium py-2 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
            <Trash2 size={16} />
            Limpar escala de {format(new Date(selectedMonth + '-01'), 'MMMM', { locale: ptBR })}
        </button>
      </div>

    </div>
  );
}
