import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock3, TimerReset, XCircle } from "lucide-react";
import { createServiceClient } from "../../../lib/supabase/service";
import { getDashboardAccessForCurrentUser } from "../../../src/modules/auth/dashboard-access";
import { getWhatsAppAutomationRuntimeConfig } from "../../../src/modules/notifications/whatsapp-automation";
import { getTenantWhatsAppDispatchPolicyStatus } from "../../../src/modules/notifications/whatsapp-environment-channel";
import {
  listNotificationTemplateCatalog,
  syncNotificationTemplateCatalogFromLibrary,
  type NotificationTemplateCatalogRow,
} from "../../../src/modules/notifications/whatsapp-template-catalog";
import { BRAZIL_TIME_ZONE } from "../../../src/shared/timezone";

export type JobRow = {
  id: string;
  appointment_id: string | null;
  type: string;
  channel: string;
  status: "pending" | "sent" | "failed";
  payload: Record<string, unknown> | null;
  scheduled_for: string;
  created_at: string;
  updated_at: string;
};

export type AppointmentMini = {
  id: string;
  service_name: string | null;
  start_time: string;
  clients: { name: string | null } | Array<{ name: string | null }> | null;
};

export type JourneyStep = {
  key: string;
  label: string;
  at: string;
  note?: string | null;
};

export type AutomationState = {
  profile: string;
  runtimeEnvironment: string;
  senderPhoneNumberId: string | null;
  senderDisplayPhone: string | null;
  recipientMode: string;
  forcedRecipient: string | null;
  templatesTotal: number;
  templatesActive: number;
  templatesInReview: number;
  templatesOther: number;
  latestOperationalError: string | null;
  latestOperationalErrorAt: string | null;
  failSafeIssues: string[];
  templates: NotificationTemplateCatalogRow[];
};

const asObj = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const extractAutomationError = (payload: unknown) => {
  const automation = asObj(asObj(payload).automation);
  const providerError =
    typeof automation.provider_delivery_error === "string" ? automation.provider_delivery_error.trim() : "";
  if (providerError) return providerError;
  const fallbackError = typeof automation.error === "string" ? automation.error.trim() : "";
  return fallbackError || null;
};

export const getAutomation = (payload: Record<string, unknown> | null) => asObj(asObj(payload).automation);

export const getClientName = (appointment: AppointmentMini | null) => {
  const clients = appointment?.clients ?? null;
  if (Array.isArray(clients)) return clients[0]?.name?.trim() || "Cliente";
  return clients?.name?.trim() || "Cliente";
};

export const formatRelative = (iso: string | null | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNowStrict(date, { addSuffix: true, locale: ptBR });
};

export const formatDateTimeBr = (iso: string | null | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
};

const parseProviderTimestampToIso = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return new Date(Number(trimmed) * 1000).toISOString();
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
};

export const mapJobTypeLabel = (type: string) => {
  switch (type) {
    case "appointment_created":
      return "Aviso de agendamento";
    case "appointment_reminder":
      return "Lembrete 24h";
    case "appointment_canceled":
      return "Cancelamento";
    default:
      return type;
  }
};

const mapProviderStatusLabel = (status: string) => {
  switch (status.toLowerCase()) {
    case "sent":
      return "Enviada pela Meta";
    case "delivered":
      return "Entregue ao cliente";
    case "read":
      return "Lida pelo cliente";
    case "failed":
      return "Falha na entrega";
    default:
      return `Status da Meta: ${status}`;
  }
};

