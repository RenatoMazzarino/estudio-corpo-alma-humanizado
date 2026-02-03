import { format } from "date-fns";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "../../../components/ui/app-header";

import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { AppointmentForm } from "./appointment-form";
import { listServices } from "../../../src/modules/services/repository";
import { listClients } from "../../../src/modules/clients/repository";

// Definindo tipos
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

interface PageProps {
  searchParams: SearchParams;
}

// Helper para sanitizar a data
function getSafeDate(dateParam: string | string[] | undefined): string {
  if (typeof dateParam === "string") {
    return dateParam;
  }
  // Fallback para hoje
  return format(new Date(), "yyyy-MM-dd");
}

export default async function NewAppointment(props: PageProps) {
  const params = await props.searchParams;
  const safeDate = getSafeDate(params.date);
  const returnTo =
    typeof params.returnTo === "string"
      ? decodeURIComponent(params.returnTo)
      : `/?view=day&date=${safeDate}`;

  // Buscar serviços ativos do Tenant
  const { data: services } = await listServices(FIXED_TENANT_ID);
  const { data: clients } = await listClients(FIXED_TENANT_ID);

  return (
    <div className="-mx-4 -mt-4">
      <AppHeader
        label="Agendamento Interno"
        title="Novo Agendamento"
        subtitle="Preencha os detalhes do atendimento."
        leftSlot={
          <Link
            href={returnTo}
            className="w-10 h-10 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
            aria-label="Voltar"
          >
            <ChevronLeft size={20} />
          </Link>
        }
      />

      <main className="p-6 pb-28">
        <AppointmentForm services={services || []} clients={clients || []} safeDate={safeDate} />
      </main>
    </div>
  );
}
