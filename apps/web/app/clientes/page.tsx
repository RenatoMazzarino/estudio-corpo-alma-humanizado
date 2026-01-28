import { createClient } from "../../lib/supabase/server";
import { AppShell } from "../../components/app-shell";
import { ChevronLeft, User, Search, UserX } from "lucide-react";
import Link from "next/link";
import { FIXED_TENANT_ID } from "../../lib/tenant-context";

// Interface dos dados
interface Client {
  id: string;
  name: string;
  initials: string | null;
}

export default async function ClientesPage() {
  const supabase = await createClient();

  // Busca clientes do tenant
  const { data } = await supabase
    .from("clients")
    .select("id, name, initials")
    .eq("tenant_id", FIXED_TENANT_ID)
    .order("name", { ascending: true });

  const clients = data as Client[] | null;

  return (
    <AppShell>
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/menu" className="p-2 bg-white rounded-full text-gray-600 shadow-sm border border-stone-100 hover:bg-stone-50 transition">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">Meus Clientes</h1>
      </div>

      {/* Busca (Visual por enquanto) */}
      <div className="mb-6 relative">
         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
         <input 
            type="text" 
            placeholder="Buscar cliente..." 
            className="w-full bg-white border-none rounded-2xl py-3.5 pl-11 pr-4 text-gray-700 shadow-sm placeholder-gray-300 focus:ring-2 focus:ring-studio-green/20 outline-none"
         />
      </div>

      <div className="space-y-2 pb-24">
        {clients && clients.length > 0 ? (
          clients.map((client) => (
            <div key={client.id} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4 hover:bg-stone-50 transition-colors">
                <div className="w-10 h-10 bg-studio-green text-white rounded-full flex items-center justify-center font-bold text-xs shadow-md shadow-green-200">
                    {client.initials || <User size={16} />}
                </div>
                <div className="flex-1">
                   <h3 className="font-bold text-gray-800 text-sm">{client.name}</h3>
                </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 opacity-60 border-2 border-dashed border-stone-200 rounded-3xl bg-stone-50/50">
            <UserX size={48} className="mb-2 text-stone-300" />
            <p className="text-sm font-medium">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>

    </AppShell>
  );
}