export const mapFailureReasonForUser = (rawMessage: string | null | undefined) => {
  const message = (rawMessage ?? "").trim();
  if (!message) {
    return {
      userMessage: "Falha no envio automático.",
      technicalMessage: null as string | null,
    };
  }

  const normalized = message.toLowerCase();
  if (
    normalized.includes("error validating access token") ||
    normalized.includes("session has expired") ||
    normalized.includes("invalid oauth access token")
  ) {
    return {
      userMessage: "Token da Meta expirou. Gere um novo token e atualize a configuração.",
      technicalMessage: message,
    };
  }

  if (
    normalized.includes("phone_number_id") ||
    normalized.includes("não configurado") ||
    normalized.includes("not configured")
  ) {
    return {
      userMessage: "Configuração da automação WhatsApp está incompleta.",
      technicalMessage: message,
    };
  }

  if (normalized.includes("template")) {
    return {
      userMessage: "Modelo de mensagem da Meta não foi aceito para envio. Verifique nome, idioma e aprovação.",
      technicalMessage: message,
    };
  }

  if (normalized.includes("recipient") || normalized.includes("to parameter")) {
    return {
      userMessage: "Número de destino inválido ou não autorizado para teste na Meta.",
      technicalMessage: message,
    };
  }

  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return {
      userMessage: "A Meta limitou temporariamente os envios. Tente novamente em alguns minutos.",
      technicalMessage: message,
    };
  }

  if (
    normalized.includes("fetch failed") ||
    normalized.includes("timeout") ||
    normalized.includes("network") ||
    normalized.includes("econnreset")
  ) {
    return {
      userMessage: "Falha temporária de conexão no envio automático.",
      technicalMessage: message,
    };
  }

  if (normalized.includes("tenant não autorizado") || normalized.includes("tenant not allowed")) {
    return {
      userMessage: "Este ambiente/cliente ainda não está liberado para automação.",
      technicalMessage: message,
    };
  }
  if (
    normalized.includes("janela de conversa de 24h") ||
    normalized.includes("customer service window")
  ) {
    return {
      userMessage: "Janela de conversa de 24h não está aberta para este agendamento.",
      technicalMessage: message,
    };
  }

  return {
    userMessage: "Falha no envio automático. Verifique o detalhe técnico para diagnóstico.",
    technicalMessage: message,
  };
};

export const inferTemplateName = (job: JobRow, automation: Record<string, unknown>) => {
  const explicit = typeof automation.template_name === "string" ? automation.template_name.trim() : "";
  if (explicit) return explicit;
  if (job.type === "appointment_created") {
    return "Template de aviso (settings do tenant)";
  }
  if (job.type === "appointment_reminder") {
    return "Template de lembrete (settings do tenant)";
  }
  if (job.type === "appointment_canceled") {
    return "Mensagem livre (janela 24h)";
  }
  return "Modelo não informado";
};

