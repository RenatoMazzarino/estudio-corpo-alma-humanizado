"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Pause, Play } from "lucide-react";
import { useTimer } from "./use-timer";

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const prefix = hours > 0 ? `${hours.toString().padStart(2, "0")}:` : "";
  return `${prefix}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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
  } = useTimer();
  const pathname = usePathname();
  const router = useRouter();
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ offsetX: number; offsetY: number; dragging: boolean }>({
    offsetX: 0,
    offsetY: 0,
    dragging: false,
  });
  const [mounted, setMounted] = useState(false);

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
  }, [bubblePosition, setBubblePosition]);

  useEffect(() => {
    function handleMove(event: PointerEvent) {
      if (!dragState.current.dragging || !bubbleRef.current) return;
      const parent = bubbleRef.current.parentElement;
      if (!parent) return;
      const parentRect = parent.getBoundingClientRect();
      const rect = bubbleRef.current.getBoundingClientRect();
      const bottomNavOffset = pathname.startsWith("/atendimento") ? 140 : 96;
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
  }, [setBubblePosition]);

  if (!mounted || !session) return null;

  const showBubble = bubbleVisible || !pathname.startsWith("/atendimento");
  if (!showBubble) return null;

  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div
      ref={bubbleRef}
      className={`absolute z-40 h-[112px] w-[112px] rounded-full shadow-float backdrop-blur-md border border-studio-green/20 bg-white/80 ${
        session && !isPaused
          ? "after:content-[''] after:absolute after:inset-[-6px] after:rounded-full after:border-2 after:border-studio-green/30 after:animate-pulse"
          : ""
      }`}
      style={bubblePosition ? { left: bubblePosition.x, top: bubblePosition.y } : undefined}
      onPointerDown={(event) => {
        if (!bubbleRef.current) return;
        const target = event.target as HTMLElement;
        if (target.closest("button")) return;
        const rect = bubbleRef.current.getBoundingClientRect();
        dragState.current.dragging = true;
        dragState.current.offsetX = event.clientX - rect.left;
        dragState.current.offsetY = event.clientY - rect.top;
      }}
    >
      <svg className="absolute inset-0" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(106,128,108,0.16)"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(106,128,108,0.95)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <div className="flex items-center gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              togglePause();
            }}
            className="w-9 h-9 rounded-2xl bg-studio-light text-studio-green flex items-center justify-center border border-studio-green/10 hover:bg-white transition"
            aria-label={isPaused ? "Retomar" : "Pausar"}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <span className="text-lg font-black text-studio-text tabular-nums">{formatTime(elapsedSeconds)}</span>
        </div>
        <button
          onClick={() => router.push(`/atendimento/${session.appointmentId}?stage=session`)}
          className="text-[10px] font-extrabold text-muted uppercase tracking-widest hover:text-studio-green transition"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
