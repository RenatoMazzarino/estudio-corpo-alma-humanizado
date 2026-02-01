"use client";

import { Sparkles, Layers3, History, Play, Pause } from "lucide-react";
import type { AttendanceRow, EvolutionEntry } from "../../../../../lib/attendance/attendance-types";
import { StageHeader } from "./stage-header";
import { StageStatusBadge } from "./stage-status";

interface SessionStageProps {
  attendance: AttendanceRow;
  evolution: EvolutionEntry[];
  onBack: () => void;
  onMinimize: () => void;
  onNext: () => void;
  summary: string;
  complaint: string;
  techniques: string;
  recommendations: string;
  onChange: (field: "summary" | "complaint" | "techniques" | "recommendations", value: string) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
}

export function SessionStage({
  attendance,
  evolution,
  onBack,
  onMinimize,
  onNext,
  summary,
  complaint,
  techniques,
  recommendations,
  onChange,
  onSaveDraft,
  onPublish,
  isTimerRunning,
  onToggleTimer,
}: SessionStageProps) {
  const publishedHistory = evolution.filter((entry) => entry.status === "published");

  return (
    <div className="relative -mx-4 -mt-4">
      <StageHeader
        kicker="Etapa"
        title="Sessão"
        subtitle="Evolução estruturada e histórico"
        onBack={onBack}
        onMinimize={onMinimize}
      />

      <main className="px-6 pt-6 pb-32">
        <div className="bg-white border border-stone-100 rounded-[28px] shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Evolução</div>
              <div className="mt-2 text-lg font-black text-gray-800">Registro do atendimento</div>
              <div className="text-xs text-gray-400 font-semibold mt-1">Estruturado por seções + histórico.</div>
            </div>
            <StageStatusBadge status={attendance.session_status} />
          </div>

          <div className="px-5 pb-5">
            <div className="flex gap-4 py-4 border-t border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-studio-bg text-studio-green flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Resumo rápido</div>
                <div className="mt-2 text-sm font-bold text-gray-800">Pressão, foco e sensações</div>
                <div className="text-xs text-gray-400 mt-1">Presets configuráveis por serviço.</div>
              </div>
              <button className="text-xs font-extrabold text-studio-green hover:underline mt-1">Presets</button>
            </div>

            <div className="flex gap-4 py-4 border-t border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-studio-bg text-studio-green flex items-center justify-center">
                <Layers3 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Evolução estruturada</div>
                <div className="mt-3 space-y-3">
                  <div className="bg-studio-bg border border-gray-200 rounded-2xl p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Resumo</p>
                    <textarea
                      className="mt-2 w-full bg-white rounded-2xl p-4 text-sm text-gray-700 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
                      rows={2}
                      placeholder="Ex.: Pressão média, foco em cervical e lombar..."
                      value={summary}
                      onChange={(event) => onChange("summary", event.target.value)}
                    />
                  </div>

                  <div className="bg-studio-bg border border-gray-200 rounded-2xl p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Queixa / objetivo</p>
                    <textarea
                      className="mt-2 w-full bg-white rounded-2xl p-4 text-sm text-gray-700 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
                      rows={3}
                      placeholder="Ex.: tensão cervical e dor lombar após treino..."
                      value={complaint}
                      onChange={(event) => onChange("complaint", event.target.value)}
                    />
                  </div>

                  <div className="bg-studio-bg border border-gray-200 rounded-2xl p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Técnicas aplicadas</p>
                    <textarea
                      className="mt-2 w-full bg-white rounded-2xl p-4 text-sm text-gray-700 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
                      rows={3}
                      placeholder="Ex.: deslizamento, liberação miofascial leve..."
                      value={techniques}
                      onChange={(event) => onChange("techniques", event.target.value)}
                    />
                  </div>

                  <div className="bg-studio-bg border border-gray-200 rounded-2xl p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Resposta / recomendações</p>
                    <textarea
                      className="mt-2 w-full bg-white rounded-2xl p-4 text-sm text-gray-700 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
                      rows={3}
                      placeholder="Ex.: relatou alívio, orientar hidratação..."
                      value={recommendations}
                      onChange={(event) => onChange("recommendations", event.target.value)}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={onSaveDraft}
                      className="flex-1 py-3 rounded-2xl bg-studio-bg border border-gray-200 text-gray-700 font-extrabold text-xs uppercase tracking-wide hover:bg-gray-50 transition"
                    >
                      Rascunho
                    </button>
                    <button
                      onClick={onPublish}
                      className="flex-1 py-3 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-200 active:scale-[0.99] transition"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 py-4 border-t border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-studio-bg text-studio-green flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Histórico</div>
                {publishedHistory.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-400">Nenhuma evolução publicada ainda.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {publishedHistory.map((entry) => (
                      <div key={entry.id} className="bg-studio-bg border border-gray-200 rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-extrabold text-gray-800">Versão {entry.version}</p>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-studio-green">Evolução</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2 italic">{entry.summary || entry.complaint || "Registro publicado"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 flex justify-center">
        <div className="w-full max-w-[414px] bg-white border-t border-stone-100 px-6 py-4 pb-6 rounded-t-[28px] shadow-[0_-10px_40px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleTimer}
              className="w-14 h-14 rounded-2xl bg-studio-bg border border-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-50 transition"
            >
              {isTimerRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <button
              onClick={onNext}
              className="flex-1 h-14 rounded-2xl bg-studio-green text-white font-extrabold shadow-lg shadow-green-200 active:scale-[0.99] transition flex items-center justify-center gap-2 text-sm tracking-wide uppercase"
            >
              Ir para Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
