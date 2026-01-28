import { createClient } from "../../../lib/supabase/server";
import { BookingFlow } from "./booking-flow";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicBookingPage(props: PageProps) {
  const params = await props.params;
  const supabase = await createClient();

  // 1. Validar Tenant pelo Slug
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .single();

  if (!tenant) notFound();

  // 2. Buscar Serviços do Tenant
  const { data: services } = await supabase
    .from("services")
    .select("id, name, price, duration_minutes")
    .eq("tenant_id", tenant.id)
    .order("name");

  return (
    <div className="min-h-screen bg-stone-50 flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative flex flex-col">
            <div className="bg-studio-green px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-lg shadow-green-100 mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-white font-bold text-xl">{tenant.name}</h1>
                        <p className="text-green-100 text-sm opacity-80">Agendamento Online</p>
                    </div>
                </div>
            </div>

            <div className="px-6 flex-1 pb-10">
                <BookingFlow tenant={tenant} services={services || []} />
            </div>
            
             <div className="p-4 text-center text-xs text-gray-300">Powered by Studio</div>
        </div>
    </div>
  );
}
