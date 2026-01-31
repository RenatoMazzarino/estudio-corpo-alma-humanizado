"use client";

import Link from "next/link";
import { Pause, Play, Timer } from "lucide-react";
import { useActiveSession } from "../src/shared/timer/useActiveSession";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hh = hours > 0 ? `${hours.toString().padStart(2, "0")}:` : "";
  return `${hh}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function ActiveSessionBar() {
  const { session, remainingSeconds, progress, isPaused, togglePause } = useActiveSession();
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ offsetX: number; offsetY: number; dragging: boolean }>({
    offsetX: 0,
    offsetY: 0,
    dragging: false,
  });

  useEffect(() => {
    if (!barRef.current) return;
    const parent = barRef.current.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const rect = barRef.current.getBoundingClientRect();
    if (!pos) {
      setPos({
        x: Math.max(12, parentRect.width - rect.width - 12),
        y: Math.max(12, parentRect.height - rect.height - 96),
      });
    }
  }, [pos]);

  useEffect(() => {
    function handleMove(event: PointerEvent) {
      if (!dragState.current.dragging || !barRef.current) return;
      const parent = barRef.current.parentElement;
      if (!parent) return;
      const parentRect = parent.getBoundingClientRect();
      const rect = barRef.current.getBoundingClientRect();
      const nextX = Math.min(
        Math.max(8, event.clientX - parentRect.left - dragState.current.offsetX),
        parentRect.width - rect.width - 8
      );
      const nextY = Math.min(
        Math.max(8, event.clientY - parentRect.top - dragState.current.offsetY),
        parentRect.height - rect.height - 8
      );
      setPos({ x: nextX, y: nextY });
    }

    function handleUp() {
      dragState.current.dragging = false;
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  if (!session || pathname.startsWith("/atendimento")) return null;

  return (
    <div
      ref={barRef}
      className="absolute z-40 w-[92%] max-w-[520px]"
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      onPointerDown={(event) => {
        if (!barRef.current) return;
        const target = event.target as HTMLElement;
        if (target.closest("a,button")) return;
        const rect = barRef.current.getBoundingClientRect();
        dragState.current.dragging = true;
        dragState.current.offsetX = event.clientX - rect.left;
        dragState.current.offsetY = event.clientY - rect.top;
      }}
    >
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
