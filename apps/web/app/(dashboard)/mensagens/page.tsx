import { Clock3, MessageCircle } from "lucide-react";
import { ModuleHeader } from "../../../components/ui/module-header";
import { ModulePage } from "../../../components/ui/module-page";
import {
  buildJourneySteps,
  formatDateTimeBr,
  formatRelative,
  getAutomation,
  getClientName,
  getUiStatus,
  inferTemplateName,
  loadMessagesData,
  mapJobTypeLabel,
  toneClasses,
} from "./message-jobs";

export const dynamic = "force-dynamic";

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
