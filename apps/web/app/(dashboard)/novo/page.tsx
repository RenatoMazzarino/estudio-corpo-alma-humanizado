import { format } from "date-fns";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

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

  // Buscar serviços ativos do Tenant
  const { data: services } = await listServices(FIXED_TENANT_ID);
  const { data: clients } = await listClients(FIXED_TENANT_ID);

  return (
    <div className="-mx-4 -mt-4">
      <header className="px-6 pb-4 bg-white rounded-b-3xl shadow-soft sticky top-0 z-20 safe-top safe-top-8">
        <div className="flex items-center justify-between mb-2">
          <Link
            href={`/?date=${safeDate}`}
            className="w-10 h-10 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
          >
            <ChevronLeft size={20} />
          </Link>

          <div className="text-right">
            <p className="text-[11px] font-extrabold text-studio-green uppercase tracking-widest">Corpo & Alma</p>
            <p className="text-[11px] text-muted flex items-center justify-end gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-ok rounded-full"></span> Online
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-extrabold text-muted uppercase tracking-widest">Agendamento Interno</p>
          <h1 className="text-2xl font-serif text-studio-text">Novo Agendamento</h1>
          <p className="text-xs text-muted mt-1">Preencha os detalhes do atendimento.</p>
        </div>
      </header>

      <main className="p-6 pb-28">
        <AppointmentForm services={services || []} clients={clients || []} safeDate={safeDate} />
      </main>
    </div>
  );
}
