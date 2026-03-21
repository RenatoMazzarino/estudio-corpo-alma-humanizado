"use client";

import { useRef } from "react";
import { Home, MoreHorizontal } from "lucide-react";

interface AppointmentCardProps {
  name: string;
  service: string;
  startLabel: string;
  endLabel?: string;
  status?: string | null;
  paymentStatus?: string | null;
  isHomeVisit: boolean;
  price?: number | null;
  isVip?: boolean;
  durationMinutes?: number;
  loading?: boolean;
  onOpenAction: () => void;
  onLongPressAction?: () => void;
  ["data-card"]?: boolean;
}

const paymentStatusMap: Record<
  string,
  { label: string; dotClass: string; textClass: string }
> = {
  paid: {
    label: "Pago",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-600",
  },
  partial: {
    label: "Sinal Pago",
    dotClass: "bg-amber-500",
    textClass: "text-amber-600",
  },
  pending: {
    label: "A Receber",
    dotClass: "bg-amber-500",
    textClass: "text-amber-600",
  },
  waived: {
    label: "Cortesia",
    dotClass: "bg-sky-500",
    textClass: "text-sky-600",
  },
  refunded: {
    label: "Estornado",
    dotClass: "bg-slate-500",
    textClass: "text-slate-600",
  },
};

const paymentShortLabelMap: Record<string, string> = {
  paid: "Pago",
  partial: "Sinal",
  pending: "A receber",
  waived: "Cortesia",
  refunded: "Estorno",
};

function formatPriceLabel(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "R$ --";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function AppointmentCard({
  name,
  service,
  startLabel,
  endLabel,
  paymentStatus,
  isHomeVisit,
  price,
  isVip = false,
  durationMinutes = 60,
  loading = false,
  onOpenAction,
  onLongPressAction,
  "data-card": dataCard,
}: AppointmentCardProps) {
  const longPressTimeout = useRef<number | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const paymentInfo = paymentStatus ? paymentStatusMap[paymentStatus] : null;
  const paymentLabel = paymentInfo?.label ?? "A Receber";
  const paymentShortLabel = paymentShortLabelMap[paymentStatus ?? "pending"] ?? "A receber";
  const paymentDotClass = paymentInfo?.dotClass ?? "bg-amber-500";
  const paymentTextClass = paymentInfo?.textClass ?? "text-amber-600";
  const accentColor = isHomeVisit ? "var(--color-dom)" : "var(--color-studio-green)";
  const density =
    durationMinutes <= 30
      ? "micro"
      : durationMinutes <= 45
        ? "tight"
        : durationMinutes <= 75
          ? "compact"
          : "full";

  const wrapperPadding =
    density === "micro"
      ? "px-2 py-1.5"
      : density === "tight"
        ? "px-2.5 py-2"
        : density === "compact"
          ? "px-3 py-2.5"
          : "px-3.5 py-3";

  const nameClass =
    density === "micro"
      ? "wl-typo-card-name-xs"
      : density === "tight"
        ? "wl-typo-card-name-sm"
        : density === "compact"
          ? "wl-typo-card-name-md"
          : "wl-typo-card-name-lg";

  const serviceClass = "wl-typo-card-service";
  const timeClass = "wl-typo-card-time";
  const priceClass = density === "micro" ? "wl-typo-card-status" : "wl-typo-card-price";
  const paymentClass = "wl-typo-card-status";
  const vipClass =
    density === "full"
      ? "wl-typo-chip inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-600"
      : "wl-typo-chip inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-600";
  const homeIconSizeClass = density === "micro" ? "h-3 w-3" : "h-3.5 w-3.5";
  const homeChipSizeClass =
    density === "micro" ? "inline-flex h-5 w-5 items-center justify-center" : "inline-flex h-6 w-6 items-center justify-center";
  const showMetaRow = density !== "micro";
  const showService = density !== "micro" && density !== "tight";
  const showDivider = density === "compact" || density === "full";
  const showPaymentLabel = density !== "micro";
  const timeRange = endLabel ? `${startLabel} - ${endLabel}` : startLabel;

  const clearLongPress = () => {
    if (longPressTimeout.current) {
      window.clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    startPoint.current = null;
  };

  const triggerLongPress = () => {
    suppressClick.current = true;
    onLongPressAction?.();
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
        onOpenAction();
      }}
      onPointerDown={(event) => {
        if (!onLongPressAction) return;
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
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenAction();
        }
      }}
      aria-busy={loading}
      className={`relative h-full min-h-0 w-full overflow-hidden rounded-xl border border-line border-l-4 bg-white ${wrapperPadding} shadow-soft transition active:scale-[0.99] ${
        loading ? "opacity-75 cursor-wait" : "cursor-pointer"
      }`}
      style={{ borderLeftColor: accentColor }}
    >
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/10 border-t-studio-green" />
        </div>
      )}

      <div className="flex h-full min-h-0 flex-col justify-between">
        {showMetaRow ? (
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {isVip ? (
                <span className={vipClass}>
                  <Home className="h-2.5 w-2.5" /> VIP
                </span>
              ) : null}
              {isHomeVisit ? (
                <span
                  className={`${homeChipSizeClass} rounded-md border border-dom/35 bg-dom/15 text-dom-strong`}
                  title="Domicilio"
                  aria-label="Domicilio"
                >
                  <Home className={homeIconSizeClass} />
                </span>
              ) : null}
            </div>
            <MoreHorizontal className="h-4 w-4 shrink-0 text-muted" />
          </div>
        ) : null}

        {density === "micro" ? (
          <div className="min-h-0">
            <div className="mb-0.5 flex items-center justify-between gap-1.5">
              <div className="min-w-0 flex items-center gap-1">
                {isHomeVisit ? (
                  <span
                    className={`${homeChipSizeClass} rounded-md border border-dom/35 bg-dom/15 text-dom-strong`}
                    title="Domicilio"
                    aria-label="Domicilio"
                  >
                    <Home className={homeIconSizeClass} />
                  </span>
                ) : null}
                <h3 className={`truncate leading-tight text-studio-text ${nameClass}`}>{name}</h3>
              </div>
              <MoreHorizontal className="h-3.5 w-3.5 shrink-0 text-muted" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className={`truncate text-muted ${timeClass}`}>{timeRange}</p>
              <div className="min-w-0 flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${paymentDotClass}`} />
                <span className={`truncate text-studio-text ${priceClass}`}>{formatPriceLabel(price)}</span>
                <span className={`truncate ${paymentTextClass} ${paymentClass}`}>{paymentShortLabel}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-0">
            <h3 className={`leading-tight text-studio-text line-clamp-1 ${nameClass}`}>{name}</h3>
            {showService ? <p className={`mt-0.5 text-muted line-clamp-1 ${serviceClass}`}>{service}</p> : null}
            <p className={`${showService ? "mt-1" : "mt-0.5"} text-muted ${timeClass}`}>{timeRange}</p>
          </div>
        )}

        {density !== "micro" ? (
          <div className={`${showDivider ? "mt-2.5 border-t border-line pt-2" : density === "tight" ? "mt-1.5" : "mt-1"}`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className={`h-2 w-2 shrink-0 rounded-full ${paymentDotClass}`} />
              <span className={`truncate text-studio-text ${priceClass}`}>{formatPriceLabel(price)}</span>
              {showPaymentLabel ? (
                <span className={`truncate ${paymentTextClass} ${paymentClass}`}>{paymentLabel}</span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
