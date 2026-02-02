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
      const bottomNavOffset = 96;
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

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div
      ref={bubbleRef}
      className={`absolute z-40 h-[92px] w-[92px] rounded-full shadow-float backdrop-blur-md ${
        session && !isPaused
          ? "after:content-[''] after:absolute after:inset-[-6px] after:rounded-full after:border-2 after:border-studio-green/40 after:animate-ping"
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
      onClick={() => {
        if (!session) return;
        router.push(`/atendimento/${session.appointmentId}?stage=session`);
      }}
    >
      <svg className="absolute inset-0" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(106,128,108,0.2)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(106,128,108,0.95)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
      </svg>

      <div className="absolute inset-[9px] rounded-full bg-studio-green text-white flex flex-col items-center justify-center">
        <div className="text-[9px] font-extrabold uppercase tracking-widest opacity-80 -mb-0.5">Tempo</div>
        <div className="text-lg font-black tabular-nums tracking-tighter leading-none">
          {formatTime(elapsedSeconds)}
        </div>
        <button
          onClick={(event) => {
            event.stopPropagation();
            togglePause();
          }}
          className="mt-1 w-8 h-8 rounded-full bg-white/15 hover:bg-white/20 transition flex items-center justify-center"
          aria-label={isPaused ? "Retomar" : "Pausar"}
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
        </button>
      </div>
    </div>
  );
}
