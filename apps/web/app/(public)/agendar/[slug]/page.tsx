import { BookingFlow } from "./booking-flow";
import { notFound } from "next/navigation";
import { getSettings, getTenantBySlug } from "../../../../src/modules/settings/repository";
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
  description: string;
  custom_buffer_minutes: number;
}

export default async function PublicBookingPage(props: PageProps) {
  const params = await props.params;
  const mercadoPagoPublicKey =
    process.env.MERCADOPAGO_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? null;

  // 1. Validar Tenant pelo Slug
  const { data: tenant } = await getTenantBySlug(params.slug);

  if (!tenant) notFound();

  // 2. Buscar Serviços e Settings do Tenant
  const { data: settings } = await getSettings(tenant.id);
  const whatsappNumber =
    settings && "whatsapp_notification_number" in settings
      ? (settings as { whatsapp_notification_number?: string | null }).whatsapp_notification_number ?? null
      : null;
  const { data: servicesData } = await listPublicServices(tenant.id);
  const services: PublicService[] = (servicesData ?? []).map((service) => ({
    id: service.id,
    name: service.name,
    price: service.price,
    duration_minutes: service.duration_minutes,
    accepts_home_visit: service.accepts_home_visit ?? false,
    description: service.description ?? "",
    custom_buffer_minutes: service.custom_buffer_minutes ?? 0,
  }));

  return (
    <div className="app-viewport flex justify-center items-stretch bg-neutral-900">
      <div id="app-frame" className="app-frame bg-studio-bg relative shadow-2xl overflow-hidden">
        {services.length > 0 ? (
          <BookingFlow
            tenant={tenant}
            services={services}
            signalPercentage={settings?.signal_percentage ?? 30}
            whatsappNumber={whatsappNumber}
            mercadoPagoPublicKey={mercadoPagoPublicKey}
          />
        ) : (
          <div className="h-full flex items-center justify-center px-6">
            <div className="bg-white border border-stone-100 rounded-2xl p-6 text-center text-sm text-stone-500 shadow-sm">
              Nenhum serviço cadastrado no momento.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
