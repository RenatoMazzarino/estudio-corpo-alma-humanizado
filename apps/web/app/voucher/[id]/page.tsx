import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createServiceClient } from "../../../lib/supabase/service";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { resolveClientNames } from "../../../src/modules/clients/name-profile";
import { WHATSAPP_AUTOMATION_STUDIO_LOCATION_LINE } from "../../../src/modules/notifications/automation-config";
import VoucherPageView from "./voucher-page-view";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeClient<T extends { clients: unknown }>(appointment: T) {
  const clients = appointment.clients;
  if (Array.isArray(clients)) {
    return { ...appointment, clients: clients[0] ?? null } as T;
  }
  return appointment;
}

type VoucherAppointmentRecord = Record<string, unknown> & { clients: unknown };

function VoucherNotFound() {
  return (
    <div className="min-h-screen bg-[#1f2324] text-white flex items-center justify-center px-6 py-10">
      <div className="max-w-md w-full rounded-3xl bg-white/10 border border-white/10 p-8 text-center">
        <h1 className="text-2xl font-serif font-bold mb-3">Voucher não encontrado</h1>
        <p className="text-sm text-white/70">
          Não localizamos um voucher válido para este agendamento. Caso tenha dúvidas, fale com o
          estúdio.
        </p>
      </div>
    </div>
  );
}

export default async function VoucherPage(props: PageProps) {
  const params = await props.params;
  const supabase = createServiceClient();
  const publicId = params.id.trim();
  const appointmentSelect =
    "id, attendance_code, service_name, start_time, is_home_visit, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado, clients ( name, public_first_name, public_last_name, internal_reference )";

  let appointmentData: VoucherAppointmentRecord | null = null;

  if (UUID_PATTERN.test(publicId)) {
    const { data } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("id", publicId)
      .eq("tenant_id", FIXED_TENANT_ID)
      .maybeSingle();
    appointmentData = (data as VoucherAppointmentRecord | null) ?? null;
  }

  if (!appointmentData) {
    const { data } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("attendance_code", publicId)
      .eq("tenant_id", FIXED_TENANT_ID)
      .maybeSingle();
    appointmentData = (data as VoucherAppointmentRecord | null) ?? null;
  }

  if (!appointmentData) {
    return <VoucherNotFound />;
  }

  const appointment = normalizeClient(appointmentData) as {
    id: string;
    attendance_code?: string | null;
    service_name: string | null;
    start_time: string;
    is_home_visit: boolean | null;
    address_logradouro: string | null;
    address_numero: string | null;
    address_complemento: string | null;
    address_bairro: string | null;
    address_cidade: string | null;
    address_estado: string | null;
    clients: {
      name: string | null;
      public_first_name?: string | null;
      public_last_name?: string | null;
      internal_reference?: string | null;
    } | null;
  };

  const startDate = new Date(appointment.start_time);
  if (Number.isNaN(startDate.getTime())) {
    return <VoucherNotFound />;
  }

  const dateLabel = format(startDate, "EEEE, dd/MM/yyyy", { locale: ptBR });
  const timeLabel = format(startDate, "HH:mm", { locale: ptBR });
  const dayPart = format(startDate, "dd", { locale: ptBR });
  const monthLabel = format(startDate, "MMM", { locale: ptBR }).replace(".", "").toUpperCase();
  const dayAndMonthLabel = `${dayPart} ${monthLabel}`;
  const locationAddress = [
    appointment.address_logradouro,
    appointment.address_numero,
    appointment.address_complemento,
    appointment.address_bairro,
    appointment.address_cidade,
    appointment.address_estado,
  ]
    .filter((value) => value && value.trim().length > 0)
    .join(", ");

  const locationLine = appointment.is_home_visit
    ? `No endereço informado: ${locationAddress || "Endereço informado no agendamento"}`
    : `No estúdio: ${WHATSAPP_AUTOMATION_STUDIO_LOCATION_LINE || "Estúdio Corpo & Alma Humanizado"}`;

  const clientNames = resolveClientNames({
    name: appointment.clients?.name ?? null,
    publicFirstName: appointment.clients?.public_first_name ?? null,
    publicLastName: appointment.clients?.public_last_name ?? null,
    internalReference: appointment.clients?.internal_reference ?? null,
  });

  return (
    <VoucherPageView
      clientName={clientNames.publicFullName}
      dateTimeLabel={`${dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} às ${timeLabel}`}
      dayLabel={dayAndMonthLabel}
      timeLabel={timeLabel}
      serviceName={appointment.service_name || "Agendamento"}
      locationLabel={locationLine}
      bookingId={appointment.attendance_code?.trim() || `AGD-${appointment.id.slice(0, 8).toUpperCase()}`}
    />
  );
}
