"use client";

import { useRef } from "react";
import { Home } from "lucide-react";

interface AppointmentCardProps {
  name: string;
  service: string;
  durationLabel?: string | null;
  startLabel: string;
  endLabel?: string;
  status?: string | null;
  paymentStatus?: string | null;
  isHomeVisit: boolean;
  compact?: boolean;
  hasPreBuffer?: boolean;
  hasPostBuffer?: boolean;
  loading?: boolean;
  onOpen: () => void;
  onLongPress?: () => void;
  ["data-card"]?: boolean;
}

const appointmentStatusMap: Record<string, { label: string; dotClass: string }> = {
  pending: { label: "Pendente", dotClass: "bg-amber-400" },
  confirmed: { label: "Confirmado", dotClass: "bg-studio-green" },
  in_progress: { label: "Em andamento", dotClass: "bg-sky-500" },
  completed: { label: "Concluído", dotClass: "bg-emerald-500" },
  no_show: { label: "No-show", dotClass: "bg-red-500" },
};

const paymentStatusMap: Record<string, { label: string; compactLabel: string; className: string; textClass: string }> = {
  paid: { label: "PAGO", compactLabel: "PAGO", className: "bg-emerald-50 text-emerald-700", textClass: "text-emerald-600" },
  partial: { label: "SINAL PAGO", compactLabel: "SINAL", className: "bg-amber-50 text-amber-700", textClass: "text-amber-600" },
  pending: { label: "A RECEBER", compactLabel: "A RECEBER", className: "bg-gray-100 text-gray-500", textClass: "text-gray-500" },
  waived: { label: "LIBERADO", compactLabel: "LIBERADO", className: "bg-sky-50 text-sky-700", textClass: "text-sky-600" },
  refunded: { label: "ESTORNADO", compactLabel: "ESTORN.", className: "bg-slate-100 text-slate-700", textClass: "text-slate-600" },
};

