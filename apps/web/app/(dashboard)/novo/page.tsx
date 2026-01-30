import { format } from "date-fns";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { AppointmentForm } from "./appointment-form";
import { listServices } from "../../../src/modules/services/repository";

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

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/?date=${safeDate}`} className="p-2 bg-white rounded-full text-gray-600 shadow-sm border border-stone-100">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-gray-800">Novo Agendamento</h1>
      </div>

      {/* Formulário Inteligente (Client Component) */}
      <AppointmentForm services={services || []} safeDate={safeDate} />
    </>
  );
}
