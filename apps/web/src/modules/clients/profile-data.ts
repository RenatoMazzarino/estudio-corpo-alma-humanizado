import { differenceInCalendarDays } from "date-fns";
import { createServiceClient } from "../../../lib/supabase/service";
import type { Database } from "../../../lib/supabase/types";
import {
  getClientById,
  listClientAddresses,
  listClientEmails,
  listClientHealthItems,
  listClientPhones,
  type ClientAddressRow,
  type ClientEmailRow,
  type ClientHealthItemRow,
  type ClientPhoneRow,
  type ClientRow,
} from "./repository";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];
type AppointmentCheckoutRow = Database["public"]["Tables"]["appointment_checkout"]["Row"];
type AppointmentPaymentRow = Database["public"]["Tables"]["appointment_payments"]["Row"];
type AppointmentEvolutionRow =
  Database["public"]["Tables"]["appointment_evolution_entries"]["Row"];
type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];

type ClientAppointmentHistoryRow = Pick<
  AppointmentRow,
  | "id"
  | "start_time"
  | "service_name"
  | "status"
  | "is_home_visit"
  | "price"
  | "price_override"
  | "payment_status"
  | "displacement_fee"
  | "attendance_code"
  | "internal_notes"
  | "finished_at"
>;

type ClientCheckoutSummaryRow = Pick<
  AppointmentCheckoutRow,
  | "appointment_id"
  | "subtotal"
  | "total"
  | "discount_type"
  | "discount_value"
  | "discount_reason"
  | "confirmed_at"
>;

type ClientPaymentSummaryRow = Pick<
  AppointmentPaymentRow,
  | "id"
  | "appointment_id"
  | "amount"
  | "method"
  | "status"
  | "paid_at"
  | "created_at"
  | "card_mode"
>;

type ClientTransactionSummaryRow = Pick<
  TransactionRow,
  | "id"
  | "appointment_id"
  | "amount"
  | "payment_method"
  | "type"
  | "created_at"
  | "description"
>;

export type ClientQuickChannel = {
  primaryPhoneRaw: string | null;
  whatsappPhoneRaw: string | null;
  phoneCount: number;
};

export type ClientPaymentMethodSummary = {
  key: "pix" | "card" | "cash" | "package" | "waiver" | "other";
  label: string;
  amount: number;
  percentage: number;
};

export type ClientFinancialSummary = {
  totalSpentLifetime: number;
  averageTicket: number;
  packagesAcquired: number;
  discountsGranted: number;
  estimatedLtv12Months: number;
  averageIntervalDays: number | null;
  daysSinceLastVisit: number | null;
  fidelityStars: number;
  referralsCount: number;
  paymentMethods: ClientPaymentMethodSummary[];
  completedSessionsCount: number;
};

export type ClientProntuarioEntry = {
  appointmentId: string;
  attendanceCode: string | null;
  startTime: string;
  serviceName: string;
  status: string | null;
  isHomeVisit: boolean | null;
  internalNotes: string | null;
  evolutionText: string | null;
  evolutionCreatedAt: string | null;
};

export type ClientAnamnesisSnapshot = {
  clinicalHistory: string | null;
  contraindications: string | null;
  preferencesNotes: string | null;
  observations: string | null;
  legacyNotes: string | null;
  anamneseUrl: string | null;
  healthTags: string[];
  healthItems: ClientHealthItemRow[];
};

export type ClientDetailSnapshot = {
  client: ClientRow;
  phones: ClientPhoneRow[];
  emails: ClientEmailRow[];
  addresses: ClientAddressRow[];
  healthItems: ClientHealthItemRow[];
  history: ClientAppointmentHistoryRow[];
  finance: ClientFinancialSummary;
  prontuarioEntries: ClientProntuarioEntry[];
  anamnesis: ClientAnamnesisSnapshot;
};

function sanitizeIlikeTerm(value: string | null | undefined) {
  return (value ?? "").replace(/[%_,]/g, "").trim();
}

function normalizePaymentMethod(
  method: string | null | undefined
): ClientPaymentMethodSummary["key"] {
  const normalized = (method ?? "").trim().toLowerCase();
  if (normalized === "pix" || normalized === "pix_mp" || normalized === "pix_key") {
    return "pix";
  }
  if (normalized === "card" || normalized === "credit" || normalized === "debit") {
    return "card";
  }
  if (normalized === "cash" || normalized === "dinheiro") {
    return "cash";
  }
  if (normalized === "package" || normalized === "pacote") {
    return "package";
  }
  if (normalized === "waiver" || normalized === "waived" || normalized === "isento") {
    return "waiver";
  }
  return "other";
}