export const buildJourneySteps = (job: JobRow) => {
  const automation = getAutomation(job.payload);
  const steps: JourneyStep[] = [];

  steps.push({
    key: "job_created",
    label: "Job criado",
    at: job.created_at,
    note: `Status inicial: ${job.status}`,
  });

  const queuedAt = typeof automation.queued_at === "string" ? automation.queued_at : null;
  if (queuedAt) {
    steps.push({ key: "queued", label: "Entrou na fila da automação", at: queuedAt });
  }

  if (job.scheduled_for) {
    steps.push({ key: "scheduled", label: "Agendado para processamento", at: job.scheduled_for });
  }

  const customerWindowCheckedAt =
    typeof automation.customer_service_window_checked_at === "string"
      ? automation.customer_service_window_checked_at
      : null;
  if (customerWindowCheckedAt) {
    const result =
      typeof automation.customer_service_window_result === "string"
        ? automation.customer_service_window_result
        : null;
    steps.push({
      key: "customer_window_checked",
      label: "Janela de 24h verificada",
      at: customerWindowCheckedAt,
      note:
        result === "open"
          ? "Janela aberta"
          : result === "expired"
            ? "Janela expirada"
            : result === "no_inbound"
              ? "Cliente ainda não respondeu"
              : null,
    });
  }

  const retryScheduledAt =
    typeof automation.retry_scheduled_at === "string" ? automation.retry_scheduled_at : null;
  if (retryScheduledAt) {
    const retryNextAt = typeof automation.retry_next_at === "string" ? automation.retry_next_at : null;
    steps.push({
      key: "retry_scheduled",
      label: "Reenvio programado",
      at: retryScheduledAt,
      note: retryNextAt ? `Próxima tentativa em ${formatDateTimeBr(retryNextAt) ?? retryNextAt}` : null,
    });
  }

  const providerAcceptedAt =
    typeof automation.provider_accepted_at === "string" ? automation.provider_accepted_at : null;
  if (providerAcceptedAt) {
    steps.push({
      key: "provider_accepted",
      label: "Meta aceitou o envio",
      at: providerAcceptedAt,
      note: typeof automation.provider_message_id === "string" ? `ID Meta: ${automation.provider_message_id}` : null,
    });
  }

  const providerEvents = Array.isArray(automation.meta_status_events)
    ? (automation.meta_status_events as unknown[])
    : [];
  providerEvents.forEach((event, index) => {
    if (!event || typeof event !== "object") return;
    const e = event as Record<string, unknown>;
    const providerStatus = typeof e.provider_status === "string" ? e.provider_status : "unknown";
    const at =
      (typeof e.at === "string" && e.at) || parseProviderTimestampToIso(e.provider_timestamp) || null;
    if (!at) return;
    const errors = Array.isArray(e.errors) ? e.errors : null;
    const errorNote =
      providerStatus.toLowerCase() === "failed" && errors && errors.length > 0
        ? `Falha reportada pela Meta`
        : null;
    steps.push({
      key: `provider_event_${index}`,
      label: mapProviderStatusLabel(providerStatus),
      at,
      note: errorNote,
    });
  });

  const providerDeliveryUpdatedAt =
    typeof automation.provider_delivery_updated_at === "string" ? automation.provider_delivery_updated_at : null;
  if (providerDeliveryUpdatedAt && !steps.some((step) => step.at === providerDeliveryUpdatedAt)) {
    steps.push({
      key: "provider_status_update",
      label: "Status do provedor atualizado",
      at: providerDeliveryUpdatedAt,
      note:
        typeof automation.provider_delivery_status === "string"
          ? mapProviderStatusLabel(automation.provider_delivery_status)
          : null,
    });
  }

  const failedAt = typeof automation.failed_at === "string" ? automation.failed_at : null;
  if (failedAt) {
    const failMap = mapFailureReasonForUser(
      (typeof automation.provider_delivery_error === "string" && automation.provider_delivery_error) ||
        (typeof automation.error === "string" && automation.error) ||
        null
    );
    steps.push({
      key: "failed",
      label: "Falha registrada",
      at: failedAt,
      note: failMap.userMessage,
    });
  }

  const skippedReasonLabel =
    typeof automation.skipped_reason_label === "string" ? automation.skipped_reason_label : null;
  if (skippedReasonLabel) {
    const skippedAt =
      (typeof automation.customer_service_window_checked_at === "string" &&
        automation.customer_service_window_checked_at) ||
      job.updated_at ||
      job.created_at;
    steps.push({
      key: "skipped_auto",
      label: "Envio ignorado",
      at: skippedAt,
      note: skippedReasonLabel,
    });
  }

  return steps
    .filter((step, index, arr) => arr.findIndex((s) => s.key === step.key) === index)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
};

export const getUiStatus = (job: JobRow) => {
  const automation = getAutomation(job.payload);
  const providerStatus =
    typeof automation.provider_delivery_status === "string" ? automation.provider_delivery_status : null;
  const retryNextAt = typeof automation.retry_next_at === "string" ? automation.retry_next_at : null;
  const errorMessage =
    (typeof automation.provider_delivery_error === "string" && automation.provider_delivery_error) ||
    (typeof automation.error === "string" ? automation.error : null);
  const deliveryMode = typeof automation.delivery_mode === "string" ? automation.delivery_mode : null;

  if (job.status === "pending") {
    if (retryNextAt) {
      return {
        tone: "warn" as const,
        icon: TimerReset,
        label: "Reenvio agendado",
        detail: formatRelative(retryNextAt) ?? "Aguardando retry",
      };
    }
    return {
      tone: "queue" as const,
      icon: Clock3,
      label: "Em fila",
      detail: formatRelative(job.scheduled_for) ?? "Aguardando horário",
    };
  }

  if (job.status === "failed") {
    const failMap = mapFailureReasonForUser(errorMessage);
    return {
      tone: "error" as const,
      icon: XCircle,
      label: "Falhou",
      detail: failMap.userMessage,
      technicalDetail: failMap.technicalMessage,
    };
  }

  switch ((providerStatus ?? "").toLowerCase()) {
    case "read":
      return { tone: "ok" as const, icon: CheckCircle2, label: "Lida", detail: "Cliente abriu a mensagem" };
    case "delivered":
      return { tone: "ok" as const, icon: CheckCircle2, label: "Entregue", detail: "Entregue ao cliente" };
    case "sent":
      return { tone: "sent" as const, icon: CheckCircle2, label: "Enviada", detail: "Aguardando confirmação de entrega" };
    case "failed":
      return {
        tone: "error" as const,
        icon: XCircle,
        label: "Falha na entrega",
        detail: mapFailureReasonForUser(errorMessage).userMessage,
        technicalDetail: mapFailureReasonForUser(errorMessage).technicalMessage,
      };
    default:
      return {
        tone: deliveryMode === "dry_run" ? ("warn" as const) : ("sent" as const),
        icon: CheckCircle2,
        label: deliveryMode === "dry_run" ? "Simulada" : "Enviada",
        detail: deliveryMode === "dry_run" ? "Teste local" : "Sem retorno de status ainda",
        technicalDetail: null,
      };
  }
};

