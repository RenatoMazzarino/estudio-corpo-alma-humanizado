import { format } from "date-fns";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "../../../components/ui/app-header";

import { AppointmentForm } from "./appointment-form";
import { listServices } from "../../../src/modules/services/repository";
import { listClients } from "../../../src/modules/clients/repository";
import { getAppointmentById } from "../../../src/modules/appointments/repository";
import { getSettings, listPixPaymentKeys } from "../../../src/modules/settings/repository";
import { BRAZIL_TIME_ZONE } from "../../../src/shared/timezone";
import { DEFAULT_PUBLIC_BASE_URL } from "../../../src/shared/config";
import { requireDashboardAccessForPage } from "../../../src/modules/auth/dashboard-access";

// Definindo tipos
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

interface PageProps {
  searchParams: SearchParams;
}

const PIX_KEY_TYPES = ["cnpj", "cpf", "email", "phone", "evp"] as const;

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
  const { tenantId, displayName, avatarUrl } = await requireDashboardAccessForPage("/novo");
  const params = await props.searchParams;
  const appointmentId = typeof params.appointmentId === "string" ? params.appointmentId : null;
  const clientId = typeof params.clientId === "string" ? params.clientId : null;

  // Buscar serviços ativos do Tenant
  const [{ data: services }, { data: clients }, appointmentResult, settingsResult, pixKeysResult] = await Promise.all([
    listServices(tenantId),
    listClients(tenantId),
    appointmentId ? getAppointmentById(tenantId, appointmentId) : Promise.resolve({ data: null, error: null }),
    getSettings(tenantId),
    listPixPaymentKeys(tenantId),
  ]);

  const appointment = appointmentResult?.data ?? null;
  const prefilledClient =
    !appointment && clientId ? (clients ?? []).find((client) => client.id === clientId) ?? null : null;
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
        displacementFee: appointment.displacement_fee ?? null,
        displacementDistanceKm: appointment.displacement_distance_km ?? null,
      }
    : null;
  const settings = settingsResult.data;
  const pixKeys = pixKeysResult.data ?? [];
  const activePixKey = pixKeys.find((item) => item.is_active) ?? pixKeys[0] ?? null;
  const activePixKeyType =
    activePixKey && PIX_KEY_TYPES.includes(activePixKey.key_type as (typeof PIX_KEY_TYPES)[number])
      ? (activePixKey.key_type as (typeof PIX_KEY_TYPES)[number])
      : null;

  return (
    <div className={appointment ? "-mx-4 h-full" : "-mx-4 flex h-full min-h-0 flex-col overflow-hidden"}>
      {appointment ? (
        <AppHeader
          label="Agendamento Interno"
          title="Editar Agendamento"
          subtitle="Atualize os detalhes do atendimento."
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
      ) : null}

      <main className={appointment ? "p-6 pb-6" : "flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-0"}>
        <AppointmentForm
          services={services || []}
          clients={clients || []}
          safeDate={safeDate}
          initialAppointment={initialAppointment}
          prefilledClient={prefilledClient}
          returnTo={returnTo}
          currentUserName={displayName}
          currentUserAvatarUrl={avatarUrl}
          signalPercentage={settings?.signal_percentage ?? 30}
          pointEnabled={settings?.mp_point_enabled ?? false}
          pointTerminalName={settings?.mp_point_terminal_name ?? ""}
          pointTerminalModel={settings?.mp_point_terminal_model ?? ""}
          publicBaseUrl={settings?.public_base_url ?? DEFAULT_PUBLIC_BASE_URL}
          pixKeyValue={activePixKey?.key_value ?? ""}
          pixKeyType={activePixKeyType}
        />
      </main>
    </div>
  );
}
