"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronRight, Loader2 } from "lucide-react";

interface SlideConfirmButtonProps {
  label: string;
  hint: string;
  onConfirm: () => Promise<void> | void;
  disabled?: boolean;
}

const TRACK_PADDING = 5;
const HANDLE_SIZE = 40;
const TRIGGER_THRESHOLD = 0.72;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function SlideConfirmButton({
  label,
  hint,
  onConfirm,
  disabled = false,
}: SlideConfirmButtonProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startPos: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startPos: 0,
  });

  const [trackWidth, setTrackWidth] = useState(0);
  const [handlePos, setHandlePos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxPos = useMemo(
    () => Math.max(trackWidth - HANDLE_SIZE - TRACK_PADDING * 2, 0),
    [trackWidth]
  );
  const busy = disabled || isSubmitting;
  const traveled = Math.max(0, handlePos);
  const completion = maxPos === 0 ? 0 : traveled / maxPos;
  const isReady = completion >= TRIGGER_THRESHOLD;

  useEffect(() => {
    const updateWidth = () => {
      const width = trackRef.current?.getBoundingClientRect().width ?? 0;
      setTrackWidth(width);
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    if (isDragging || busy) return;
    setHandlePos(0);
  }, [maxPos, isDragging, busy]);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragRef.current.startX;
    const nextPos = clamp(dragRef.current.startPos + deltaX, 0, maxPos);
    setHandlePos(nextPos);
    event.preventDefault();
  };

  const finishDrag = async (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current.active = false;
    dragRef.current.pointerId = null;
    setIsDragging(false);

    if (trackRef.current?.hasPointerCapture(event.pointerId)) {
      trackRef.current.releasePointerCapture(event.pointerId);
    }

    const completionAtRelease = maxPos === 0 ? 0 : handlePos / maxPos;
    if (completionAtRelease < TRIGGER_THRESHOLD) {
      setHandlePos(0);
      return;
    }

    setHandlePos(maxPos);
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
      setHandlePos(0);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (busy) return;
    dragRef.current.active = true;
    dragRef.current.pointerId = event.pointerId;
    dragRef.current.startX = event.clientX;
    dragRef.current.startPos = handlePos;
    setIsDragging(true);
    trackRef.current?.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  return (
    <div className="relative h-14 w-full touch-none select-none rounded-2xl border border-studio-green/35 bg-studio-green/10 p-1">
      <div
        ref={trackRef}
        className="relative h-full w-full touch-none rounded-xl bg-gradient-to-r from-studio-green/20 to-studio-green/5"
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onDragStart={(event) => event.preventDefault()}
      >
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-14 text-center"
        >
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-studio-green">{label}</p>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted">{hint}</p>
        </div>

        <button
          type="button"
          onPointerDown={handlePointerDown}
          disabled={busy}
          className={`absolute top-1/2 -translate-y-1/2 flex h-10 w-10 touch-none items-center justify-center rounded-lg border border-studio-green/25 bg-white text-studio-green shadow-soft transition-transform ${
            busy ? "cursor-not-allowed opacity-70" : "cursor-grab active:cursor-grabbing"
          }`}
          style={{ left: TRACK_PADDING + handlePos }}
          aria-label={label}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className={`h-5 w-5 ${isReady ? "animate-pulse" : ""}`} />
          )}
        </button>
      </div>
    </div>
  );
}
