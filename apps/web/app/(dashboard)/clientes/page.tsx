import { User, Search, Plus } from "lucide-react";
import Link from "next/link";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { listClients } from "../../../src/modules/clients/repository";

interface ClientListItem {
  id: string;
  name: string;
  initials: string | null;
  phone: string | null;
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q || "";

  const { data } = await listClients(FIXED_TENANT_ID, query);
  const clients = data as ClientListItem[] | null;

  return (
    <div className="flex flex-col h-full bg-stone-50">
        
        {/* Header Fixo */}
        <div className="bg-white p-4 shadow-sm border-b border-stone-100 sticky top-0 z-10 text-gray-800">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-studio-green">Clientes</h1>
                <Link href="/clientes/novo" className="bg-studio-green text-white p-2 rounded-full shadow-lg hover:bg-studio-green-dark transition shadow-green-200">
                    <Plus size={24} />
                </Link>
            </div>
            
            {/* Search Bar - Server Action via GET Form */}
            <form className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                    name="q"
                    defaultValue={query}
                    placeholder="Buscar cliente..." 
                    className="w-full bg-stone-100 border-none rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-studio-green/20 outline-none placeholder:text-gray-400 text-gray-800"
                />
            </form>
        </div>

        {/* Lista Scrollável */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
            {clients?.map((client) => (
                <Link href={`/clientes/${client.id}`} key={client.id} className="block">
                    <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-stone-100 shadow-sm active:scale-95 transition-transform hover:border-studio-green/30">
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-studio-green font-bold text-lg border border-green-100">
                            {client.initials || <User size={20} />}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-base">{client.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                {client.phone && (
                                    <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                                        {client.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
            
            {(!clients || clients.length === 0) && (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <User size={48} className="text-stone-300 mb-4" />
                    <p className="text-stone-400 text-sm">Nenhum cliente encontrado.</p>
                </div>
            )}
        </div>
    </div>
  );
}