function getPaymentMethodLabel(key: ClientPaymentMethodSummary["key"]) {
  switch (key) {
    case "pix":
      return "Pix";
    case "card":
      return "Cartão";
    case "cash":
      return "Dinheiro";
    case "package":
      return "Pacote";
    case "waiver":
      return "Isento";
    default:
      return "Outros";
  }
}

function getResolvedAppointmentTotal(
  appointment: ClientAppointmentHistoryRow,
  checkoutMap: Map<string, ClientCheckoutSummaryRow>
) {
  const checkout = checkoutMap.get(appointment.id);
  if (checkout) return Number(checkout.total ?? 0);
  const base = appointment.price_override ?? appointment.price ?? 0;
  return Number(base) + Number(appointment.displacement_fee ?? 0);
}

function getResolvedDiscountValue(checkout: ClientCheckoutSummaryRow | undefined) {
  if (!checkout || !checkout.discount_type || !checkout.discount_value) return 0;
  if (checkout.discount_type === "pct") {
    return Number(checkout.subtotal ?? 0) * (Number(checkout.discount_value) / 100);
  }
  return Number(checkout.discount_value);
}

function buildPaymentMethods(
  payments: ClientPaymentSummaryRow[],
  transactions: ClientTransactionSummaryRow[]
) {
  const totals = new Map<ClientPaymentMethodSummary["key"], number>();
  const paidPayments = payments.filter((payment) => payment.status === "paid");
  const paymentAppointmentIds = new Set(paidPayments.map((payment) => payment.appointment_id));

  for (const payment of paidPayments) {
    const key = normalizePaymentMethod(payment.method);
    totals.set(key, (totals.get(key) ?? 0) + Number(payment.amount ?? 0));
  }

  for (const transaction of transactions) {
    if (transaction.type !== "income") continue;
    if (!transaction.appointment_id || paymentAppointmentIds.has(transaction.appointment_id)) {
      continue;
    }
    const key = normalizePaymentMethod(transaction.payment_method);
    totals.set(key, (totals.get(key) ?? 0) + Number(transaction.amount ?? 0));
  }

  const totalAmount = Array.from(totals.values()).reduce((sum, current) => sum + current, 0);

  return (Array.from(totals.entries()) as Array<
    [ClientPaymentMethodSummary["key"], number]
  >)
    .sort((left, right) => right[1] - left[1])
    .map(([key, amount]) => ({
      key,
      label: getPaymentMethodLabel(key),
      amount,
      percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0,
    }));
}

function buildFidelityStars(
  completedSessionsCount: number,
  averageIntervalDays: number | null,
  daysSinceLastVisit: number | null
) {
  let stars = 1;
  if (completedSessionsCount >= 3) stars += 1;
  if (completedSessionsCount >= 6) stars += 1;
  if (averageIntervalDays !== null && averageIntervalDays <= 30) stars += 1;
  if (daysSinceLastVisit !== null && daysSinceLastVisit <= 21) stars += 1;
  return Math.max(1, Math.min(5, stars));
}

function buildEstimatedLtv12Months(
  totalSpentLifetime: number,
  averageTicket: number,
  averageIntervalDays: number | null,
  completedSessionsCount: number
) {
  if (averageTicket <= 0) return totalSpentLifetime;

  if (averageIntervalDays !== null && averageIntervalDays > 0) {
    const estimatedSessions = Math.max(1, Math.min(52, Math.round(365 / averageIntervalDays)));
    return Math.max(totalSpentLifetime, averageTicket * estimatedSessions);
  }

  if (completedSessionsCount > 0) {
    return Math.max(totalSpentLifetime, averageTicket * completedSessionsCount);
  }

  return totalSpentLifetime;
}

async function countClientReferrals(
  tenantId: string,
  clientId: string,
  clientName: string,
  internalReference: string | null
) {
  const supabase = createServiceClient();
  const safeName = sanitizeIlikeTerm(clientName);
  const safeReference = sanitizeIlikeTerm(internalReference);
  const clauses = [
    safeName.length >= 4 ? `como_conheceu.ilike.%${safeName}%` : null,
    safeReference.length >= 3 ? `como_conheceu.ilike.%${safeReference}%` : null,
  ].filter(Boolean) as string[];

  if (clauses.length === 0) return 0;

  const { count } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .neq("id", clientId)
    .or(clauses.join(","));

  return count ?? 0;
}

