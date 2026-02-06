"use client";

import { useRef } from "react";
import { MessageCircle, MapPin, Phone } from "lucide-react";

interface AppointmentCardProps {
  name: string;
  service: string;
  durationLabel?: string | null;
  statusLabel: string;
  statusTone: string;
  startLabel: string;
  endLabel?: string;
  phone?: string | null;
  isHomeVisit: boolean;
  loading?: boolean;
  onOpen: () => void;
  onWhatsapp?: () => void;
  onMaps?: () => void;
  onLongPress?: () => void;
  ["data-card"]?: boolean;
}

export function AppointmentCard({
  name,
  service,
  durationLabel,
  statusLabel,
  statusTone,
  startLabel,
  endLabel,
  phone,
  isHomeVisit,
  loading = false,
  onOpen,
  onWhatsapp,
  onMaps,
  onLongPress,
  "data-card": dataCard,
}: AppointmentCardProps) {
  const longPressTimeout = useRef<number | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

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
      className={`h-full w-full text-left bg-white p-4 rounded-3xl shadow-soft border-l-4 transition group active:scale-[0.99] relative overflow-hidden cursor-pointer ${
        isHomeVisit ? "border-purple-500" : "border-studio-green"
      } ${loading ? "opacity-80 cursor-wait" : ""}`}
    >
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-studio-green/40 border-t-studio-green rounded-full animate-spin" />
        </div>
      )}
      <div className="flex flex-col h-full gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-extrabold text-studio-text text-sm leading-tight line-clamp-1">{name}</h3>
            <p className="text-xs text-muted line-clamp-1">
              {service}
              {durationLabel ? ` (${durationLabel})` : ""}
            </p>
          </div>
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full ${
              isHomeVisit ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
            }`}
          >
            {isHomeVisit ? "Domicílio" : "Estúdio"}
          </span>
        </div>

        <div className="border-t border-line pt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-muted flex-wrap">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] px-2 py-1 rounded-full ${statusTone}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current inline-block"></span>
              {statusLabel}
            </span>
            <span className="font-semibold">
              {startLabel}
              {endLabel ? ` – ${endLabel}` : ""}
            </span>
            {phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3 h-3" /> {phone}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onWhatsapp && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onWhatsapp();
                }}
                className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center transition active:scale-95 active:bg-studio-green/10"
                aria-label="Abrir WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            )}
            {onMaps && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onMaps();
                }}
                className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center transition active:scale-95 active:bg-studio-green/10"
                aria-label="Abrir GPS"
              >
                <MapPin className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
