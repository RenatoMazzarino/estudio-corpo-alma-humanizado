import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock3, MessageCircle, TimerReset, XCircle } from "lucide-react";
import { createServiceClient } from "../../../lib/supabase/service";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { ModuleHeader } from "../../../components/ui/module-header";
import { ModulePage } from "../../../components/ui/module-page";
import { getDashboardAccessForCurrentUser } from "../../../src/modules/auth/dashboard-access";
import { BRAZIL_TIME_ZONE } from "../../../src/shared/timezone";
import {
  WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME,
  WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME,
} from "../../../src/modules/notifications/automation-config";

export const dynamic = "force-dynamic";

type JobRow = {
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

type AppointmentMini = {
  id: string;
  service_name: string | null;
  start_time: string;
  clients: { name: string | null } | Array<{ name: string | null }> | null;
};

const asObj = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const getAutomation = (payload: Record<string, unknown> | null) => asObj(asObj(payload).automation);

const getClientName = (appointment: AppointmentMini | null) => {
  const clients = appointment?.clients ?? null;
  if (Array.isArray(clients)) return clients[0]?.name?.trim() || "Cliente";
  return clients?.name?.trim() || "Cliente";
};

const formatRelative = (iso: string | null | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNowStrict(date, { addSuffix: true, locale: ptBR });
};

const formatDateTimeBr = (iso: string | null | undefined) => {
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

const mapJobTypeLabel = (type: string) => {
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

const mapFailureReasonForUser = (rawMessage: string | null | undefined) => {
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

const inferTemplateName = (job: JobRow, automation: Record<string, unknown>) => {
  const explicit = typeof automation.template_name === "string" ? automation.template_name.trim() : "";
  if (explicit) return explicit;
  if (job.type === "appointment_created") {
    return WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME || "Modelo não informado";
  }
  if (job.type === "appointment_reminder") {
    return WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME || "Modelo não informado";
  }
  if (job.type === "appointment_canceled") {
    return "Mensagem livre (janela 24h)";
  }
  return "Modelo não informado";
};

type JourneyStep = {
  key: string;
  label: string;
  at: string;
  note?: string | null;
};

const buildJourneySteps = (job: JobRow) => {
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

const getUiStatus = (job: JobRow) => {
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

const toneClasses = {
  queue: "bg-amber-50 text-amber-700 border-amber-200",
  sent: "bg-sky-50 text-sky-700 border-sky-200",
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-orange-50 text-orange-700 border-orange-200",
  error: "bg-red-50 text-red-700 border-red-200",
} as const;

async function loadMessagesData() {
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    return { jobs: [] as JobRow[], appointmentsById: new Map<string, AppointmentMini>() };
  }

  const supabase = createServiceClient();
  const tenantId = access.data.tenantId || FIXED_TENANT_ID;

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

  return { jobs, appointmentsById };
}

export default async function MensagensPage() {
  const { jobs, appointmentsById } = await loadMessagesData();
  const queued = jobs.filter((job) => job.status === "pending");
  const deliveredOrSent = jobs.filter((job) => job.status !== "pending");

  return (
    <ModulePage
      header={
        <ModuleHeader
          title="Mensagens"
          subtitle="Fila e status da automação WhatsApp (teste/DEV)."
          bottomSlot={
            <div className="flex items-center gap-2 text-[10px] text-muted">
              <span>{queued.length} em fila</span>
              <span>•</span>
              <span>{deliveredOrSent.length} processadas</span>
            </div>
          }
        />
      }
      contentClassName="relative px-4 pb-24 pt-4 gap-4"
    >
      <section className="bg-white rounded-2xl border border-line p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Clock3 className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-studio-text">Fila de envio</h3>
        </div>
        {queued.length === 0 ? (
          <p className="text-xs text-muted">Nenhuma mensagem em fila no momento.</p>
        ) : (
          <div className="space-y-2">
            {queued.slice(0, 20).map((job) => {
              const appointment = job.appointment_id ? appointmentsById.get(job.appointment_id) ?? null : null;
              const status = getUiStatus(job);
              const StatusIcon = status.icon;
              const automation = getAutomation(job.payload);
              const templateName = inferTemplateName(job, automation);
              const journey = buildJourneySteps(job);
              return (
                <div key={job.id} className="rounded-xl border border-line p-3 bg-studio-bg/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-studio-text">{mapJobTypeLabel(job.type)}</p>
                      <p className="text-[11px] text-muted truncate">
                        {getClientName(appointment)} • {appointment?.service_name ?? "Agendamento"}
                      </p>
                    </div>
                    <div className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${toneClasses[status.tone]}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-muted">
                    <p>{status.detail}</p>
                    <p>
                      <span className="font-semibold text-studio-text">Modelo:</span> {templateName}
                    </p>
                    <p>
                      <span className="font-semibold text-studio-text">Criado em:</span>{" "}
                      {formatDateTimeBr(job.created_at) ?? "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-studio-text">Agendado para:</span>{" "}
                      {formatDateTimeBr(job.scheduled_for) ?? "-"}{" "}
                      {formatRelative(job.scheduled_for) ? `(${formatRelative(job.scheduled_for)})` : ""}
                    </p>
                  </div>
                  {journey.length > 0 && (
                    <div className="mt-2 rounded-lg border border-line/60 bg-white/80 p-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted mb-1">
                        Caminho da mensagem
                      </p>
                      <div className="space-y-1">
                        {journey.slice(-4).map((step) => (
                          <div key={step.key} className="text-[10px] text-muted">
                            <span className="font-semibold text-studio-text">{step.label}:</span>{" "}
                            {formatDateTimeBr(step.at) ?? step.at}
                            {step.note ? ` • ${step.note}` : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-line p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4 text-studio-green" />
          <h3 className="text-sm font-bold text-studio-text">Histórico da automação</h3>
        </div>
        {jobs.length === 0 ? (
          <p className="text-xs text-muted">Sem mensagens automáticas registradas ainda.</p>
        ) : (
          <div className="space-y-2">
            {jobs.slice(0, 40).map((job) => {
              const appointment = job.appointment_id ? appointmentsById.get(job.appointment_id) ?? null : null;
              const status = getUiStatus(job);
              const StatusIcon = status.icon;
              const automation = getAutomation(job.payload);
              const templateName = inferTemplateName(job, automation);
              const recipient = typeof automation.recipient === "string" ? automation.recipient : null;
              const queuedAt = typeof automation.queued_at === "string" ? automation.queued_at : job.created_at;
              const processedAt =
                typeof automation.provider_delivery_updated_at === "string"
                  ? automation.provider_delivery_updated_at
                  : typeof automation.processed_at === "string"
                    ? automation.processed_at
                    : null;
              const journey = buildJourneySteps(job);
              return (
                <div key={job.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-studio-text">{mapJobTypeLabel(job.type)}</p>
                      <p className="text-[11px] text-muted truncate">
                        {getClientName(appointment)} • {appointment?.service_name ?? "Agendamento"}
                      </p>
                    </div>
                    <div className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${toneClasses[status.tone]}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-muted">
                    <p>
                      <span className="font-semibold text-studio-text">Modelo:</span> {templateName}
                    </p>
                    {recipient && (
                      <p>
                        <span className="font-semibold text-studio-text">Destino:</span> {recipient}
                      </p>
                    )}
                    <p>
                      <span className="font-semibold text-studio-text">Entrou na fila:</span>{" "}
                      {formatDateTimeBr(queuedAt) ?? "-"}{" "}
                      {formatRelative(queuedAt) ? `(${formatRelative(queuedAt)})` : ""}
                    </p>
                    <p>
                      <span className="font-semibold text-studio-text">Criado em:</span>{" "}
                      {formatDateTimeBr(job.created_at) ?? "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-studio-text">Programado para:</span>{" "}
                      {formatDateTimeBr(job.scheduled_for) ?? "-"}
                    </p>
                    {processedAt && (
                      <p>
                        <span className="font-semibold text-studio-text">Última atualização:</span>{" "}
                        {formatDateTimeBr(processedAt) ?? "-"}
                      </p>
                    )}
                    <p>{status.detail}</p>
                    {status.technicalDetail && (
                      <p className="text-[10px] text-muted/90">
                        <span className="font-semibold text-studio-text">Detalhe técnico:</span>{" "}
                        {status.technicalDetail}
                      </p>
                    )}
                  </div>
                  {journey.length > 0 && (
                    <div className="mt-2 rounded-lg border border-line/60 bg-studio-bg/40 p-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted mb-1">
                        Caminho percorrido
                      </p>
                      <div className="space-y-1">
                        {journey.map((step) => (
                          <div key={step.key} className="text-[10px] text-muted">
                            <span className="font-semibold text-studio-text">{step.label}:</span>{" "}
                            {formatDateTimeBr(step.at) ?? step.at}
                            {step.note ? ` • ${step.note}` : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </ModulePage>
  );
}
