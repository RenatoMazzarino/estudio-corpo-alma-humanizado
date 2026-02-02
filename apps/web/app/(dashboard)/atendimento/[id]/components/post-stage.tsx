"use client";

import { useState } from "react";
import { addDays } from "date-fns";
import type {
  AttendanceRow,
  PostRow,
  AppointmentMessage,
  MessageStatus,
} from "../../../../../lib/attendance/attendance-types";
import { StageStatusBadge } from "./stage-status";

interface PostStageProps {
  attendance: AttendanceRow;
  post: PostRow | null;
  messages: AppointmentMessage[];
  kpiLabel: string;
  onSavePost: (payload: { postNotes?: string | null; followUpDueAt?: string | null; followUpNote?: string | null }) => void;
  onSendSurvey: () => void;
  onRecordSurvey: (score: number) => void;
}

export function PostStage({
  attendance,
  post,
  messages,
  kpiLabel,
  onSavePost,
  onSendSurvey,
  onRecordSurvey,
}: PostStageProps) {
  const [postNotes, setPostNotes] = useState(post?.post_notes ?? "");
  const [followUpNote, setFollowUpNote] = useState(post?.follow_up_note ?? "");
  const [followUpDate, setFollowUpDate] = useState(post?.follow_up_due_at ? post.follow_up_due_at.slice(0, 10) : "");
  const [surveyScore, setSurveyScore] = useState(post?.survey_score ?? 0);
  const surveyMessage = messages.find((message) => message.type === "post_survey") ?? null;
  const surveyMessageText =
    typeof (surveyMessage?.payload as { message?: unknown } | null)?.message === "string"
      ? ((surveyMessage?.payload as { message: string }).message ?? null)
      : null;
  const statusLabel =
    attendance.post_status === "done"
      ? "Concluído"
      : attendance.post_status === "in_progress"
        ? "Em andamento"
        : attendance.post_status === "locked"
          ? "Bloqueado"
          : "Disponível";
  const hasSurveyAnswer = post?.survey_score !== null && post?.survey_score !== undefined;

  const messageStatusLabel = (status: MessageStatus | null) => {
    if (!status) return "não enviada";
    switch (status) {
      case "sent_manual":
      case "sent_auto":
        return "enviada";
      case "delivered":
        return "entregue";
      case "failed":
        return "falhou";
      default:
        return "rascunho";
    }
  };

  const setQuickFollowUp = (days: number) => {
    const date = addDays(new Date(), days);
    setFollowUpDate(date.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl p-5 shadow-soft border border-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-serif font-bold text-studio-text">Pós-atendimento</h2>
            <p className="text-xs text-muted mt-1">KPI, pesquisa e follow-up.</p>
          </div>
          <StageStatusBadge status={attendance.post_status} variant="compact" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-paper rounded-2xl p-3 border border-line">
            <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Tempo total</p>
            <p className="text-sm font-black text-studio-text tabular-nums">{kpiLabel}</p>
          </div>
          <div className="bg-paper rounded-2xl p-3 border border-line">
            <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Status</p>
            <p className="text-sm font-bold text-studio-text">{statusLabel}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-soft border border-white">
        <h3 className="text-xs font-extrabold text-muted uppercase tracking-widest mb-4">Pesquisa de satisfação (WhatsApp)</h3>

        <div className="bg-paper border border-line rounded-3xl p-4">
          <p className="text-sm font-bold text-studio-text">Mensagem da pesquisa</p>
          <p className="text-xs text-muted mt-1">
            {surveyMessageText ?? "Nenhuma mensagem registrada ainda."}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold text-muted">Status: {messageStatusLabel(surveyMessage?.status ?? null)}</p>
            <button
              onClick={onSendSurvey}
              className="px-3 py-2 rounded-2xl bg-studio-light text-studio-green font-extrabold text-xs border border-studio-green/10 hover:bg-white transition"
            >
              Enviar
            </button>
          </div>
        </div>

        <div className="mt-4 bg-white border border-dashed border-line rounded-3xl p-4">
          <p className="text-sm font-bold text-studio-text">Resposta</p>
          <p className="text-xs text-muted mt-1">
            {hasSurveyAnswer ? `Nota registrada: ${post?.survey_score}` : "Sem resposta registrada."}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={10}
              value={surveyScore}
              onChange={(event) => setSurveyScore(Number(event.target.value))}
              className="w-20 px-3 py-2 rounded-xl border border-line text-sm"
            />
            <button
              onClick={() => onRecordSurvey(surveyScore)}
              className="px-3 py-2 rounded-xl bg-studio-green text-white text-xs font-bold"
            >
              Registrar
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-soft border border-white">
        <h3 className="text-xs font-extrabold text-muted uppercase tracking-widest mb-4">Follow-up</h3>

        <div className="bg-paper border border-line rounded-3xl p-4">
          <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Criar tarefa</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setQuickFollowUp(7)}
              className="flex-1 h-11 rounded-2xl bg-white border border-line text-sm font-extrabold text-studio-green hover:bg-gray-50 transition"
            >
              +7 dias
            </button>
            <button
              type="button"
              onClick={() => setQuickFollowUp(30)}
              className="flex-1 h-11 rounded-2xl bg-white border border-line text-sm font-extrabold text-studio-green hover:bg-gray-50 transition"
            >
              +30 dias
            </button>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest mb-2">Notas pós-atendimento</p>
          <textarea
            className="w-full h-28 bg-paper rounded-2xl p-4 text-sm text-studio-text border border-line focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
            placeholder="Anotações finais e pontos para próximas sessões..."
            value={postNotes}
            onChange={(event) => setPostNotes(event.target.value)}
          />
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest mb-2">Follow-up</p>
          <input
            type="date"
            value={followUpDate}
            onChange={(event) => setFollowUpDate(event.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          />
          <textarea
            className="mt-3 w-full rounded-xl border border-line px-3 py-2 text-sm"
            rows={3}
            value={followUpNote}
            onChange={(event) => setFollowUpNote(event.target.value)}
            placeholder="Ex.: retorno em 7 dias"
          />
        </div>

        <button
          onClick={() =>
            onSavePost({
              postNotes,
              followUpNote,
              followUpDueAt: followUpDate ? new Date(followUpDate).toISOString() : null,
            })
          }
          className="mt-4 w-full h-12 rounded-2xl bg-studio-light border border-line text-studio-text font-extrabold text-xs uppercase tracking-wide"
        >
          Salvar informações
        </button>
      </div>
    </div>
  );
}
