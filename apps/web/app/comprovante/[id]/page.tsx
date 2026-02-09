import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createServiceClient } from "../../../lib/supabase/service";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import ReceiptView from "./receipt-view";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function normalizeClient<T extends { clients: unknown }>(appointment: T) {
  const clients = appointment.clients;
  if (Array.isArray(clients)) {
    return { ...appointment, clients: clients[0] ?? null } as T;
  }
  return appointment;
}

function ReceiptNotFound() {
  return (
    <div className="min-h-screen bg-[#1f2324] text-white flex items-center justify-center px-6 py-10">
      <div className="max-w-md w-full rounded-3xl bg-white/10 border border-white/10 p-8 text-center">
        <h1 className="text-2xl font-serif font-bold mb-3">Recibo não encontrado</h1>
        <p className="text-sm text-white/70">
          Não localizamos um comprovante válido para este agendamento. Caso tenha dúvidas, fale com o
          estúdio.
        </p>
      </div>
    </div>
  );
}

export default async function ComprovantePage(props: PageProps) {
  const params = await props.params;
  const supabase = createServiceClient();

  const { data: appointmentData } = await supabase
    .from("appointments")
    .select("id, service_name, start_time, price, payment_status, clients ( name )")
    .eq("id", params.id)
    .eq("tenant_id", FIXED_TENANT_ID)
    .maybeSingle();

  if (!appointmentData || !appointmentData.payment_status || appointmentData.payment_status === "pending") {
    return <ReceiptNotFound />;
  }

  const appointment = normalizeClient(appointmentData) as {
    id: string;
    service_name: string;
    start_time: string;
    price: number | null;
    payment_status: string | null;
    clients: { name: string | null } | null;
  };

  const { data: checkoutData } = await supabase
    .from("appointment_checkout")
    .select("total")
    .eq("appointment_id", appointment.id)
    .eq("tenant_id", FIXED_TENANT_ID)
    .maybeSingle();

  const { data: paymentsData } = await supabase
    .from("appointment_payments")
    .select("id, amount, status, paid_at, created_at, transaction_id")
    .eq("appointment_id", appointment.id)
    .eq("tenant_id", FIXED_TENANT_ID)
    .order("created_at", { ascending: true });

  const paidPayments = (paymentsData ?? []).filter((payment) => payment.status === "paid");
  const paidAmount = paidPayments.reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0);
  const lastPaid = paidPayments.length > 0 ? paidPayments[paidPayments.length - 1] : null;
  const paidAt = lastPaid?.paid_at ?? lastPaid?.created_at ?? null;
  const transactionId = lastPaid?.transaction_id ?? lastPaid?.id ?? appointment.id;

  const totalAmount = Number(checkoutData?.total ?? appointment.price ?? 0);
  const startDate = new Date(appointment.start_time);
  const dateLabel = format(startDate, "dd/MM/yyyy", { locale: ptBR });
  const timeLabel = format(startDate, "HH:mm", { locale: ptBR });
  const paymentStatusLabel =
    appointment.payment_status === "paid" ? "Pagamento integral" : "Sinal pago";
  const signalLabel = appointment.payment_status === "partial" ? formatCurrency(paidAmount) : "—";
  const paidLabel = formatCurrency(appointment.payment_status === "paid" ? totalAmount : paidAmount);
  const generatedAtLabel = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <>
      <ReceiptView
        data={{
          id: appointment.id,
          clientName: appointment.clients?.name ?? "Cliente",
          serviceName: appointment.service_name,
          dateLabel,
          timeLabel,
          paymentStatusLabel,
          totalLabel: formatCurrency(totalAmount),
          signalLabel,
          paidLabel,
          transactionId,
          generatedAtLabel,
        }}
      />
    </>
  );
}
