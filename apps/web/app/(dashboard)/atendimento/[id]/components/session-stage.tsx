"use client";

import type { AttendanceRow, ChecklistItem, EvolutionEntry } from "../../../../../lib/attendance/attendance-types";
import { StageStatusBadge } from "./stage-status";

interface SessionStageProps {
  attendance: AttendanceRow;
  checklist: ChecklistItem[];
  onToggleChecklist: (itemId: string, completed: boolean) => void;
  evolution: EvolutionEntry[];
  summary: string;
  complaint: string;
  techniques: string;
  recommendations: string;
  onChange: (field: "summary" | "complaint" | "techniques" | "recommendations", value: string) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export function SessionStage({
  attendance,
  checklist,
  onToggleChecklist,
  evolution,
  summary,
  complaint,
  techniques,
  recommendations,
  onChange,
  onSaveDraft,
  onPublish,
}: SessionStageProps) {
  const publishedHistory = evolution
    .filter((entry) => entry.status === "published")
    .sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  const lastPublished = publishedHistory[0] ?? null;
  const presets = Array.isArray((lastPublished?.sections_json as { presets?: unknown } | null)?.presets)
    ? ((lastPublished?.sections_json as { presets?: unknown[] }).presets ?? []).filter(
        (preset) => typeof preset === "string"
      )
    : [];

  const checklistSourceLabel = (source: string | null) => {
    if (!source) return "manual";
    const normalized = source.replace(/_/g, " ").trim().toLowerCase();
    if (normalized === "service preset") return "serviço";
    if (normalized === "default") return "padrão";
    return normalized;
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl p-5 shadow-soft border border-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-serif font-bold text-studio-text">Checklist inicial</h2>
            <p className="text-xs text-muted mt-1">Materiais e pré-sessão.</p>
          </div>
        </div>

        <div className="mt-4">
          {checklist.length === 0 ? (
            <p className="text-xs text-muted">Nenhum item cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center justify-between bg-paper border border-line rounded-2xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-studio-green"
                      checked={Boolean(item.completed_at)}
                      onChange={(event) => onToggleChecklist(item.id, event.target.checked)}
                    />
                    <span className="text-sm font-bold text-studio-text">{item.label}</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-muted uppercase">
                    {checklistSourceLabel(item.source)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-soft border border-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-serif font-bold text-studio-text">Sessão</h2>
            <p className="text-xs text-muted mt-1">Evolução estruturada + histórico.</p>
          </div>
          <StageStatusBadge status={attendance.session_status} variant="compact" />
        </div>

        <div className="mt-4 bg-paper border border-line rounded-3xl p-4">
          <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Presets</p>
          {presets.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {presets.map((preset) => (
                <span
                  key={preset}
                  className="px-3 py-1.5 rounded-2xl bg-white border border-line text-xs font-extrabold text-studio-green"
                >
                  {preset}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted mt-2">Nenhum preset registrado.</p>
          )}

          <div className="mt-4">
            <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Resumo rápido</p>
            <textarea
              className="mt-2 w-full bg-white rounded-2xl p-4 text-sm text-studio-text border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
              rows={2}
              placeholder="Ex.: pressão média, foco em cervical..."
              value={summary}
              onChange={(event) => onChange("summary", event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-soft border border-white space-y-4">
        <div>
          <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest mb-2">Queixa / Objetivo</p>
          <textarea
            className="w-full h-24 bg-paper rounded-2xl p-4 text-sm text-studio-text border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
            placeholder="Ex.: tensão cervical, relaxamento geral..."
            value={complaint}
            onChange={(event) => onChange("complaint", event.target.value)}
          />
        </div>
        <div>
          <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest mb-2">Técnicas aplicadas</p>
          <textarea
            className="w-full h-24 bg-paper rounded-2xl p-4 text-sm text-studio-text border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
            placeholder="Ex.: deslizamento, liberação..."
            value={techniques}
            onChange={(event) => onChange("techniques", event.target.value)}
          />
        </div>
        <div>
          <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest mb-2">Resposta / Recomendações</p>
          <textarea
            className="w-full h-24 bg-paper rounded-2xl p-4 text-sm text-studio-text border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
            placeholder="Ex.: hidratação, alongamento, retorno..."
            value={recommendations}
            onChange={(event) => onChange("recommendations", event.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSaveDraft}
            type="button"
            className="flex-1 h-12 rounded-2xl bg-paper border border-gray-200 text-gray-700 font-extrabold text-xs hover:bg-gray-50 transition"
          >
            Salvar rascunho
          </button>
          <button
            onClick={onPublish}
            type="button"
            className="flex-1 h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs shadow-lg shadow-green-200 active:scale-95 transition"
          >
            Publicar evolução
          </button>
        </div>
      </div>

      <div className="bg-white/60 rounded-3xl p-5 border border-dashed border-gray-200">
        <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Histórico</p>
        {lastPublished ? (
          <>
            <p className="text-sm font-bold text-studio-text mt-2">Versão {lastPublished.version}</p>
            <p className="text-xs text-muted mt-1 italic">
              “{lastPublished.summary || lastPublished.complaint || "Registro publicado"}”
            </p>
          </>
        ) : (
          <p className="text-xs text-muted mt-2">Nenhuma evolução publicada ainda.</p>
        )}
      </div>
    </div>
  );
}
