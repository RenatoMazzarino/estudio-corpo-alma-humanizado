import { createClient } from "../../lib/supabase/server";
import { AppShell } from "../../components/app-shell";
import { ChevronLeft, Sparkles, Clock, PackageOpen } from "lucide-react";
import Link from "next/link";
import { FIXED_TENANT_ID } from "../../lib/tenant-context";

// Interface dos dados
interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // minutos
}

export default async function CatalogoPage() {
  const supabase = await createClient();

  // Busca serviços do tenant
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("tenant_id", FIXED_TENANT_ID)
    .order("name", { ascending: true });

  const services = data as Service[] | null;

  return (
    <AppShell>
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/menu" className="p-2 bg-white rounded-full text-gray-600 shadow-sm border border-stone-100 hover:bg-stone-50 transition">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">Catálogo de Serviços</h1>
      </div>

      <div className="space-y-3 pb-24">
        {services && services.length > 0 ? (
          services.map((service) => (
            <div key={service.id} className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 flex items-center justify-between group hover:border-purple-200 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                    <Sparkles size={18} />
                </div>
                <div>
                   <h3 className="font-bold text-gray-800">{service.name}</h3>
                   <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1"><Clock size={12} /> {service.duration} min</span>
                   </div>
                </div>
              </div>

               <div className="text-right">
                 <span className="block font-bold text-gray-800 text-sm">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}
                 </span>
               </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 opacity-60 border-2 border-dashed border-stone-200 rounded-3xl bg-stone-50/50">
            <PackageOpen size={48} className="mb-2 text-stone-300" />
            <p className="text-sm font-medium">Nenhum serviço cadastrado.</p>
          </div>
        )}
      </div>

    </AppShell>
  );
}
