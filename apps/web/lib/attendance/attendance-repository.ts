import { createServiceClient } from "../supabase/service";
import type { Database, Json } from "../supabase/types";
import type {
  AttendanceOverview,
  AttendanceRow,
  ChecklistItem,
  EvolutionEntry,
  ClientHistoryEntry,
  CheckoutRow,
  CheckoutItem,
  PaymentRow,
  PostRow,
  AppointmentDetails,
  AppointmentMessage,
  AppointmentEvent,
} from "./attendance-types";

type CheckoutItemInsert = Database["public"]["Tables"]["appointment_checkout_items"]["Insert"];

const DEFAULT_CHECKLIST = [
  "Separar materiais e itens de higiene",
  "Confirmar endereço/portaria",
  "Rever restrições (anamnese)",
];

function normalizeClient<T extends { clients: unknown }>(appointment: T) {
  const clients = appointment.clients;
  if (Array.isArray(clients)) {
    return { ...appointment, clients: clients[0] ?? null } as T;
  }
  return appointment;
}

function coerceNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function normalizeChecklistTemplate(value: Json | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

const BRAZIL_TIMEZONE = "America/Sao_Paulo";

function getBrazilDayKey(dateTime: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateTime));
}

export async function getAttendanceOverview(tenantId: string, appointmentId: string): Promise<AttendanceOverview | null> {
  const supabase = createServiceClient();

  const { data: appointmentData, error: appointmentError } = await supabase
    .from("appointments")
    .select(
      `id, attendance_code, service_name, start_time, finished_at, status, payment_status, signal_status, signal_required_amount, signal_paid_amount, price, displacement_fee, displacement_distance_km, is_home_visit, total_duration_minutes, actual_duration_minutes, internal_notes,
       address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado,
        clients ( id, name, initials, avatar_url, is_vip, phone, health_tags, endereco_completo, address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado ),
       services ( duration_minutes, price )`
    )
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .single();

  if (appointmentError || !appointmentData) return null;

  const appointment = normalizeClient(appointmentData) as unknown as AppointmentDetails & {
    services?: { duration_minutes: number | null; price: number | null } | null | Array<{
      duration_minutes: number | null;
      price: number | null;
    }>;
  };
  const serviceRecord = Array.isArray(appointment.services) ? appointment.services[0] ?? null : appointment.services ?? null;
  appointment.service_duration_minutes = serviceRecord?.duration_minutes ?? null;

  const plannedMinutes =
    serviceRecord?.duration_minutes ?? appointment.total_duration_minutes ?? 30;
  const plannedSeconds = plannedMinutes ? Math.max(1, plannedMinutes) * 60 : 1800;
  const actualSeconds = appointment.actual_duration_minutes
    ? Math.max(0, appointment.actual_duration_minutes) * 60
    : 0;

  const { data: attendanceData } = await supabase
    .from("appointment_attendances")
    .select("*")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  let attendance: AttendanceRow;
  if (attendanceData) {
    attendance = attendanceData as AttendanceRow;
  } else {
    const timerStatus =
      appointment.status === "completed" ? "finished" : appointment.status === "in_progress" ? "running" : "idle";
    const { data: inserted } = await supabase
      .from("appointment_attendances")
      .insert({
        appointment_id: appointmentId,
        tenant_id: tenantId,
        confirmed_at: appointment.status === "confirmed" ? new Date().toISOString() : null,
        timer_status: timerStatus,
        timer_started_at: appointment.status === "in_progress" ? appointment.start_time : null,
        timer_paused_at: null,
        paused_total_seconds: 0,
        planned_seconds: plannedSeconds,
        actual_seconds: actualSeconds,
      })
      .select("*")
      .single();

    attendance = inserted as AttendanceRow;
  }

  const { data: settingsData } = await supabase
    .from("settings")
    .select("attendance_checklist_enabled, attendance_checklist_items")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  const checklistEnabled = settingsData?.attendance_checklist_enabled ?? true;
  const checklistTemplate = normalizeChecklistTemplate(settingsData?.attendance_checklist_items);

  let checklist: ChecklistItem[] = [];
  if (checklistEnabled) {
    const { data: checklistData } = await supabase
      .from("appointment_checklist_items")
      .select("*")
      .eq("appointment_id", appointmentId)
      .order("sort_order", { ascending: true });

    checklist = (checklistData ?? []) as ChecklistItem[];
    if (checklist.length === 0) {
      const seedItems = checklistTemplate.length > 0 ? checklistTemplate : DEFAULT_CHECKLIST;
      const inserts = seedItems.map((label, index) => ({
        appointment_id: appointmentId,
        tenant_id: tenantId,
        label,
        sort_order: index + 1,
        source: checklistTemplate.length > 0 ? "tenant_setting" : "default",
      }));
      const { data: inserted } = await supabase
        .from("appointment_checklist_items")
        .insert(inserts)
        .select("*");
      checklist = (inserted ?? []) as ChecklistItem[];
    }
  }

  const { data: evolutionData } = await supabase
    .from("appointment_evolution_entries")
    .select("id, appointment_id, tenant_id, evolution_text, created_by, created_at")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: false })
    .limit(1);

  const evolution = (evolutionData ?? []) as EvolutionEntry[];

  let clientHistory: ClientHistoryEntry[] = [];
  const clientId = appointment.clients?.id ?? null;
  if (clientId) {
    const { data: historyAppointmentsData } = await supabase
      .from("appointments")
      .select("id, start_time, service_name, is_home_visit, status, payment_status")
      .eq("tenant_id", tenantId)
      .eq("client_id", clientId)
      .order("start_time", { ascending: false })
      .limit(20);

    const historyAppointments = (historyAppointmentsData ?? []).filter((item) => item.id !== appointmentId);
    const historyAppointmentIds = historyAppointments.map((item) => item.id);

    const evolutionByAppointment = new Map<string, { evolution_text: string | null }>();

    if (historyAppointmentIds.length > 0) {
      const { data: historyEvolutionData } = await supabase
        .from("appointment_evolution_entries")
        .select("appointment_id, evolution_text, created_at")
        .in("appointment_id", historyAppointmentIds)
        .order("created_at", { ascending: false });

      for (const item of historyEvolutionData ?? []) {
        const existing = evolutionByAppointment.get(item.appointment_id);
        if (!existing) {
          evolutionByAppointment.set(item.appointment_id, {
            evolution_text: item.evolution_text ?? null,
          });
        }
      }
    }

    const currentAppointmentDayKey = getBrazilDayKey(appointment.start_time);
    const currentAppointmentTime = new Date(appointment.start_time).getTime();

    clientHistory = historyAppointments.map((item) => {
      const entry = evolutionByAppointment.get(item.id);
      const itemDayKey = getBrazilDayKey(item.start_time);
      const itemTime = new Date(item.start_time).getTime();
      const timeline: "past" | "future" =
        itemDayKey < currentAppointmentDayKey
          ? "past"
          : itemDayKey > currentAppointmentDayKey
            ? "future"
            : itemTime < currentAppointmentTime
              ? "past"
              : "future";

      return {
        appointment_id: item.id,
        start_time: item.start_time,
        service_name: item.service_name,
        is_home_visit: item.is_home_visit ?? null,
        appointment_status: item.status ?? null,
        appointment_payment_status: item.payment_status ?? null,
        timeline,
        evolution_text: entry?.evolution_text ?? null,
      };
    });
  }

  const { data: checkoutData } = await supabase
    .from("appointment_checkout")
    .select("*")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  let checkout = checkoutData as CheckoutRow | null;
  if (!checkout) {
    const displacementFee = appointment.is_home_visit
      ? coerceNumber(appointment.displacement_fee, 0)
      : 0;
    const totalFromAppointment = coerceNumber(appointment.price, 0);
    const servicePriceFromAppointment = Math.max(totalFromAppointment - displacementFee, 0);
    const servicePrice = totalFromAppointment > 0
      ? servicePriceFromAppointment
      : coerceNumber(serviceRecord?.price, 0);
    const subtotal = Math.max(0, servicePrice + displacementFee);
    const { data: insertedCheckout } = await supabase
      .from("appointment_checkout")
      .insert({
        appointment_id: appointmentId,
        tenant_id: tenantId,
        subtotal,
        total: subtotal,
      })
      .select("*")
      .single();
    checkout = insertedCheckout as CheckoutRow | null;
  }

  const { data: checkoutItemsData } = await supabase
    .from("appointment_checkout_items")
    .select("*")
    .eq("appointment_id", appointmentId)
    .order("sort_order", { ascending: true });

  let checkoutItems = (checkoutItemsData ?? []) as CheckoutItem[];
  if (checkoutItems.length === 0) {
    const serviceLabel = appointment.service_name;
    const displacementFee = appointment.is_home_visit
      ? coerceNumber(appointment.displacement_fee, 0)
      : 0;
    const totalFromAppointment = coerceNumber(appointment.price, 0);
    const servicePriceFromAppointment = Math.max(totalFromAppointment - displacementFee, 0);
    const servicePrice = totalFromAppointment > 0
      ? servicePriceFromAppointment
      : coerceNumber(serviceRecord?.price, 0);
    const items: CheckoutItemInsert[] = [
      {
        appointment_id: appointmentId,
        tenant_id: tenantId,
        type: "service",
        label: serviceLabel,
        qty: 1,
        amount: servicePrice,
        sort_order: 1,
        metadata: null,
      },
    ];

    if (appointment.is_home_visit) {
      if (displacementFee > 0) {
        items.push({
          appointment_id: appointmentId,
          tenant_id: tenantId,
          type: "fee",
          label: "Taxa deslocamento",
          qty: 1,
          amount: displacementFee,
          sort_order: 2,
          metadata: null,
        });
      }
    }

    const { data: insertedItems } = await supabase
      .from("appointment_checkout_items")
      .insert(items)
      .select("*");

    checkoutItems = (insertedItems ?? []) as CheckoutItem[];
  }

  const { data: paymentsData } = await supabase
    .from("appointment_payments")
    .select("*")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: true });

  const payments = (paymentsData ?? []) as PaymentRow[];

  const { data: postData } = await supabase
    .from("appointment_post")
    .select("*")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  let post = postData as PostRow | null;
  if (!post) {
    const { data: insertedPost } = await supabase
      .from("appointment_post")
      .insert({
        appointment_id: appointmentId,
        tenant_id: tenantId,
        kpi_total_seconds: 0,
        survey_status: "not_sent",
      })
      .select("*")
      .single();
    post = insertedPost as PostRow | null;
  }

  const { data: messageData } = await supabase
    .from("appointment_messages")
    .select("*")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: false });

  const messages = (messageData ?? []) as AppointmentMessage[];

  const { data: eventsData } = await supabase
    .from("appointment_events")
    .select("*")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: false });

  const events = (eventsData ?? []) as AppointmentEvent[];

  return {
    appointment,
    attendance,
    checklist,
    evolution,
    clientHistory,
    checkout,
    checkoutItems,
    payments,
    post,
    messages,
    events,
  };
}

export async function insertAttendanceEvent(params: {
  tenantId: string;
  appointmentId: string;
  eventType: string;
  payload?: Record<string, unknown> | null;
  createdBy?: string | null;
}) {
  const supabase = createServiceClient();
  return supabase.from("appointment_events").insert({
    tenant_id: params.tenantId,
    appointment_id: params.appointmentId,
    event_type: params.eventType,
    payload: (params.payload ?? {}) as Json,
    created_by: params.createdBy ?? null,
  });
}
