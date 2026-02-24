import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createServiceClient } from "../../../lib/supabase/service";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { WHATSAPP_AUTOMATION_STUDIO_LOCATION_LINE } from "../../../src/modules/notifications/automation-config";
import { VoucherTicketCard } from "../../../components/voucher/voucher-ticket-card";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function normalizeClient<T extends { clients: unknown }>(appointment: T) {
  const clients = appointment.clients;
  if (Array.isArray(clients)) {
    return { ...appointment, clients: clients[0] ?? null } as T;
  }
  return appointment;
}

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

  const { data: appointmentData } = await supabase
    .from("appointments")
    .select(
      "id, service_name, start_time, is_home_visit, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado, clients ( name )"
    )
    .eq("id", params.id)
    .eq("tenant_id", FIXED_TENANT_ID)
    .maybeSingle();

  if (!appointmentData) {
    return <VoucherNotFound />;
  }

  const appointment = normalizeClient(appointmentData) as {
    id: string;
    service_name: string | null;
    start_time: string;
    is_home_visit: boolean | null;
    address_logradouro: string | null;
    address_numero: string | null;
    address_complemento: string | null;
    address_bairro: string | null;
    address_cidade: string | null;
    address_estado: string | null;
    clients: { name: string | null } | null;
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

  return (
    <div className="min-h-screen bg-[#1f2324] px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-[468px]">
        <div className="mb-4 text-center text-white">
          <h1 className="font-serif text-2xl font-bold">Voucher de Agendamento</h1>
          <p className="mt-1 text-sm text-white/75">
            {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} às {timeLabel}
          </p>
        </div>
        <VoucherTicketCard
          clientName={appointment.clients?.name?.trim() || "Cliente"}
          dayLabel={dayAndMonthLabel}
          timeLabel={timeLabel}
          serviceName={appointment.service_name || "Agendamento"}
          locationLabel={locationLine}
          bookingId={`AGD-${appointment.id.slice(0, 8).toUpperCase()}`}
        />
      </div>
    </div>
  );
}
