"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";

type ActionTone = "green" | "danger" | "neutral" | "gray";

export interface FloatingActionItem {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  helper?: string;
  tone?: ActionTone;
}

interface FloatingActionMenuProps {
  actions: FloatingActionItem[];
  rightClassName?: string;
  bottomOffset?: string;
}

const toneStyles: Record<ActionTone, { pill: string; icon: string }> = {
  green: {
    pill: "bg-white border border-line hover:bg-studio-green/10",
    icon: "bg-studio-light text-studio-green group-hover:bg-studio-green group-hover:text-white",
  },
  danger: {
    pill: "bg-white border border-line hover:bg-red-50",
    icon: "bg-red-100 text-red-500 group-hover:bg-red-500 group-hover:text-white",
  },
  neutral: {
    pill: "bg-white border border-line hover:bg-studio-green/10",
    icon: "bg-studio-bg text-studio-green group-hover:bg-studio-green group-hover:text-white",
  },
  gray: {
    pill: "bg-white border border-line",
    icon: "bg-stone-100 text-stone-400",
  },
};

export function FloatingActionMenu({
  actions,
  rightClassName = "right-3",
  bottomOffset = "calc(var(--nav-height) + 28px)",
}: FloatingActionMenuProps) {
  const [overlayEl, setOverlayEl] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOverlayEl(document.getElementById("app-overlay"));
  }, []);

  if (!overlayEl) return null;

  return createPortal(
    <>
      {open && (
        <button
          type="button"
          aria-label="Fechar menu flutuante"
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-black/70 z-40 pointer-events-auto"
        />
      )}

      <div
        className={`absolute ${rightClassName} z-50 pointer-events-none w-fit`}
        style={{ bottom: bottomOffset }}
      >
        {open && (
          <div className="absolute bottom-14 right-0 flex flex-col items-end gap-3 transition-all duration-200 pointer-events-auto">
            {actions.map((action) => {
              const tone = action.disabled ? "gray" : action.tone ?? "green";
              const styles = toneStyles[tone];
              return (
                <button
                  key={action.label}
                  onClick={() => {
                    if (action.disabled) return;
                    setOpen(false);
                    action.onClick?.();
                  }}
                  className={`group flex items-center gap-3 pl-4 pr-2 py-2 rounded-full shadow-float transition pointer-events-auto ${
                    styles.pill
                  } ${action.disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                  type="button"
                  disabled={action.disabled}
                >
                  <div className="flex flex-col items-end leading-tight">
                    <span className="text-sm font-extrabold text-studio-text">{action.label}</span>
                    {action.helper && (
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">
                        {action.helper}
                      </span>
                    )}
                  </div>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition ${styles.icon}`}
                  >
                    {action.icon}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={() => setOpen((prev) => !prev)}
          className="w-11 h-11 bg-studio-green text-white rounded-full shadow-xl shadow-green-100 flex items-center justify-center z-50 hover:scale-105 transition active:scale-95 pointer-events-auto"
          type="button"
        >
          {open ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>
    </>,
    overlayEl
  );
}
