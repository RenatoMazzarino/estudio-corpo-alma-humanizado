"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export type ToastTone = "success" | "error" | "info" | "warning";
export type ToastKind = "toast" | "banner";

export type ToastInput = {
  id?: string;
  title?: string;
  message: string;
  tone?: ToastTone;
  kind?: ToastKind;
  durationMs?: number;
};

type ToastState = {
  id?: string;
  title?: string;
  message: string;
  tone: ToastTone;
  kind: ToastKind;
  durationMs: number;
};

const toastToneStyles: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-stone-200 bg-white text-studio-text",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

const bannerToneStyles: Record<ToastTone, string> = {
  success: "border-studio-green/20 bg-green-50 text-studio-green",
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-stone-200 bg-white text-studio-text",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

const toneIcon: Record<ToastTone, ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

export function Toast({ toast }: { toast: ToastState | null }) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(() => {
    if (typeof document === "undefined") return null;
    return document.getElementById("app-frame") ?? document.body;
  });

  useEffect(() => {
    setPortalTarget(document.getElementById("app-frame") ?? document.body);
  }, []);

  if (!toast) return null;

  const positionClass = portalTarget?.id === "app-frame" ? "absolute" : "fixed";
  const Icon = toneIcon[toast.tone];
  if (toast.kind === "banner") {
    const bannerNode = (
      <div className={`${positionClass} left-1/2 top-4 z-90 w-[calc(100%-1rem)] max-w-[520px] -translate-x-1/2 px-1`}>
        <div
          className={`rounded-2xl border px-4 py-3 shadow-float ${bannerToneStyles[toast.tone]}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2.5">
            <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0" />
            <div className="min-w-0">
              {toast.title ? (
                <p className="text-[11px] font-extrabold uppercase tracking-wide">{toast.title}</p>
              ) : null}
              <p className="text-sm font-semibold leading-snug">{toast.message}</p>
            </div>
          </div>
        </div>
      </div>
    );

    return portalTarget ? createPortal(bannerNode, portalTarget) : bannerNode;
  }

  const toastNode = (
    <div
      className={`${positionClass} left-1/2 top-4 z-90 w-[calc(100%-1rem)] max-w-[520px] -translate-x-1/2 px-1`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 shadow-float ${toastToneStyles[toast.tone]}`}
      >
        <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0" />
        <div className="min-w-0">
          {toast.title ? (
            <p className="text-[11px] font-extrabold uppercase tracking-wide">{toast.title}</p>
          ) : null}
          <p className="text-sm font-semibold leading-snug">{toast.message}</p>
        </div>
      </div>
    </div>
  );

  return portalTarget ? createPortal(toastNode, portalTarget) : toastNode;
}

export function useToast(duration = 2200) {
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
    (input: string | ToastInput, tone: ToastTone = "info") => {
      const nextToast: ToastState =
        typeof input === "string"
          ? { message: input, tone, kind: "banner", durationMs: duration }
          : {
              id: input.id,
              title: input.title,
              message: input.message,
              tone: input.tone ?? tone,
              kind: input.kind ?? "banner",
              durationMs: input.durationMs ?? duration,
            };

      setToast(nextToast);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (nextToast.durationMs > 0) {
        timerRef.current = window.setTimeout(() => setToast(null), nextToast.durationMs);
      } else {
        timerRef.current = null;
      }
    },
    [duration]
  );

  useEffect(() => () => clearToast(), [clearToast]);

  return { toast, showToast, clearToast };
}