export async function listClientQuickChannels(
  tenantId: string,
  clients: Pick<ClientRow, "id" | "phone">[]
): Promise<Record<string, ClientQuickChannel>> {
  const supabase = createServiceClient();
  const clientIds = clients.map((client) => client.id);

  if (clientIds.length === 0) {
    return {};
  }

  const { data } = await supabase
    .from("client_phones")
    .select("client_id, number_raw, is_primary, is_whatsapp, created_at")
    .eq("tenant_id", tenantId)
    .in("client_id", clientIds)
    .order("is_primary", { ascending: false })
    .order("is_whatsapp", { ascending: false })
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as Array<
    Pick<ClientPhoneRow, "client_id" | "number_raw" | "is_primary" | "is_whatsapp" | "created_at">
  >;

  return clients.reduce<Record<string, ClientQuickChannel>>((acc, client) => {
    const clientRows = rows.filter((row) => row.client_id === client.id);
    const primaryPhone = clientRows.find((row) => row.is_primary)?.number_raw ?? clientRows[0]?.number_raw ?? client.phone ?? null;
    const whatsappPhone =
      clientRows.find((row) => row.is_whatsapp)?.number_raw ?? primaryPhone ?? client.phone ?? null;

    acc[client.id] = {
      primaryPhoneRaw: primaryPhone,
      whatsappPhoneRaw: whatsappPhone,
      phoneCount: clientRows.length || (client.phone ? 1 : 0),
    };
    return acc;
  }, {});
}

