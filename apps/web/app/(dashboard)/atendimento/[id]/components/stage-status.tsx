"use client";

import { Check, Clock3, Lock, Unlock } from "lucide-react";
import type { ReactNode } from "react";
import type { StageStatus } from "../../../../../lib/attendance/attendance-types";

const statusMap: Record<StageStatus, { label: string; className: string; icon: ReactNode }> = {
  done: {
    label: "Ok",
    className: "bg-ok/10 text-ok border-ok/20",
    icon: <Check className="w-3 h-3" />,
  },
  available: {
    label: "Liberada",
    className: "bg-studio-light text-studio-green border-studio-green/20",
    icon: <Unlock className="w-3 h-3" />,
  },
  in_progress: {
    label: "Em andamento",
    className: "bg-warn/10 text-warn border-warn/20",
    icon: <Clock3 className="w-3 h-3" />,
  },
  locked: {
    label: "Bloqueada",
    className: "bg-studio-light text-muted border-line",
    icon: <Lock className="w-3 h-3" />,
  },
  skipped: {
    label: "Pulada",
    className: "bg-studio-light text-muted border-line",
    icon: <Lock className="w-3 h-3" />,
  },
};

const compactMap: Record<StageStatus, { label: string; className: string }> = {
  done: {
    label: "OK",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  available: {
    label: "PENDENTE",
    className: "bg-gray-50 text-gray-500 border-gray-100",
  },
  in_progress: {
    label: "EM ANDAMENTO",
    className: "bg-amber-50 text-amber-700 border-amber-100",
  },
  locked: {
    label: "BLOQUEADA",
    className: "bg-gray-50 text-gray-400 border-gray-100",
  },
  skipped: {
    label: "PULADA",
    className: "bg-gray-50 text-gray-400 border-gray-100",
  },
};

export function StageStatusBadge({
  status,
  variant = "default",
}: {
  status: StageStatus;
  variant?: "default" | "compact";
}) {
  if (variant === "compact") {
    const meta = compactMap[status];
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-2xl text-[11px] font-extrabold uppercase border ${meta.className}`}>
        {meta.label}
      </span>
    );
  }

  const meta = statusMap[status];
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${meta.className}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}
