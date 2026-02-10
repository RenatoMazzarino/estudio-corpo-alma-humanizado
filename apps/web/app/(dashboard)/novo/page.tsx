import { format } from "date-fns";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "../../../components/ui/app-header";

import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { AppointmentForm } from "./appointment-form";
import { listServices } from "../../../src/modules/services/repository";
import { listClients } from "../../../src/modules/clients/repository";
import { getAppointmentById } from "../../../src/modules/appointments/repository";
import { BRAZIL_TIME_ZONE } from "../../../src/shared/timezone";
import { getAutoMessageTemplates } from "../../../src/shared/auto-messages";

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

function formatDateInBrazil(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatTimeInBrazil(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export default async function NewAppointment(props: PageProps) {
  const params = await props.searchParams;
  const appointmentId = typeof params.appointmentId === "string" ? params.appointmentId : null;

  // Buscar serviços ativos do Tenant
  const [{ data: services }, { data: clients }, appointmentResult] = await Promise.all([
    listServices(FIXED_TENANT_ID),
    listClients(FIXED_TENANT_ID),
    appointmentId ? getAppointmentById(FIXED_TENANT_ID, appointmentId) : Promise.resolve({ data: null, error: null }),
  ]);

  const appointment = appointmentResult?.data ?? null;
  const appointmentDate = appointment ? formatDateInBrazil(new Date(appointment.start_time)) : null;
  const safeDate = appointmentDate ?? getSafeDate(params.date);
  const returnTo =
    typeof params.returnTo === "string"
      ? decodeURIComponent(params.returnTo)
      : `/?view=day&date=${safeDate}`;

  const initialAppointment = appointment
    ? {
        id: appointment.id,
        serviceId: appointment.service_id ?? null,
        date: appointmentDate ?? safeDate,
        time: formatTimeInBrazil(new Date(appointment.start_time)),
        clientId: appointment.client_id ?? null,
        clientName: appointment.clients?.name ?? "Cliente",
        clientPhone: appointment.clients?.phone ?? null,
        isHomeVisit: appointment.is_home_visit ?? false,
        clientAddressId: appointment.client_address_id ?? null,
        addressCep: appointment.address_cep ?? null,
        addressLogradouro: appointment.address_logradouro ?? null,
        addressNumero: appointment.address_numero ?? null,
        addressComplemento: appointment.address_complemento ?? null,
        addressBairro: appointment.address_bairro ?? null,
        addressCidade: appointment.address_cidade ?? null,
        addressEstado: appointment.address_estado ?? null,
        internalNotes: appointment.internal_notes ?? null,
        priceOverride: appointment.price_override ?? null,
      }
    : null;
  const messageTemplates = getAutoMessageTemplates();

  return (
    <div className="-mx-4 -mt-4">
      <AppHeader
        label="Agendamento Interno"
        title={appointment ? "Editar Agendamento" : "Novo Agendamento"}
        subtitle={appointment ? "Atualize os detalhes do atendimento." : "Preencha os detalhes do atendimento."}
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
        <AppointmentForm
          services={services || []}
          clients={clients || []}
          safeDate={safeDate}
          initialAppointment={initialAppointment}
          returnTo={returnTo}
          messageTemplates={messageTemplates}
        />
      </main>
    </div>
  );
}
