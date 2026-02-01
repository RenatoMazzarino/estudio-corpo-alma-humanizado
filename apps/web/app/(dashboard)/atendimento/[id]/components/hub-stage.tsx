"use client";

import { CalendarClock, MapPin, Timer, FileText, Receipt, ClipboardCheck, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AttendanceRow, AppointmentDetails, StageKey } from "../../../../../lib/attendance/attendance-types";
import { StageStatusBadge } from "./stage-status";

interface HubStageProps {
  appointment: AppointmentDetails;
  attendance: AttendanceRow;
  onOpenStage: (stage: StageKey) => void;
  onResumeSession: () => void;
  timerLabel?: string | null;
  timerActive: boolean;
}

export function HubStage({ appointment, attendance, onOpenStage, onResumeSession, timerLabel, timerActive }: HubStageProps) {
  const dateLabel = format(new Date(appointment.start_time), "dd MMM '•' HH:mm", { locale: ptBR });
  const locationLabel = appointment.is_home_visit ? "Domicílio" : "Estúdio";

  const cards: Array<{ key: StageKey; title: string; description: string; metaLeft: string; metaRight: string }> = [
    {
      key: "pre",
      title: "Pré",
      description: "Confirmação 24h, checklist, contato e logística.",
      metaLeft: dateLabel,
      metaRight: locationLabel,
    },
    {
      key: "session",
      title: "Sessão",
      description: "Evolução estruturada, histórico e cronômetro.",
      metaLeft: "Cronômetro",
      metaRight: "Evolução",
    },
    {
      key: "checkout",
      title: "Checkout",
      description: "Itens, taxas, desconto e pagamento.",
      metaLeft: "Total",
      metaRight: "Pix/Cartão",
    },
    {
      key: "post",
      title: "Pós",
      description: "KPI, pesquisa de satisfação, follow-up e notas.",
      metaLeft: "KPI",
      metaRight: "Pesquisa",
    },
  ];

  const statusByStage: Record<StageKey, typeof attendance.pre_status> = {
    hub: "available",
    pre: attendance.pre_status,
    session: attendance.session_status,
    checkout: attendance.checkout_status,
    post: attendance.post_status,
  };

  return (
    <main className="flex-1 overflow-y-auto no-scrollbar px-6 pt-6 pb-28 space-y-4">
      {timerActive && (
        <div className="bg-studio-bg border border-gray-200 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${attendance.timer_status === "running" ? "bg-red-500 animate-pulse" : "bg-orange-400"}`} />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Sessão em andamento</p>
              <p className="text-lg font-black tabular-nums text-gray-800">{timerLabel ?? "00:00"}</p>
            </div>
          </div>
          <button
            onClick={onResumeSession}
            className="px-4 h-11 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-200 active:scale-[0.99] transition flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4" /> Voltar
          </button>
        </div>
      )}

      {cards.map((card) => {
        const status = statusByStage[card.key];
        const isLocked = status === "locked";
        return (
          <button
            key={card.key}
            onClick={() => !isLocked && onOpenStage(card.key)}
            className={`w-full text-left bg-white border border-stone-100 rounded-[26px] shadow-sm px-4 py-4 transition active:scale-[0.99] ${
              isLocked ? "opacity-60" : "hover:shadow-md"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-lg font-serif font-bold text-gray-800">{card.title}</div>
              <StageStatusBadge status={status} />
            </div>
            <p className="mt-2 text-sm text-gray-400 font-semibold leading-relaxed">{card.description}</p>
            <div className="mt-4 flex items-center justify-between gap-3 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
              <span className="inline-flex items-center gap-2 bg-studio-bg text-studio-green px-3 py-2 rounded-full">
                {card.key === "pre" ? <CalendarClock className="w-3 h-3" /> : card.key === "session" ? <Timer className="w-3 h-3" /> : card.key === "checkout" ? <Receipt className="w-3 h-3" /> : <ClipboardCheck className="w-3 h-3" />}
                {card.metaLeft}
              </span>
              <span className="inline-flex items-center gap-2 bg-studio-bg text-studio-green px-3 py-2 rounded-full">
                {card.key === "pre" ? <MapPin className="w-3 h-3" /> : card.key === "session" ? <FileText className="w-3 h-3" /> : card.key === "checkout" ? <MapPin className="w-3 h-3" /> : <ClipboardCheck className="w-3 h-3" />}
                {card.metaRight}
              </span>
            </div>
          </button>
        );
      })}

      <div className="h-8" />
    </main>
  );
}
