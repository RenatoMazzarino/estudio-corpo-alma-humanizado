import { BookingFlow } from "./booking-flow";
import { notFound } from "next/navigation";
import { getTenantBySlug } from "../../../../src/modules/settings/repository";
import { listPublicServices } from "../../../../src/modules/services/repository";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface PublicService {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  accepts_home_visit: boolean;
  home_visit_fee: number;
  description: string;
  custom_buffer_minutes: number;
}

export default async function PublicBookingPage(props: PageProps) {
  const params = await props.params;

  // 1. Validar Tenant pelo Slug
  const { data: tenant } = await getTenantBySlug(params.slug);

  if (!tenant) notFound();

  // 2. Buscar Serviços do Tenant
  const { data: servicesData } = await listPublicServices(tenant.id);
  const services: PublicService[] = (servicesData ?? []).map((service) => ({
    id: service.id,
    name: service.name,
    price: service.price,
    duration_minutes: service.duration_minutes,
    accepts_home_visit: service.accepts_home_visit ?? false,
    home_visit_fee: service.home_visit_fee ?? 0,
    description: service.description ?? "",
    custom_buffer_minutes: service.custom_buffer_minutes ?? 0,
  }));

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
                {services.length > 0 ? (
                  <BookingFlow tenant={tenant} services={services} />
                ) : (
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 text-center text-sm text-stone-500">
                    Nenhum serviço cadastrado no momento.
                  </div>
                )}
            </div>
            
             <div className="p-4 text-center text-xs text-gray-300">Powered by Studio</div>
        </div>
    </div>
  );
}
