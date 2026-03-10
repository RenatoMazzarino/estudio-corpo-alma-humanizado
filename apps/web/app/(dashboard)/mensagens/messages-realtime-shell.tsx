"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Clock3, MessageCircle, RadioTower } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { InlineLoading } from "../../../components/ui/loading-system";
import { ModuleHeader } from "../../../components/ui/module-header";
import { ModulePage } from "../../../components/ui/module-page";
import { useSupabaseRealtimeRefresh } from "../../../src/shared/realtime/use-supabase-realtime-refresh";
import type { AppointmentMini, AutomationState, JobRow } from "./message-jobs.shared";
import {
  buildJourneySteps,
  formatDateTimeBr,
  formatRelative,
  getAutomation,
  getClientName,
  getUiStatus,
  inferTemplateName,
  mapJobTypeLabel,
  toneClasses,
} from "./message-jobs.shared";

type MensagensTab = "fila" | "templates";

const resolveTab = (value: string | null | undefined): MensagensTab =>
  value === "templates" ? "templates" : "fila";

const tabBaseClasses =
  "inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold transition";

const activeTabClasses = "border-studio-green bg-studio-green/10 text-studio-green";
const inactiveTabClasses = "border-line bg-white text-muted hover:text-studio-text";

type MessagesRealtimeData = {
  jobs: JobRow[];
  appointments: AppointmentMini[];
  automationState: AutomationState | null;
  generatedAt: string;
};

type MessagesRealtimeShellProps = {
  initialData: MessagesRealtimeData;
};