export const toneClasses = {
  queue: "bg-amber-50 text-amber-700 border-amber-200",
  sent: "bg-sky-50 text-sky-700 border-sky-200",
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-orange-50 text-orange-700 border-orange-200",
  error: "bg-red-50 text-red-700 border-red-200",
} as const;

async function loadAutomationState(tenantId: string): Promise<AutomationState> {
  const runtime = getWhatsAppAutomationRuntimeConfig();
  const supabase = createServiceClient();

  try {
    await syncNotificationTemplateCatalogFromLibrary(tenantId);
  } catch (error) {
    console.warn("[mensagens] Falha ao sincronizar catálogo local de templates:", error);
  }

  const [policyStatus, templateCatalog, latestFailedJob] = await Promise.all([
    getTenantWhatsAppDispatchPolicyStatus(tenantId).catch((error) => ({
      policy: null,
      issues: [error instanceof Error ? error.message : "Falha ao carregar política de envio."],
    })),
    listNotificationTemplateCatalog(tenantId).catch(() => [] as NotificationTemplateCatalogRow[]),
    supabase
      .from("notification_jobs")
      .select("payload, updated_at")
      .eq("tenant_id", tenantId)
      .eq("channel", "whatsapp")
      .eq("status", "failed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const templatesActive = templateCatalog.filter(
    (template) => (template.status ?? "").toLowerCase() === "active"
  ).length;
  const templatesInReview = templateCatalog.filter((template) =>
    ["in_review", "pending", "paused"].includes((template.status ?? "").toLowerCase())
  ).length;
  const templatesOther = Math.max(templateCatalog.length - templatesActive - templatesInReview, 0);
  const latestOperationalError = extractAutomationError(latestFailedJob.data?.payload ?? null);

  return {
    profile: runtime.profile,
    runtimeEnvironment: runtime.runtimeEnvironment,
    senderPhoneNumberId: policyStatus.policy?.senderPhoneNumberId ?? null,
    senderDisplayPhone: policyStatus.policy?.senderDisplayPhone ?? null,
    recipientMode: policyStatus.policy?.recipientMode ?? runtime.recipientMode,
    forcedRecipient:
      policyStatus.policy?.recipientMode === "test_recipient"
        ? policyStatus.policy.testRecipient
        : null,
    templatesTotal: templateCatalog.length,
    templatesActive,
    templatesInReview,
    templatesOther,
    latestOperationalError,
    latestOperationalErrorAt: latestFailedJob.data?.updated_at ?? null,
    failSafeIssues: policyStatus.issues,
    templates: templateCatalog,
  };
}

export async function loadMessagesData() {
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    return {
      jobs: [] as JobRow[],
      appointmentsById: new Map<string, AppointmentMini>(),
      automationState: null as AutomationState | null,
    };
  }

  const supabase = createServiceClient();
  const tenantId = access.data.tenantId;

  const { data: jobsData } = await supabase
    .from("notification_jobs")
    .select("id, appointment_id, type, channel, status, payload, scheduled_for, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .eq("channel", "whatsapp")
    .order("created_at", { ascending: false })
    .limit(80);

  const jobs = ((jobsData ?? []) as unknown as JobRow[]).filter(Boolean);

  const appointmentIds = Array.from(
    new Set(jobs.map((job) => job.appointment_id).filter((id): id is string => Boolean(id)))
  );

  const appointmentsById = new Map<string, AppointmentMini>();
  if (appointmentIds.length > 0) {
    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select("id, service_name, start_time, clients(name)")
      .in("id", appointmentIds);

    for (const row of (appointmentsData ?? []) as unknown as AppointmentMini[]) {
      appointmentsById.set(row.id, row);
    }
  }

  const automationState = await loadAutomationState(tenantId);

  return { jobs, appointmentsById, automationState };
}
