"use client";

import { useState } from "react";
import { Service } from "../../../types/service";
import { ServiceForm } from "../../../components/service-form";
import Link from "next/link";
import { Plus, ChevronRight, Clock, MapPin, ChevronLeft } from "lucide-react";

interface CatalogoViewProps {
  initialServices: Service[];
  defaultBufferBefore: number | null;
  defaultBufferAfter: number | null;
}

export function CatalogoView({ initialServices, defaultBufferBefore, defaultBufferAfter }: CatalogoViewProps) {
  // Estado que controla qual "tela" estamos vendo
  // null = vendo lista; 'new' = criando; Service = editando
  const [activeScreen, setActiveScreen] = useState<Service | 'new' | null>(null);

  return (
    <div className="relative h-full bg-stone-50">
      
      {/* TELA 1: LISTA (Só aparece se não estiver editando/criando) */}
      <div className={`transition-all duration-300 p-4 ${activeScreen ? '-translate-x-full opacity-0 absolute inset-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
        
        {/* Header da Lista */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-3">
             <Link href="/menu" className="p-2 bg-white rounded-full text-gray-600 shadow-sm border border-stone-100 hover:bg-stone-50 transition">
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-stone-800">Catálogo</h1>
              <p className="text-xs text-stone-500">Gerencie seus serviços</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveScreen('new')}
            className="bg-studio-green text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-green-100 flex items-center gap-2 hover:bg-studio-green-dark transition"
          >
            <Plus size={16} /> Novo
          </button>
        </div>

        {/* Lista de Cards */}
        <div className="space-y-3 pb-24">
          {initialServices.length === 0 && (
            <div className="text-center py-10 text-stone-400">
              <p>Nenhum serviço ainda.</p>
              <p className="text-sm">Clique no + para adicionar.</p>
            </div>
          )}

          {initialServices.map((service) => (
            <div 
              key={service.id}
              onClick={() => setActiveScreen(service)}
              className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4 active:scale-[0.99] transition-transform cursor-pointer group hover:border-studio-green/30"
            >
              {/* Ícone / "Foto" */}
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${service.accepts_home_visit ? 'bg-purple-50 text-purple-600' : 'bg-studio-green/10 text-studio-green'}`}>
                 {service.accepts_home_visit ? <MapPin size={24} /> : <span className="text-xl font-bold">{service.name.charAt(0)}</span>}
              </div>

              {/* Informações */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-stone-800 text-sm truncate">{service.name}</h3>
                <p className="text-xs text-stone-500 truncate mb-1">
                    {service.description || "Sem descrição"}
                </p> 
                <div className="flex items-center gap-3 text-xs text-stone-400">
                  <span className="flex items-center gap-1"><Clock size={12}/> {service.duration_minutes}min</span>
                  {service.accepts_home_visit && <span className="text-purple-600 font-medium">Domicílio disponível</span>}
                </div>
              </div>

              {/* Preço e Seta */}
              <div className="text-right">
                <span className="block font-bold text-stone-800 text-sm">R$ {service.price}</span>
                <ChevronRight size={16} className="text-stone-300 ml-auto mt-1 group-hover:text-studio-green" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TELA 2: FORMULÁRIO (Slide Over) */}
      <div className={`absolute inset-0 bg-stone-50 transition-transform duration-300 z-20 overflow-y-auto ${activeScreen ? 'translate-x-0' : 'translate-x-full'}`}>
        {activeScreen && (
          <ServiceForm 
            service={activeScreen === 'new' ? undefined : activeScreen}
            defaultBufferBefore={defaultBufferBefore}
            defaultBufferAfter={defaultBufferAfter}
            onSuccess={() => setActiveScreen(null)}
            onCancel={() => setActiveScreen(null)}
          />
        )}
      </div>

    </div>
  );
}
