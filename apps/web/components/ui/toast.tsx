"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastTone = "success" | "error" | "info";

type ToastState = {
  message: string;
  tone: ToastTone;
};

const toneStyles: Record<ToastTone, string> = {
  success: "bg-studio-green text-white",
  error: "bg-red-500 text-white",
  info: "bg-studio-text text-white",
};

export function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-float text-xs font-semibold z-50 ${toneStyles[toast.tone]}`}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
}

export function useToast(duration = 1800) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearToast = useCallback(() => {
    setToast(null);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
    setToast({ message, tone });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(null), duration);
    },
    [duration]
  );

  useEffect(() => () => clearToast(), [clearToast]);

  return { toast, showToast, clearToast };
}
