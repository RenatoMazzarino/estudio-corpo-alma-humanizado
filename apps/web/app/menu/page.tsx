import Link from "next/link";
import { Sparkles, ChevronRight, Settings } from "lucide-react";

export default function MenuPage() {
  return (
    <div className="p-4 bg-stone-50 min-h-full">
      {/* Cabeçalho */}
      <h1 className="text-2xl font-serif font-bold text-studio-green mb-6 px-2 mt-2">Menu Principal</h1>

      <div className="space-y-4">
        
        {/* Card: Catálogo */}
        <Link href="/catalogo" className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-stone-100 hover:shadow-md transition-all group active:scale-95">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Sparkles size={24} />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-800 text-lg">Catálogo</h2>
            <p className="text-xs text-gray-500 font-medium">Gerencie seus serviços</p>
          </div>
          <ChevronRight size={20} className="text-gray-300 group-hover:text-purple-600 transition-colors" />
        </Link>

        {/* Placeholder para Configurações (Futuro) */}
        <div className="flex items-center gap-4 bg-gray-50 p-5 rounded-3xl border border-stone-100 opacity-60 cursor-not-allowed">
            <div className="w-12 h-12 bg-gray-200 text-gray-400 rounded-2xl flex items-center justify-center">
                <Settings size={24} />
            </div>
            <div className="flex-1">
                <h2 className="font-bold text-gray-400 text-lg">Configurações</h2>
                <p className="text-xs text-gray-400 font-medium">Em breve</p>
            </div>
        </div>

      </div>
    </div>
  );
}
