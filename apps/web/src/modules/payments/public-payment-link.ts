import { createServiceClient } from "../../../lib/supabase/service";
import { formatCurrencyBRL } from "../../shared/currency";
import { DEFAULT_STUDIO_DISPLAY_NAME } from "../../shared/config";
import { resolveClientNames } from "../clients/name-profile";
import { resolvePayerEmail, roundCurrencyValue } from "./mercadopago-orders.helpers";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AppointmentClientRecord = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  public_first_name: string | null;
  public_last_name: string | null;
  internal_reference: string | null;
};

type AppointmentRecord = {
  id: string;
  tenant_id: string;
  attendance_code: string | null;
  service_name: string | null;
  start_time: string;
  price: number | null;
  payment_status: string | null;
  is_home_visit: boolean | null;
  address_logradouro: string | null;
  address_numero: string | null;
  address_complemento: string | null;
  address_bairro: string | null;
  address_cidade: string | null;
  address_estado: string | null;
  clients: AppointmentClientRecord | AppointmentClientRecord[] | null;
};

type PaymentRow = {
  id: string;
  amount: number | null;
  status: string | null;
  created_at: string | null;
};

export type PublicPaymentLinkContext = {
  publicId: string;
  appointmentId: string;
  tenantId: string;
  attendanceCode: string | null;
  serviceName: string;
  startTime: string;
  isHomeVisit: boolean;
  locationLabel: string;
  clientName: string;
  payerPhone: string;
  payerEmail: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: string | null;
  latestPaidPaymentId: string | null;
  amountLabel: string;
  paidAmountLabel: string;
  remainingAmountLabel: string;
  referenceLabel: string;
};

function normalizeClient(clients: AppointmentRecord["clients"]): AppointmentClientRecord | null {
  if (Array.isArray(clients)) {
    return clients[0] ?? null;
  }
  return clients ?? null;
}

function buildLocationLabel(appointment: AppointmentRecord) {
  if (!appointment.is_home_visit) {
    return DEFAULT_STUDIO_DISPLAY_NAME;
  }

  const addressLine = [
    appointment.address_logradouro,
    appointment.address_numero,
    appointment.address_complemento,
    appointment.address_bairro,
    appointment.address_cidade,
    appointment.address_estado,
  ]
    .filter((value) => value && value.trim().length > 0)
    .join(", ");

  return addressLine || "Endereço informado no agendamento";
}

export async function getPublicPaymentLinkContext(publicId: string): Promise<PublicPaymentLinkContext | null> {
  const normalizedPublicId = publicId.trim();
  if (!normalizedPublicId) return null;

  const supabase = createServiceClient();
  const appointmentSelect =
    "id, tenant_id, attendance_code, service_name, start_time, price, payment_status, is_home_visit, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado, clients ( id, name, phone, email, public_first_name, public_last_name, internal_reference )";

  let appointment: AppointmentRecord | null = null;

  if (UUID_PATTERN.test(normalizedPublicId)) {
    const { data } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("id", normalizedPublicId)
      .maybeSingle();
    appointment = (data as AppointmentRecord | null) ?? null;
  }

  if (!appointment) {
    const { data } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("attendance_code", normalizedPublicId)
      .maybeSingle();
    appointment = (data as AppointmentRecord | null) ?? null;
  }

  if (!appointment) return null;

  const client = normalizeClient(appointment.clients);
  const clientNames = resolveClientNames({
    name: client?.name ?? null,
    publicFirstName: client?.public_first_name ?? null,
    publicLastName: client?.public_last_name ?? null,
    internalReference: client?.internal_reference ?? null,
  });

  const [{ data: checkout }, { data: payments }] = await Promise.all([
    supabase
      .from("appointment_checkout")
      .select("total")
      .eq("appointment_id", appointment.id)
      .eq("tenant_id", appointment.tenant_id)
      .maybeSingle(),
    supabase
      .from("appointment_payments")
      .select("id, amount, status, created_at")
      .eq("appointment_id", appointment.id)
      .eq("tenant_id", appointment.tenant_id)
      .order("created_at", { ascending: true }),
  ]);

  const totalAmount = roundCurrencyValue(Number(checkout?.total ?? appointment.price ?? 0));
  const paidPayments = ((payments ?? []) as PaymentRow[]).filter((payment) => payment.status === "paid");
  const paidAmount = roundCurrencyValue(
    paidPayments.reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0)
  );
  const remainingAmount = roundCurrencyValue(Math.max(totalAmount - paidAmount, 0));
  const payerPhone = (client?.phone ?? "").trim();
  const payerEmail = resolvePayerEmail({
    providedEmail: client?.email ?? null,
    phoneDigits: payerPhone,
  });
  const latestPaidPaymentId = paidPayments[paidPayments.length - 1]?.id ?? null;
  const attendanceCode = appointment.attendance_code?.trim() || null;
  const referenceLabel = attendanceCode || `AGD-${appointment.id.slice(0, 8).toUpperCase()}`;

  return {
    publicId: normalizedPublicId,
    appointmentId: appointment.id,
    tenantId: appointment.tenant_id,
    attendanceCode,
    serviceName: appointment.service_name?.trim() || "Atendimento",
    startTime: appointment.start_time,
    isHomeVisit: Boolean(appointment.is_home_visit),
    locationLabel: buildLocationLabel(appointment),
    clientName: clientNames.publicFullName,
    payerPhone,
    payerEmail,
    totalAmount,
    paidAmount,
    remainingAmount,
    paymentStatus: appointment.payment_status,
    latestPaidPaymentId,
    amountLabel: formatCurrencyBRL(totalAmount),
    paidAmountLabel: formatCurrencyBRL(paidAmount),
    remainingAmountLabel: formatCurrencyBRL(remainingAmount),
    referenceLabel,
  };
}
