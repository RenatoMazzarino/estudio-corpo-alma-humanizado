"use client";

import Link from "next/link";
import { Pause, Play, Timer } from "lucide-react";
import { useActiveSession } from "../src/shared/timer/useActiveSession";

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hh = hours > 0 ? `${hours.toString().padStart(2, "0")}:` : "";
  return `${hh}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function ActiveSessionBar() {
  const { session, remainingSeconds, progress, isPaused, togglePause } = useActiveSession();

  if (!session) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[92%] max-w-[520px] z-40">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-studio-green/10 text-studio-green flex items-center justify-center">
          <Timer size={18} />
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-400">Atendimento em andamento</div>
          <div className="text-sm font-bold text-gray-800 truncate">
            {session.clientName} • {session.serviceName}
          </div>
          <div className="mt-2 h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-studio-green transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono font-bold text-gray-700">{formatTime(remainingSeconds)}</div>
          <Link
            href={`/atendimento/${session.appointmentId}`}
            className="text-[11px] text-studio-green font-bold hover:underline"
          >
            Abrir
          </Link>
        </div>
        <button
          onClick={togglePause}
          className={`w-9 h-9 rounded-full flex items-center justify-center ${
            isPaused ? "bg-studio-green text-white" : "bg-stone-100 text-stone-500"
          }`}
          aria-label={isPaused ? "Retomar" : "Pausar"}
        >
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      </div>
    </div>
  );
}
