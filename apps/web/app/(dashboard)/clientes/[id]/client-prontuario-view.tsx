import { ExternalLink, MapPin, Sparkles, Stethoscope } from "lucide-react";

import { Chip } from "../../../../components/ui/chip";
import { SurfaceCard } from "../../../../components/ui/surface-card";
import type { ClientDetailSnapshot } from "../../../../src/modules/clients/profile-data";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

function TextBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-line bg-paper/75 p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-studio-text">
        {value?.trim() || "Sem conteúdo registrado."}
      </p>
    </div>
  );
}

export function ClientProntuarioView({ snapshot }: { snapshot: ClientDetailSnapshot }) {
  const { client, anamnesis, prontuarioEntries } = snapshot;

  return (
    <div className="space-y-5 px-4 pb-10 pt-4">
      <SurfaceCard className="space-y-3 border-white bg-gradient-to-br from-studio-light via-white to-paper">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-studio-green" />
          <p className="text-sm font-extrabold text-studio-text">Prontuário de {client.name}</p>
        </div>
        <p className="text-sm text-muted">
          Esta tela concentra a anamnese base do cliente e todas as evoluções registradas nos atendimentos já realizados.
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip>{prontuarioEntries.length} sessão(ões)</Chip>
          {anamnesis.healthTags.map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </div>
      </SurfaceCard>

      <section className="space-y-2">
        <p className="pl-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">Anamnese base</p>
        <SurfaceCard className="space-y-3">
          <TextBlock label="Histórico clínico" value={anamnesis.clinicalHistory} />
          <TextBlock label="Contraindicações" value={anamnesis.contraindications} />
          <TextBlock label="Preferências" value={anamnesis.preferencesNotes} />
          <TextBlock label="Observações gerais" value={anamnesis.observations} />
          <TextBlock label="Notas legadas" value={anamnesis.legacyNotes} />

          {anamnesis.healthItems.length > 0 && (
            <div className="rounded-2xl border border-line bg-paper/75 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">Itens de saúde estruturados</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {anamnesis.healthItems.map((item) => (
                  <Chip
                    key={item.id}
                    tone={item.type === "allergy" ? "danger" : item.type === "condition" ? "warning" : "default"}
                  >
                    {item.label}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {anamnesis.anamneseUrl && (
            <a
              href={anamnesis.anamneseUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-studio-green underline"
            >
              Abrir anamnese anexada
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </SurfaceCard>
      </section>

      <section className="space-y-2">
        <p className="pl-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">Linha do tempo clínica</p>
        <div className="space-y-3">
          {prontuarioEntries.length > 0 ? (
            prontuarioEntries.map((entry) => (
              <SurfaceCard key={entry.appointmentId} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-studio-text">{entry.serviceName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{formatDate(entry.startTime)}</span>
                      <span>•</span>
                      <span>{entry.isHomeVisit ? "Domicílio" : "Estúdio"}</span>
                      {entry.attendanceCode && (
                        <>
                          <span>•</span>
                          <span>Código {entry.attendanceCode}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entry.status && <Chip tone={entry.status === "completed" ? "success" : "dom"}>{entry.status}</Chip>}
                    <Chip tone={entry.isHomeVisit ? "warning" : "default"}>
                      {entry.isHomeVisit ? "Domicílio" : "Estúdio"}
                    </Chip>
                  </div>
                </div>

                {entry.internalNotes && (
                  <div className="rounded-2xl border border-line bg-paper/80 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-studio-green" />
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">Observações do atendimento</p>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-studio-text">{entry.internalNotes}</p>
                  </div>
                )}

                <div className="rounded-2xl border border-line bg-paper/80 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-studio-green" />
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">Evolução registrada</p>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-studio-text">
                    {entry.evolutionText?.trim() || "Sem evolução registrada para esta sessão."}
                  </p>
                </div>
              </SurfaceCard>
            ))
          ) : (
            <SurfaceCard className="border border-dashed border-line bg-paper/50 text-sm text-muted">
              Este cliente ainda não possui evoluções registradas.
            </SurfaceCard>
          )}
        </div>
      </section>
    </div>
  );
}
