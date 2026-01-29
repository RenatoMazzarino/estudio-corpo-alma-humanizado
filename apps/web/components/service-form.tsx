"use client";

import { useState } from "react";
import { Sparkles, Clock, Banknote, MapPin, AlignLeft, ChevronLeft } from "lucide-react";
import { upsertService } from "../app/actions";
import { Service } from "../types/service";

interface ServiceFormProps {
  service?: Service;
  onSuccess?: () => void;
  onCancel?: () => void; // Novo botão cancelar
}

export function ServiceForm({ service, onSuccess, onCancel }: ServiceFormProps) {
  const [acceptsHomeVisit, setAcceptsHomeVisit] = useState(service?.accepts_home_visit ?? false);
  const [loading, setLoading] = useState(false);

  return (
    <form 
      action={async (formData) => {
        setLoading(true);
        await upsertService(formData);
        setLoading(false);
        if (onSuccess) onSuccess();
      }}
      className="flex flex-col h-full bg-white"
    >
      <input type="hidden" name="id" value={service?.id || ""} />

      <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
        <div className="flex items-center gap-2">
            {onCancel && (
            <button type="button" onClick={onCancel} className="p-1 -ml-2 text-stone-500 hover:text-stone-800 rounded-full hover:bg-stone-100 transition">
                <ChevronLeft size={24} />
            </button>
            )}
            <h2 className="text-lg font-bold text-stone-800">
            {service ? "Editar Serviço" : "Novo Serviço"}
            </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Nome */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-400 uppercase ml-1">Nome</label>
          <div className="relative">
            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              name="name" 
              defaultValue={service?.name}
              placeholder="Ex: Massagem Relaxante"
              className="w-full bg-stone-50 border-stone-200 border rounded-xl py-3 pl-11 pr-4 text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
              required
            />
          </div>
        </div>

        {/* Descrição (Atenção: Este campo NÃO existe no banco, mas mantive visualmente conforme pedido, no submit será ignorado) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-400 uppercase ml-1">Descrição</label>
          <div className="relative">
            <AlignLeft className="absolute left-4 top-4 text-stone-400" size={18} />
            <textarea 
              name="description" 
              placeholder="Descreva os benefícios e detalhes..."
              rows={3}
              className="w-full bg-stone-50 border-stone-200 border rounded-xl py-3 pl-11 pr-4 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Preço */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase ml-1">Valor (R$)</label>
            <div className="relative">
              <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input 
                name="price" 
                type="number" step="0.01"
                defaultValue={service?.price}
                className="w-full bg-stone-50 border-stone-200 border rounded-xl py-3 pl-11 pr-4 text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                required
              />
            </div>
          </div>

          {/* Duração */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase ml-1">Tempo (min)</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input 
                name="duration_minutes" 
                type="number"
                defaultValue={service?.duration_minutes}
                className="w-full bg-stone-50 border-stone-200 border rounded-xl py-3 pl-11 pr-4 text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                required
              />
            </div>
          </div>
        </div>

        {/* Seção Domiciliar */}
        <div className="pt-4 border-t border-stone-100">
          <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 space-y-4">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="accepts_home_visit" name="accepts_home_visit"
                defaultChecked={acceptsHomeVisit}
                onChange={(e) => setAcceptsHomeVisit(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              <label htmlFor="accepts_home_visit" className="text-sm font-bold text-purple-900">
                Atendimento Domiciliar?
              </label>
            </div>

            {acceptsHomeVisit && (
              <div className="animate-in slide-in-from-top-2 fade-in">
                <label className="text-xs font-bold text-purple-400 uppercase ml-1">Taxa de Deslocamento (+R$)</label>
                <div className="relative mt-1">
                   <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={18} />
                   <input 
                      name="home_visit_fee" 
                      type="number" step="0.01"
                      defaultValue={service?.home_visit_fee || 0}
                      className="w-full bg-white border-purple-200 border rounded-xl py-3 pl-11 pr-4 text-purple-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                   />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé Fixo */}
      <div className="p-6 border-t border-stone-100 bg-white">
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-studio-green text-white font-bold py-4 rounded-2xl shadow-lg shadow-studio-green/20 hover:bg-studio-green-dark active:scale-[0.98] transition-all disabled:opacity-70"
        >
          {loading ? "Salvando..." : "Salvar Serviço"}
        </button>
      </div>
    </form>
  );
}
