import { useEffect, useState } from "react";

export interface ActiveSession {
  appointmentId: string;
  clientName: string;
  serviceName: string;
  startedAt: string;
  totalDurationMinutes: number;
  pausedAt?: string | null;
  pausedTotalSeconds: number;
}

const STORAGE_KEY = "active_appointment_session";

function loadSession(): ActiveSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveSession;
  } catch {
    return null;
  }
}

function saveSession(session: ActiveSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function computeElapsedSeconds(session: ActiveSession) {
  const now = Date.now();
  const startedAt = new Date(session.startedAt).getTime();
  const pausedAt = session.pausedAt ? new Date(session.pausedAt).getTime() : null;
  const pausedDuration = session.pausedTotalSeconds * 1000;
  const activeDuration = pausedAt ? pausedAt - startedAt : now - startedAt;
  const elapsed = Math.max(0, activeDuration - pausedDuration);
  return Math.floor(elapsed / 1000);
}

export function useActiveSession() {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      setSession(stored);
      setElapsedSeconds(computeElapsedSeconds(stored));
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      const next = loadSession();
      if (!next) {
        setSession(null);
        setElapsedSeconds(0);
        return;
      }
      setSession(next);
      setElapsedSeconds(computeElapsedSeconds(next));
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const startSession = (payload: Omit<ActiveSession, "startedAt" | "pausedAt" | "pausedTotalSeconds">) => {
    const next: ActiveSession = {
      ...payload,
      startedAt: new Date().toISOString(),
      pausedAt: null,
      pausedTotalSeconds: 0,
    };
    saveSession(next);
    setSession(next);
    setElapsedSeconds(0);
  };

  const togglePause = () => {
    if (!session) return;
    if (session.pausedAt) {
      const pausedAt = new Date(session.pausedAt).getTime();
      const now = Date.now();
      const pausedSeconds = Math.floor((now - pausedAt) / 1000);
      const next: ActiveSession = {
        ...session,
        pausedAt: null,
        pausedTotalSeconds: session.pausedTotalSeconds + pausedSeconds,
      };
      saveSession(next);
      setSession(next);
      return;
    }
    const next: ActiveSession = { ...session, pausedAt: new Date().toISOString() };
    saveSession(next);
    setSession(next);
  };

  const stopSession = () => {
    saveSession(null);
    setSession(null);
    setElapsedSeconds(0);
  };

  const totalSeconds = session ? session.totalDurationMinutes * 60 : 0;
  const remainingSeconds = session ? Math.max(0, totalSeconds - elapsedSeconds) : 0;
  const progress = session && totalSeconds > 0 ? Math.min(1, elapsedSeconds / totalSeconds) : 0;

  const isPaused = Boolean(session?.pausedAt);

  return {
    session,
    elapsedSeconds,
    remainingSeconds,
    progress,
    isPaused,
    startSession,
    togglePause,
    stopSession,
  };
}
