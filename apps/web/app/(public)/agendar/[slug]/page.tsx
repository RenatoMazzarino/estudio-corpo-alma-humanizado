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
      <div className="w-full max-w-[414px] bg-studio-bg min-h-screen shadow-2xl relative flex flex-col border-x border-stone-200">
        <div className="bg-white/80 backdrop-blur-md border-b border-stone-200 px-6 py-5 flex items-center gap-3 sticky top-0 z-10">
          <div className="w-10 h-10 bg-studio-green/10 text-studio-green rounded-2xl flex items-center justify-center font-bold">
            {tenant.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">{tenant.name}</h1>
            <p className="text-xs text-gray-500">Agendamento Online</p>
          </div>
        </div>

        <div className="px-6 py-6 flex-1">
          {services.length > 0 ? (
            <BookingFlow tenant={tenant} services={services} />
          ) : (
            <div className="bg-white border border-stone-100 rounded-2xl p-6 text-center text-sm text-stone-500 shadow-sm">
              Nenhum serviço cadastrado no momento.
            </div>
          )}
        </div>

        <div className="p-4 text-center text-xs text-gray-400">Powered by Studio</div>
      </div>
    </div>
  );
}
