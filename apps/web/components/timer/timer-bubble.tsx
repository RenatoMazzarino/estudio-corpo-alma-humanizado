"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MoveUpRight, Pause, Play, X } from "lucide-react";
import { useTimer } from "./use-timer";
import { TimerProgressRing } from "./timer-progress-ring";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatTimeSigned(totalSeconds: number) {
  const isNegative = totalSeconds < 0;
  const absolute = Math.abs(totalSeconds);
  const hours = Math.floor(absolute / 3600);
  const minutes = Math.floor((absolute % 3600) / 60);
  const seconds = absolute % 60;
  const prefix = isNegative ? "-" : "";
  const hourChunk = hours > 0 ? `${hours.toString().padStart(2, "0")}:` : "";
  return `${prefix}${hourChunk}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function TimerBubble() {
  const {
    session,
    elapsedSeconds,
    progress,
    isPaused,
    togglePause,
    bubblePosition,
    setBubblePosition,
    bubbleVisible,
    setBubbleVisible,
  } = useTimer();
  const pathname = usePathname();
  const router = useRouter();
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ offsetX: number; offsetY: number; dragging: boolean; pointerId: number | null }>({
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    pointerId: null,
  });

  const [mounted, setMounted] = useState(false);

  const showBubble = Boolean(session && bubbleVisible);

  const totalSeconds = session ? Math.max(1, session.totalDurationMinutes * 60) : 1;
  const currentElapsed = session ? elapsedSeconds : 0;
  const remainingSeconds = totalSeconds - currentElapsed;
  const isOvertime = remainingSeconds < 0;
  const ringProgress = session ? progress : 0;
  const paused = Boolean(session?.pausedAt) || isPaused;

  const title = paused ? "Sessão pausada" : "Sessão ativa";
  const subtitle = isOvertime ? "Tempo excedido" : "Tempo restante";
  const timeLabel = formatTimeSigned(remainingSeconds);
  const sessionPath = session?.appointmentId ? `/atendimento/${session.appointmentId}` : null;
  const canOpenSession = Boolean(sessionPath && !pathname.startsWith(sessionPath));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!bubbleRef.current) return;
    if (bubblePosition) return;
    const parent = bubbleRef.current.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const rect = bubbleRef.current.getBoundingClientRect();
    setBubblePosition({
      x: Math.max(12, parentRect.width - rect.width - 16),
      y: Math.max(12, parentRect.height - rect.height - 120),
    });
  }, [bubblePosition, setBubblePosition, showBubble]);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current.dragging || !bubbleRef.current) return;
    if (dragState.current.pointerId !== event.pointerId) return;
    const parent = bubbleRef.current.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const rect = bubbleRef.current.getBoundingClientRect();
    const bottomNavOffset = pathname.startsWith("/atendimento") ? 120 : 8;
    const nextX = clamp(
      event.clientX - parentRect.left - dragState.current.offsetX,
      8,
      parentRect.width - rect.width - 8
    );
    const nextY = clamp(
      event.clientY - parentRect.top - dragState.current.offsetY,
      8,
      parentRect.height - rect.height - bottomNavOffset
    );
    setBubblePosition({ x: nextX, y: nextY });
    event.preventDefault();
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragState.current.pointerId !== event.pointerId) return;
    dragState.current.dragging = false;
    dragState.current.pointerId = null;
    if (bubbleRef.current?.hasPointerCapture(event.pointerId)) {
      bubbleRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const handleTogglePause = () => {
    if (!session) return;
    void togglePause();
  };

  const handleClose = () => {
    setBubbleVisible(false);
  };

  if (!mounted || !showBubble) return null;

  return (
    <div
      ref={bubbleRef}
      className="absolute z-40 w-44 touch-none select-none rounded-[30px] border border-studio-green/20 bg-white/95 p-3 shadow-float backdrop-blur-md"
      style={bubblePosition ? { left: bubblePosition.x, top: bubblePosition.y } : undefined}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button")) return;
        if (!bubbleRef.current) return;
        const rect = bubbleRef.current.getBoundingClientRect();
        dragState.current.dragging = true;
        dragState.current.pointerId = event.pointerId;
        dragState.current.offsetX = event.clientX - rect.left;
        dragState.current.offsetY = event.clientY - rect.top;
        bubbleRef.current.setPointerCapture(event.pointerId);
        event.preventDefault();
      }}
      onDragStart={(event) => event.preventDefault()}
    >
      <button
        type="button"
        onClick={handleClose}
        onPointerDown={(event) => event.stopPropagation()}
        className="absolute -top-2.5 -right-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white text-muted shadow-soft"
        aria-label="Fechar contador"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">{title}</p>
      </div>

      <div className="mt-2 flex justify-center">
        <TimerProgressRing progress={ringProgress} pulseActive={!paused}>
          <div className="text-center">
            <p
              className={`text-2xl font-black tabular-nums leading-none ${
                isOvertime ? "text-red-600" : "text-studio-text"
              }`}
            >
              {timeLabel}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{subtitle}</p>
          </div>
        </TimerProgressRing>
      </div>

      {canOpenSession && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            router.push(sessionPath!);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-paper text-[10px] font-extrabold uppercase tracking-[0.12em] text-studio-green"
        >
          Voltar ao atendimento
          <MoveUpRight className="h-3 w-3" />
        </button>
      )}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          handleTogglePause();
        }}
        onPointerDown={(event) => event.stopPropagation()}
        className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-studio-green/20 bg-studio-light text-[11px] font-extrabold uppercase tracking-wider text-studio-green"
      >
        {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        {paused ? "Retomar" : "Pausar"}
      </button>
    </div>
  );
}