export async function getClientDetailSnapshot(
  tenantId: string,
  clientId: string
): Promise<ClientDetailSnapshot | null> {
  const supabase = createServiceClient();

  const [
    { data: client },
    { data: addresses },
    { data: phones },
    { data: emails },
    { data: healthItems },
    { data: historyData },
  ] = await Promise.all([
    getClientById(tenantId, clientId),
    listClientAddresses(tenantId, clientId),
    listClientPhones(tenantId, clientId),
    listClientEmails(tenantId, clientId),
    listClientHealthItems(tenantId, clientId),
    supabase
      .from("appointments")
      .select(
        "id, start_time, service_name, status, is_home_visit, price, price_override, payment_status, displacement_fee, attendance_code, internal_notes, finished_at"
      )
      .eq("tenant_id", tenantId)
      .eq("client_id", clientId)
      .order("start_time", { ascending: false }),
  ]);

  if (!client) return null;

  const history = (historyData ?? []) as ClientAppointmentHistoryRow[];
  const appointmentIds = history.map((appointment) => appointment.id);

  const [checkoutsResponse, paymentsResponse, evolutionsResponse, transactionsResponse, referralsCount] =
    appointmentIds.length > 0
      ? await Promise.all([
          supabase
            .from("appointment_checkout")
            .select(
              "appointment_id, subtotal, total, discount_type, discount_value, discount_reason, confirmed_at"
            )
            .eq("tenant_id", tenantId)
            .in("appointment_id", appointmentIds),
          supabase
            .from("appointment_payments")
            .select("id, appointment_id, amount, method, status, paid_at, created_at, card_mode")
            .eq("tenant_id", tenantId)
            .in("appointment_id", appointmentIds),
          supabase
            .from("appointment_evolution_entries")
            .select("id, appointment_id, evolution_text, created_at, created_by")
            .eq("tenant_id", tenantId)
            .in("appointment_id", appointmentIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("transactions")
            .select("id, appointment_id, amount, payment_method, type, created_at, description")
            .eq("tenant_id", tenantId)
            .in("appointment_id", appointmentIds),
          countClientReferrals(tenantId, client.id, client.name, client.internal_reference),
        ])
      : [
          { data: [] as ClientCheckoutSummaryRow[] | null },
          { data: [] as ClientPaymentSummaryRow[] | null },
          { data: [] as AppointmentEvolutionRow[] | null },
          { data: [] as ClientTransactionSummaryRow[] | null },
          0,
        ];

  const checkouts = (checkoutsResponse.data ?? []) as ClientCheckoutSummaryRow[];
  const payments = (paymentsResponse.data ?? []) as ClientPaymentSummaryRow[];
  const evolutions = (evolutionsResponse.data ?? []) as AppointmentEvolutionRow[];
  const transactions = (transactionsResponse.data ?? []) as ClientTransactionSummaryRow[];

  const checkoutMap = new Map(checkouts.map((checkout) => [checkout.appointment_id, checkout]));
  const evolutionMap = new Map<string, AppointmentEvolutionRow>();
  for (const evolution of evolutions) {
    if (!evolutionMap.has(evolution.appointment_id)) {
      evolutionMap.set(evolution.appointment_id, evolution);
    }
  }

  const completedAppointments = history.filter(
    (appointment) => appointment.status === "completed"
  );
  const completedSortedAsc = [...completedAppointments].sort((left, right) =>
    left.start_time.localeCompare(right.start_time)
  );
  const intervals: number[] = [];
  for (let index = 1; index < completedSortedAsc.length; index += 1) {
    const previous = completedSortedAsc[index - 1];
    const current = completedSortedAsc[index];
    if (!previous || !current) continue;
    intervals.push(
      differenceInCalendarDays(new Date(current.start_time), new Date(previous.start_time))
    );
  }

  const averageIntervalDays =
    intervals.length > 0
      ? Math.max(1, Math.round(intervals.reduce((sum, current) => sum + current, 0) / intervals.length))
      : null;

  const lastCompletedAppointment = completedAppointments[0] ?? null;
  const daysSinceLastVisit = lastCompletedAppointment
    ? Math.max(0, differenceInCalendarDays(new Date(), new Date(lastCompletedAppointment.start_time)))
    : null;

  const totalSpentFromPayments = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

  const paymentAppointmentsWithPaidEntries = new Set(
    payments.filter((payment) => payment.status === "paid").map((payment) => payment.appointment_id)
  );
  const fallbackTransactionSpent = transactions
    .filter(
      (transaction) =>
        transaction.type === "income" &&
        transaction.appointment_id &&
        !paymentAppointmentsWithPaidEntries.has(transaction.appointment_id)
    )
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);

  const totalSpentLifetime = totalSpentFromPayments + fallbackTransactionSpent;
  const discountsGranted = checkouts.reduce(
    (sum, checkout) => sum + getResolvedDiscountValue(checkout),
    0
  );

  const sessionTotals = completedAppointments.map((appointment) =>
    getResolvedAppointmentTotal(appointment, checkoutMap)
  );
  const averageTicket =
    sessionTotals.length > 0
      ? sessionTotals.reduce((sum, current) => sum + current, 0) / sessionTotals.length
      : 0;

  const paymentMethods = buildPaymentMethods(payments, transactions);
  const packagesAcquired = paymentMethods.find((item) => item.key === "package")?.amount
    ? payments.filter(
        (payment) =>
          payment.status === "paid" && normalizePaymentMethod(payment.method) === "package"
      ).length
    : 0;
  const fidelityStars = buildFidelityStars(
    completedAppointments.length,
    averageIntervalDays,
    daysSinceLastVisit
  );
  const estimatedLtv12Months = buildEstimatedLtv12Months(
    totalSpentLifetime,
    averageTicket,
    averageIntervalDays,
    completedAppointments.length
  );

  const prontuarioEntries = history
    .filter((appointment) => new Date(appointment.start_time).getTime() <= Date.now())
    .map((appointment) => {
      const evolution = evolutionMap.get(appointment.id) ?? null;
      return {
        appointmentId: appointment.id,
        attendanceCode: appointment.attendance_code,
        startTime: appointment.start_time,
        serviceName: appointment.service_name,
        status: appointment.status,
        isHomeVisit: appointment.is_home_visit,
        internalNotes: appointment.internal_notes,
        evolutionText: evolution?.evolution_text ?? null,
        evolutionCreatedAt: evolution?.created_at ?? null,
      } satisfies ClientProntuarioEntry;
    });

  return {
    client,
    addresses: addresses ?? [],
    phones:
      phones && phones.length > 0
        ? phones
        : client.phone
        ? [
            {
              id: "legacy-phone",
              client_id: client.id,
              tenant_id: client.tenant_id,
              label: "Principal",
              number_raw: client.phone,
              number_e164: null,
              is_primary: true,
              is_whatsapp: true,
              created_at: client.created_at ?? new Date().toISOString(),
              updated_at: client.created_at ?? new Date().toISOString(),
            } as ClientPhoneRow,
          ]
        : [],
    emails:
      emails && emails.length > 0
        ? emails
        : client.email
        ? [
            {
              id: "legacy-email",
              client_id: client.id,
              tenant_id: client.tenant_id,
              label: "Principal",
              email: client.email,
              is_primary: true,
              created_at: client.created_at ?? new Date().toISOString(),
              updated_at: client.created_at ?? new Date().toISOString(),
            } as ClientEmailRow,
          ]
        : [],
    healthItems: healthItems ?? [],
    history,
    finance: {
      totalSpentLifetime,
      averageTicket,
      packagesAcquired,
      discountsGranted,
      estimatedLtv12Months,
      averageIntervalDays,
      daysSinceLastVisit,
      fidelityStars,
      referralsCount,
      paymentMethods,
      completedSessionsCount: completedAppointments.length,
    },
    prontuarioEntries,
    anamnesis: {
      clinicalHistory: client.clinical_history,
      contraindications: client.contraindications,
      preferencesNotes: client.preferences_notes,
      observations: client.observacoes_gerais,
      legacyNotes: client.notes,
      anamneseUrl: client.anamnese_url,
      healthTags: Array.isArray(client.health_tags) ? client.health_tags : [],
      healthItems: healthItems ?? [],
    },
  };
}
