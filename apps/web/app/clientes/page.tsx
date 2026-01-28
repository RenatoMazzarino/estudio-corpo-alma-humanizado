import { AppShell } from "../../components/app-shell";
import { ChevronLeft, Search, Plus, User } from "lucide-react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/server";
import { FIXED_TENANT_ID } from "../../lib/tenant-context";

export default async function ClientesPage() {
  const supabase = await createClient();

  // Busca clientes do tenant
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, initials, phone, appointments(count)")
    .eq("tenant_id", FIXED_TENANT_ID)
    .order("name");

  return (
    <AppShell>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <Link href="/menu" className="p-2 bg-white rounded-full text-gray-600 shadow-sm border border-stone-100">
            <ChevronLeft size={20} />
            </Link>
            <h1 className="text-lg font-bold text-gray-800">Meus Clientes</h1>
        </div>
        <Link 
            href="/clientes/novo" 
            className="bg-studio-green text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-green-100 flex items-center gap-2 hover:bg-studio-green-dark transition"
        >
            <Plus size={16} /> Novo
        </Link>
      </div>

      {/* Busca (Visual) - Poderia virar funcional depois */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar cliente..." 
          className="w-full bg-white border-stone-100 border rounded-2xl py-3.5 pl-11 pr-4 text-gray-600 focus:outline-none focus:ring-2 focus:ring-studio-green/20"
        />
      </div>

      {/* Lista de Clientes */}
      <div className="space-y-3 pb-20">
        {clients?.map((client) => {
           // Type assertion para resolver o count que vem do supabase
           const countResult = client.appointments as unknown as { count: number }[];
           const visitCount = countResult?.[0]?.count || 0;
           
           return (
            <Link 
                href={`/clientes/${client.id}`}
                key={client.id} 
                className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between hover:shadow-md transition cursor-pointer"
            >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-studio-green text-white flex items-center justify-center font-bold text-lg">
                {client.initials}
                </div>
                <div>
                <h3 className="font-bold text-gray-800">{client.name}</h3>
                <div className="flex flex-col">
                    <span className="text-xs text-gray-400">{client.phone || "Sem telefone"}</span>
                    <span className="text-[10px] font-bold text-studio-green mt-1">
                        {visitCount} {visitCount === 1 ? 'Visita' : 'Visitas'}
                    </span>
                </div>
                </div>
            </div>
            
            <div className="flex flex-col items-end">
                {/* Badge de visitas (opcional/future) */}
                <span className="bg-stone-50 text-stone-500 text-[10px] font-bold px-2 py-1 rounded-full border border-stone-100 mb-1">
                    Ver Perfil
                </span>
            </div>
            </Link>
        );
        })}

        {clients?.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <User size={48} className="mx-auto mb-2 opacity-50" />
            <p>Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
