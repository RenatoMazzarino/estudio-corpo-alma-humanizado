"use client";

import { Check, Clock3, Lock, Unlock } from "lucide-react";
import type { ReactNode } from "react";
import type { StageStatus } from "../../../../../lib/attendance/attendance-types";

const statusMap: Record<StageStatus, { label: string; className: string; icon: ReactNode }> = {
  done: {
    label: "Ok",
    className: "bg-green-50 text-green-700 border-green-200",
    icon: <Check className="w-3 h-3" />,
  },
  available: {
    label: "Liberada",
    className: "bg-studio-bg text-studio-green border-studio-green/20",
    icon: <Unlock className="w-3 h-3" />,
  },
  in_progress: {
    label: "Em andamento",
    className: "bg-orange-50 text-orange-600 border-orange-200",
    icon: <Clock3 className="w-3 h-3" />,
  },
  locked: {
    label: "Bloqueada",
    className: "bg-slate-50 text-slate-400 border-slate-200",
    icon: <Lock className="w-3 h-3" />,
  },
  skipped: {
    label: "Pulada",
    className: "bg-slate-50 text-slate-400 border-slate-200",
    icon: <Lock className="w-3 h-3" />,
  },
};

export function StageStatusBadge({ status }: { status: StageStatus }) {
  const meta = statusMap[status];
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${meta.className}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}