async function fetchLatestMessagesState(signal?: AbortSignal) {
  const response = await fetch("/api/internal/messages/state", {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
    signal,
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok: true; data: MessagesRealtimeData }
    | { ok: false; error: string }
    | null;

  if (!response.ok || !payload || !payload.ok) {
    const detail = payload && "error" in payload ? payload.error : "Falha ao atualizar estado de mensagens.";
    throw new Error(detail);
  }

  return payload.data;
}

export function MessagesRealtimeShell({ initialData }: MessagesRealtimeShellProps) {
  const searchParams = useSearchParams();
  const activeTab = resolveTab(searchParams.get("tab"));
  const [data, setData] = useState<MessagesRealtimeData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshError, setLastRefreshError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightControllerRef = useRef<AbortController | null>(null);

  const refreshState = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setLastRefreshError(null);
    inFlightControllerRef.current?.abort();
    const controller = new AbortController();
    inFlightControllerRef.current = controller;

    try {
      const latest = await fetchLatestMessagesState(controller.signal);
      setData(latest);
    } catch (error) {
      if (controller.signal.aborted) return;
      const message =
        error instanceof Error ? error.message : "Falha ao atualizar dados em tempo real.";
      setLastRefreshError(message);
    } finally {
      if (!controller.signal.aborted) {
        setIsRefreshing(false);
      }
    }
  }, [isRefreshing]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = setTimeout(() => {
      void refreshState();
    }, 300);
  }, [refreshState]);

  const appointmentsById = useMemo(() => {
    const map = new Map<string, AppointmentMini>();
    for (const appointment of data.appointments) {
      map.set(appointment.id, appointment);
    }
    return map;
  }, [data.appointments]);

  const jobs = data.jobs;
  const automationState = data.automationState;
  const queued = useMemo(() => jobs.filter((job) => job.status === "pending"), [jobs]);
  const deliveredOrSent = useMemo(() => jobs.filter((job) => job.status !== "pending"), [jobs]);

  const realtimeTables = useMemo(
    () => [
      { table: "notification_jobs", event: "*" as const },
      { table: "notification_templates", event: "*" as const },
      { table: "whatsapp_webhook_events", event: "*" as const },
      { table: "notification_event_outbox", event: "*" as const },
      { table: "notification_dispatch_logs", event: "*" as const },
    ],
    []
  );

  const realtime = useSupabaseRealtimeRefresh({
    channelName: "mensagens-live",
    tables: realtimeTables,
    featureKey: automationState?.profile ?? "mensagens",
    onEvent: () => {
      scheduleRefresh();
    },
  });

  const realtimeLabel =
    realtime.health.status === "ready"
      ? "Tempo real ativo"
      : realtime.health.status === "connecting"
        ? "Conectando realtime..."
        : realtime.health.status === "degraded"
          ? "Realtime degradado"
          : "Realtime inativo";

  return (
    <ModulePage
      header={
        <ModuleHeader
          title="Mensagens"
          subtitle="Fila operacional e catálogo Meta dos templates da automação WhatsApp."
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
      <section className="bg-white rounded-2xl border border-line p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/mensagens?tab=fila"
              className={`${tabBaseClasses} ${activeTab === "fila" ? activeTabClasses : inactiveTabClasses}`}
            >
              Fila e histórico
            </Link>
            <Link
              href="/mensagens?tab=templates"
              className={`${tabBaseClasses} ${activeTab === "templates" ? activeTabClasses : inactiveTabClasses}`}
            >
              Templates Meta
            </Link>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted">
            <RadioTower className="h-3.5 w-3.5" />
            <span>{realtimeLabel}</span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
          <span>
            Atualizado em {formatDateTimeBr(data.generatedAt) ?? "agora"}
          </span>
          {isRefreshing ? <InlineLoading label="Sincronizando..." /> : null}
        </div>
        {lastRefreshError ? (
          <p className="mt-2 text-[10px] text-red-600">{lastRefreshError}</p>
        ) : null}
      </section>

      {automationState && (
        <section className="bg-white rounded-2xl border border-line p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-bold text-studio-text">Estado da automação</h3>
            <span className="text-[10px] text-muted">
              {automationState.runtimeEnvironment} • {automationState.profile}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1 text-[11px] text-muted">
            <p>
              <span className="font-semibold text-studio-text">Perfil ativo:</span>{" "}
              {automationState.profile}
            </p>
            <p>
              <span className="font-semibold text-studio-text">Número remetente ativo:</span>{" "}
              {automationState.senderDisplayPhone ||
                automationState.senderPhoneNumberId ||
                "Não informado no canal por ambiente"}
            </p>
            <p>
              <span className="font-semibold text-studio-text">Destino forçado:</span>{" "}
              {automationState.forcedRecipient ?? "Não (envio para cliente real)"}
            </p>
            <p>
              <span className="font-semibold text-studio-text">Templates:</span>{" "}
              {automationState.templatesActive} ativos • {automationState.templatesInReview} em análise •{" "}
              {automationState.templatesOther} outros • {automationState.templatesTotal} no total
            </p>
            <p>
              <span className="font-semibold text-studio-text">Último erro operacional:</span>{" "}
              {automationState.latestOperationalError ?? "Sem erro recente"}
            </p>
            {automationState.latestOperationalErrorAt && (
              <p>
                <span className="font-semibold text-studio-text">Último erro em:</span>{" "}
                {formatDateTimeBr(automationState.latestOperationalErrorAt)}
              </p>
            )}
          </div>
          {automationState.failSafeIssues.length > 0 && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-700">
                Falhas de configuração (fail-safe)
              </p>
              <div className="mt-1 space-y-1">
                {automationState.failSafeIssues.map((issue) => (
                  <p key={issue} className="text-[10px] text-red-700">
                    • {issue}
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === "fila" && (
        <>
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
        </>
      )}

      {activeTab === "templates" && (
        <section className="bg-white rounded-2xl border border-line p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-studio-text">Catálogo oficial de templates (Meta)</h3>
            <span className="text-[10px] text-muted">{automationState?.templatesTotal ?? 0} registros</span>
          </div>
          {!automationState || automationState.templates.length === 0 ? (
            <p className="text-xs text-muted">Sem templates catalogados ainda para este tenant.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line/70">
              <table className="min-w-[980px] w-full text-[11px]">
                <thead className="bg-studio-bg/60 text-muted">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-semibold">Template</th>
                    <th className="px-3 py-2 font-semibold">Idioma</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Qualidade</th>
                    <th className="px-3 py-2 font-semibold">Categoria</th>
                    <th className="px-3 py-2 font-semibold">ID Meta</th>
                    <th className="px-3 py-2 font-semibold">Origem</th>
                    <th className="px-3 py-2 font-semibold">Sync Meta</th>
                    <th className="px-3 py-2 font-semibold">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {automationState.templates.map((template) => (
                    <tr key={`${template.name}-${template.language_code}`} className="border-t border-line/60 align-top">
                      <td className="px-3 py-2 text-studio-text font-semibold">{template.name}</td>
                      <td className="px-3 py-2 text-muted">{template.language_code ?? "-"}</td>
                      <td className="px-3 py-2 text-muted">{(template.status ?? "unknown").toLowerCase()}</td>
                      <td className="px-3 py-2 text-muted">{template.quality ?? "-"}</td>
                      <td className="px-3 py-2 text-muted">{template.category ?? "-"}</td>
                      <td className="px-3 py-2 text-muted">{template.provider_template_id ?? "-"}</td>
                      <td className="px-3 py-2 text-muted">{template.source ?? "-"}</td>
                      <td className="px-3 py-2 text-muted">{formatDateTimeBr(template.last_synced_at) ?? "-"}</td>
                      <td className="px-3 py-2 text-muted">{formatDateTimeBr(template.updated_at) ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </ModulePage>
  );
}
