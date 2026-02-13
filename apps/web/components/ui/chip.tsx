"use client";

import { ReactNode } from "react";

type ChipTone = "default" | "success" | "warning" | "danger" | "dom";

interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
}

const toneClasses: Record<ChipTone, string> = {
  default: "bg-studio-light text-studio-green",
  success: "bg-emerald-50 text-ok",
  warning: "bg-amber-50 text-warn",
  danger: "bg-red-50 text-danger",
  dom: "bg-dom/20 text-dom-strong",
};

export function Chip({ children, tone = "default", className = "" }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
