"use client";

import { useState } from "react";
import { Timer, ClipboardCheck, ListChecks, FileText } from "lucide-react";
import type { AttendanceRow, PostRow } from "../../../../../lib/attendance/attendance-types";
import { StageHeader } from "./stage-header";
import { StageStatusBadge } from "./stage-status";

interface PostStageProps {
  attendance: AttendanceRow;
  post: PostRow | null;
  kpiLabel: string;
  onBack: () => void;
  onMinimize: () => void;
  onSavePost: (payload: { postNotes?: string | null; followUpDueAt?: string | null; followUpNote?: string | null }) => void;
  onSendSurvey: () => void;
  onRecordSurvey: (score: number) => void;
  onFinish: () => void;
}

export function PostStage({
  attendance,
  post,
  kpiLabel,
  onBack,
  onMinimize,
  onSavePost,
  onSendSurvey,
  onRecordSurvey,
  onFinish,
}: PostStageProps) {
  const [postNotes, setPostNotes] = useState(post?.post_notes ?? "");
  const [followUpNote, setFollowUpNote] = useState(post?.follow_up_note ?? "");
  const [followUpDate, setFollowUpDate] = useState(post?.follow_up_due_at ? post.follow_up_due_at.slice(0, 10) : "");
  const [surveyScore, setSurveyScore] = useState(post?.survey_score ?? 0);

  return (
    <div className="relative -mx-4 -mt-4">
      <StageHeader
        kicker="Etapa"
        title="Pós"
        subtitle="KPI, pesquisa e follow-up"
        onBack={onBack}
        onMinimize={onMinimize}
      />

      <main className="px-6 pt-6 pb-32">
        <div className="bg-white border border-stone-100 rounded-[28px] shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Encerramento</div>
              <div className="mt-2 text-lg font-black text-gray-800">Pós-atendimento</div>
              <div className="text-xs text-gray-400 font-semibold mt-1">Guardar KPI, enviar pesquisa e registrar notas.</div>
            </div>
            <StageStatusBadge status={attendance.post_status} />
          </div>

          <div className="px-5 pb-5">
            <div className="flex gap-4 py-4 border-t border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-studio-bg text-studio-green flex items-center justify-center">
                <Timer className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">KPI — tempo total</div>
                <div className="mt-2 text-sm font-bold text-gray-800 tabular-nums">{kpiLabel}</div>
              </div>
            </div>

            <div className="flex gap-4 py-4 border-t border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-studio-bg text-studio-green flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Pesquisa de satisfação</div>
                <div className="mt-2 text-sm font-bold text-gray-800">{post?.survey_status ?? "not_sent"}</div>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={surveyScore}
                    onChange={(event) => setSurveyScore(Number(event.target.value))}
                    className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm"
                  />
                  <button
                    onClick={() => onRecordSurvey(surveyScore)}
                    className="px-3 py-2 rounded-xl bg-studio-green text-white text-xs font-bold"
                  >
                    Registrar
                  </button>
                  <button
                    onClick={onSendSurvey}
                    className="px-3 py-2 rounded-xl bg-studio-bg text-studio-green text-xs font-bold"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-4 py-4 border-t border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-studio-bg text-studio-green flex items-center justify-center">
                <ListChecks className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Follow-up</div>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(event) => setFollowUpDate(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
                <textarea
                  className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  rows={3}
                  value={followUpNote}
                  onChange={(event) => setFollowUpNote(event.target.value)}
                  placeholder="Ex.: retorno em 7 dias"
                />
              </div>
            </div>

            <div className="flex gap-4 py-4 border-t border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-studio-bg text-studio-green flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">Notas pós</div>
                <textarea
                  className="mt-2 w-full bg-studio-bg rounded-2xl p-4 text-sm text-gray-700 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
                  rows={4}
                  value={postNotes}
                  onChange={(event) => setPostNotes(event.target.value)}
                  placeholder="Ex.: reagendar, preferências, cuidados, observações finais..."
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 flex justify-center">
        <div className="w-full max-w-[414px] bg-white border-t border-stone-100 px-6 py-4 pb-6 rounded-t-[28px] shadow-[0_-10px_40px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                onSavePost({
                  postNotes,
                  followUpNote,
                  followUpDueAt: followUpDate ? new Date(followUpDate).toISOString() : null,
                })
              }
              className="flex-1 h-12 rounded-2xl bg-studio-bg border border-gray-200 text-gray-700 font-extrabold text-xs uppercase tracking-wide"
            >
              Salvar
            </button>
            <button
              onClick={onFinish}
              className="flex-1 h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-200"
            >
              Finalizar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