export function AppointmentCard({
  name,
  service,
  durationLabel,
  startLabel,
  endLabel,
  status,
  paymentStatus,
  isHomeVisit,
  compact = false,
  hasPreBuffer = false,
  hasPostBuffer = false,
  loading = false,
  onOpen,
  onLongPress,
  "data-card": dataCard,
}: AppointmentCardProps) {
  const longPressTimeout = useRef<number | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const radiusClass = `rounded-2xl${hasPreBuffer ? " rounded-t-none" : ""}${hasPostBuffer ? " rounded-b-none" : ""}`;
  const statusInfo = status ? appointmentStatusMap[status] : null;
  const statusLabel = statusInfo?.label ?? "Agendado";
  const statusDotClass = statusInfo?.dotClass ?? "bg-gray-300";
  const paymentInfo = paymentStatus ? paymentStatusMap[paymentStatus] : null;
  const paymentLabel = paymentInfo?.label ?? "";
  const paymentCompactLabel = paymentInfo?.compactLabel ?? paymentLabel;
  const paymentClass = paymentInfo?.className ?? "bg-gray-100 text-gray-500";
  const paymentTextClass = paymentInfo?.textClass ?? "text-gray-500";
  const timeRange = endLabel ? `${startLabel} - ${endLabel}` : startLabel;
  const isCompleted = status === "completed";
  const paddingClass = compact ? "p-2" : "p-3";
  const nameClass = compact ? "text-[11px]" : "text-sm";
  const serviceClass = compact ? "text-[10px]" : "text-[11px]";
  const timeClass = compact ? "text-[10px]" : "text-[11px]";
  const statusBadgeClass = compact ? "text-[8px] px-1.5 py-0.5" : "text-[9px] px-2 py-1";
  const gapClass = compact ? "gap-0.5" : "gap-1";
  const homeTagLabel = compact ? "Dom" : "Domicílio";
  const homeTagClass = compact ? "text-[8px] px-1.5 py-0.5" : "text-[9px] px-2 py-0.5";

  const clearLongPress = () => {
    if (longPressTimeout.current) {
      window.clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    startPoint.current = null;
  };

  const triggerLongPress = () => {
    suppressClick.current = true;
    onLongPress?.();
  };

  return (
    <div
      role="button"
      data-card={dataCard ? "" : undefined}
      tabIndex={0}
      onClick={(event) => {
        if (event.defaultPrevented || suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        onOpen();
      }}
      onPointerDown={(event) => {
        if (!onLongPress) return;
        if (event.pointerType === "mouse") return;
        startPoint.current = { x: event.clientX, y: event.clientY };
        longPressTimeout.current = window.setTimeout(() => {
          triggerLongPress();
        }, 500);
      }}
      onPointerMove={(event) => {
        if (!startPoint.current || !longPressTimeout.current) return;
        const dx = Math.abs(event.clientX - startPoint.current.x);
        const dy = Math.abs(event.clientY - startPoint.current.y);
        if (dx > 12 || dy > 12) {
          clearLongPress();
        }
      }}
      onPointerUp={() => {
        clearLongPress();
      }}
      onPointerCancel={() => {
        clearLongPress();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      aria-busy={loading}
      className={`h-full w-full text-left shadow-soft border-l-4 transition group active:scale-[0.99] relative overflow-hidden cursor-pointer ${paddingClass} ${radiusClass} ${
        isCompleted ? "bg-emerald-50/85 ring-1 ring-emerald-200" : "bg-white"
      } ${
        loading ? "opacity-80 cursor-wait" : ""
      } ${isCompleted ? "border-studio-green" : isHomeVisit ? "border-dom" : "border-studio-green"}`}
      style={{
        borderLeftColor: isCompleted
          ? "var(--color-studio-green)"
          : isHomeVisit
            ? "var(--color-dom)"
            : "var(--color-studio-green)",
      }}
    >
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: "rgba(0,0,0,0.1)",
              borderTopColor: isHomeVisit ? "var(--color-dom)" : "var(--color-studio-green)",
            }}
          />
        </div>
      )}
      {compact ? (
        <div className="flex flex-col h-full gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <span className={`w-2 h-2 rounded-full ${statusDotClass}`} title={statusLabel} />
              <h3 className={`font-extrabold text-studio-text leading-tight truncate ${nameClass}`}>{name}</h3>
              {isHomeVisit && (
                <span className={`inline-flex items-center gap-1 rounded-full bg-dom/20 text-dom-strong font-extrabold uppercase tracking-[0.08em] shrink-0 ${homeTagClass}`}>
                  <Home className="w-3 h-3" /> {homeTagLabel}
                </span>
              )}
            </div>
            {paymentCompactLabel && (
              <span className={`text-[9px] font-extrabold uppercase tracking-[0.08em] ${paymentTextClass}`}>
                {paymentCompactLabel}
              </span>
            )}
          </div>

          <div className={`flex items-center justify-between gap-2 text-muted ${timeClass}`}>
            <p className={`font-medium truncate ${serviceClass}`}>
              {service}
              {durationLabel ? ` (${durationLabel})` : ""}
            </p>
            <span className="font-semibold text-studio-text shrink-0">{timeRange}</span>
          </div>
        </div>
      ) : (
        <div className={`flex flex-col h-full ${gapClass}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusDotClass}`} title={statusLabel} />
                <h3 className={`font-extrabold text-studio-text leading-tight line-clamp-1 ${nameClass}`}>{name}</h3>
              </div>
              <p className={`text-muted line-clamp-1 ${serviceClass}`}>
                {service}
                {durationLabel ? ` (${durationLabel})` : ""}
              </p>
            </div>
            {isHomeVisit && (
              <span className={`inline-flex items-center gap-1 rounded-full bg-dom/20 text-dom-strong font-extrabold uppercase tracking-[0.08em] ${homeTagClass}`}>
                <Home className="w-3 h-3" /> {homeTagLabel}
              </span>
            )}
          </div>

          <div className={`mt-auto flex items-center justify-between gap-2 text-muted ${timeClass}`}>
            <span className="font-semibold text-studio-text">{timeRange}</span>
            {paymentLabel && (
              <span className={`inline-flex items-center gap-1 rounded-full font-extrabold uppercase tracking-[0.08em] ${statusBadgeClass} ${paymentClass}`}>
                {paymentLabel}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
