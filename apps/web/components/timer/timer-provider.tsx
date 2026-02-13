"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { pauseTimer, resumeTimer, startTimer, syncTimer } from "../../app/(dashboard)/atendimento/[id]/actions";
import { computeElapsedSeconds } from "../../lib/attendance/attendance-domain";

export interface TimerSession {
  appointmentId: string;
  clientName: string;
  serviceName: string;
  startedAt: string;
  totalDurationMinutes: number;
  pausedAt?: string | null;
  pausedTotalSeconds: number;
}

interface BubblePosition {
  x: number;
  y: number;
}

export interface TimerContextValue {
  session: TimerSession | null;
  elapsedSeconds: number;
  remainingSeconds: number;
  progress: number;
  isPaused: boolean;
  startSession: (payload: Omit<TimerSession, "startedAt" | "pausedAt" | "pausedTotalSeconds">) => Promise<void>;
  togglePause: () => Promise<void>;
  stopSession: () => void;
  bubblePosition: BubblePosition | null;
  setBubblePosition: (pos: BubblePosition | null) => void;
  bubbleVisible: boolean;
  setBubbleVisible: (next: boolean) => void;
}

const STORAGE_KEY = "active_appointment_session";
const BUBBLE_KEY = "active_timer_bubble_position";
const BUBBLE_VISIBLE_KEY = "active_timer_bubble_visible";

const TimerContext = createContext<TimerContextValue | null>(null);

function loadSession(): TimerSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TimerSession;
  } catch {
    return null;
  }
}

function saveSession(session: TimerSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function loadBubblePosition(): BubblePosition | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(BUBBLE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BubblePosition;
  } catch {
    return null;
  }
}

function saveBubblePosition(position: BubblePosition | null) {
  if (typeof window === "undefined") return;
  if (!position) {
    window.localStorage.removeItem(BUBBLE_KEY);
    return;
  }
  window.localStorage.setItem(BUBBLE_KEY, JSON.stringify(position));
}

function loadBubbleVisible(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(BUBBLE_VISIBLE_KEY);
  if (!raw) return false;
  return raw === "1";
}

function saveBubbleVisible(value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BUBBLE_VISIBLE_KEY, value ? "1" : "0");
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<TimerSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bubblePosition, setBubblePositionState] = useState<BubblePosition | null>(null);
  const [bubbleVisible, setBubbleVisibleState] = useState(false);
  const syncRef = useRef<number | null>(null);

  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      setSession(stored);
      setElapsedSeconds(
        computeElapsedSeconds({
          startedAt: stored.startedAt,
          pausedAt: stored.pausedAt ?? null,
          pausedTotalSeconds: stored.pausedTotalSeconds,
        })
      );
    }
    setBubblePositionState(loadBubblePosition());
    setBubbleVisibleState(loadBubbleVisible());
  }, []);

  useEffect(() => {
    if (!session) return;
    const interval = window.setInterval(() => {
      const stored = loadSession();
      if (!stored) {
        setSession(null);
        setElapsedSeconds(0);
        return;
      }
      setSession(stored);
      setElapsedSeconds(
        computeElapsedSeconds({
          startedAt: stored.startedAt,
          pausedAt: stored.pausedAt ?? null,
          pausedTotalSeconds: stored.pausedTotalSeconds,
        })
      );
    }, 1000);

    return () => window.clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const scheduleSync = window.setInterval(() => {
      const now = Date.now();
      if (syncRef.current && now - syncRef.current < 30000) return;
      syncRef.current = now;
      const actualSeconds = computeElapsedSeconds({
        startedAt: session.startedAt,
        pausedAt: session.pausedAt ?? null,
        pausedTotalSeconds: session.pausedTotalSeconds,
      });

      syncTimer({
        appointmentId: session.appointmentId,
        timerStatus: session.pausedAt ? "paused" : "running",
        timerStartedAt: session.startedAt,
        timerPausedAt: session.pausedAt ?? null,
        pausedTotalSeconds: session.pausedTotalSeconds,
        plannedSeconds: session.totalDurationMinutes * 60,
        actualSeconds,
      }).catch(() => null);
    }, 30000);

    return () => window.clearInterval(scheduleSync);
  }, [session]);

  const startSession = useCallback(
    async (payload: Omit<TimerSession, "startedAt" | "pausedAt" | "pausedTotalSeconds">) => {
      const next: TimerSession = {
        ...payload,
        startedAt: new Date().toISOString(),
        pausedAt: null,
        pausedTotalSeconds: 0,
      };
      saveSession(next);
      setSession(next);
      setElapsedSeconds(0);
      setBubbleVisibleState(true);
      saveBubbleVisible(true);

      const result = await startTimer({
        appointmentId: payload.appointmentId,
        plannedSeconds: payload.totalDurationMinutes * 60,
      });
      if (!result.ok) {
        console.error("Erro ao iniciar timer:", result.error.message);
      }
    },
    []
  );

  const togglePause = useCallback(async () => {
    if (!session) return;
    if (session.pausedAt) {
      const pausedAt = new Date(session.pausedAt).getTime();
      const now = Date.now();
      const pausedSeconds = Math.floor((now - pausedAt) / 1000);
      const next: TimerSession = {
        ...session,
        pausedAt: null,
        pausedTotalSeconds: session.pausedTotalSeconds + Math.max(0, pausedSeconds),
      };
      saveSession(next);
      setSession(next);
      const result = await resumeTimer({ appointmentId: session.appointmentId });
      if (!result.ok) {
        console.error("Erro ao retomar timer:", result.error.message);
      }
      return;
    }

    const next: TimerSession = { ...session, pausedAt: new Date().toISOString() };
    saveSession(next);
    setSession(next);
    const result = await pauseTimer({ appointmentId: session.appointmentId });
    if (!result.ok) {
      console.error("Erro ao pausar timer:", result.error.message);
    }
  }, [session]);

  const stopSession = useCallback(() => {
    saveSession(null);
    setSession(null);
    setElapsedSeconds(0);
    setBubbleVisibleState(false);
    saveBubbleVisible(false);
  }, []);

  const setBubblePosition = useCallback((pos: BubblePosition | null) => {
    setBubblePositionState(pos);
    saveBubblePosition(pos);
  }, []);

  const setBubbleVisible = useCallback((next: boolean) => {
    setBubbleVisibleState(next);
    saveBubbleVisible(next);
  }, []);

  const totalSeconds = session ? session.totalDurationMinutes * 60 : 0;
  const remainingSeconds = session ? Math.max(0, totalSeconds - elapsedSeconds) : 0;
  const progress = session && totalSeconds > 0 ? Math.min(1, elapsedSeconds / totalSeconds) : 0;

  const value = useMemo<TimerContextValue>(
    () => ({
      session,
      elapsedSeconds,
      remainingSeconds,
      progress,
      isPaused: Boolean(session?.pausedAt),
      startSession,
      togglePause,
      stopSession,
      bubblePosition,
      setBubblePosition,
      bubbleVisible,
      setBubbleVisible,
    }),
    [
      session,
      elapsedSeconds,
      remainingSeconds,
      progress,
      startSession,
      togglePause,
      stopSession,
      bubblePosition,
      setBubblePosition,
      bubbleVisible,
      setBubbleVisible,
    ]
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimerContext() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimerContext must be used within TimerProvider");
  }
  return context;
}
