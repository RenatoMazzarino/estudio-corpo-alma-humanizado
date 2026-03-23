"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, BookOpenText, Home, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface AppointmentCardProps {
  appointmentId?: string;
  name: string;
  service: string;
  startLabel: string;
  endLabel?: string;
  status?: string | null;
  paymentStatus?: string | null;
  signalPaidAmount?: number | null;
  signalPercentage?: number;
  isHomeVisit: boolean;
  price?: number | null;
  isVip?: boolean;
  durationMinutes?: number;
  loading?: boolean;
  highlight?: boolean;
  onOpenAction: () => void;
  onOpenRecordAction?: () => void;
  onEditAction?: () => void;
  onDeleteAction?: () => void;
  onLongPressAction?: () => void;
  ["data-card"]?: boolean;
}

const paymentStatusMap: Record<string, { dotClass: string }> = {
  paid: { dotClass: "bg-emerald-500" },
  partial: { dotClass: "bg-amber-500" },
  pending: { dotClass: "bg-amber-500" },
  waived: { dotClass: "bg-sky-500" },
  refunded: { dotClass: "bg-slate-500" },
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
  appointmentId,
  name,
  service,
  startLabel,
  endLabel,
  status,
  paymentStatus,
  signalPaidAmount = null,
  signalPercentage = 30,
  isHomeVisit,
  price,
  isVip = false,
  durationMinutes = 60,
  loading = false,
  highlight = false,
  onOpenAction,
  onOpenRecordAction,
  onEditAction,
  onDeleteAction,
  onLongPressAction,
  "data-card": dataCard,
}: AppointmentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimeout = useRef<number | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  const accentColor = isHomeVisit ? "var(--color-dom)" : "var(--color-studio-green)";
  const normalizedStatus = (status ?? "").toLowerCase();
  const isCompleted = normalizedStatus === "completed";
  const canShowActionsMenu = Boolean(onOpenRecordAction || onEditAction || onDeleteAction);

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

  const timeClass = "wl-typo-card-time";
  const priceClass = "wl-typo-card-status";
  const vipClass =
    "wl-typo-chip inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-600";
  const homeIconSizeClass = density === "micro" ? "h-3 w-3" : "h-3.5 w-3.5";
  const showService = density !== "micro" && density !== "tight";
  const showDivider = density === "compact" || density === "full";
  const timeRange = endLabel ? `${startLabel} - ${endLabel}` : startLabel;
  const menuButtonSizeClass = density === "micro" ? "h-5 w-5" : "h-6 w-6";
  const menuIconSizeClass = density === "micro" ? "h-3.5 w-3.5" : "h-4 w-4";

  const statusSealClass =
    normalizedStatus === "in_progress"
      ? "text-sky-500 animate-pulse drop-shadow-[0_0_6px_rgba(59,130,246,0.45)]"
      : normalizedStatus === "confirmed" || normalizedStatus === "completed"
        ? "text-emerald-600"
        : "text-slate-500";
  const statusSealTitle =
    normalizedStatus === "in_progress"
      ? "Em atendimento"
      : normalizedStatus === "confirmed" || normalizedStatus === "completed"
        ? "Confirmado"
        : "Aguardando confirmacao";
  const cardSurfaceStyle = isCompleted
    ? {
        backgroundColor: "color-mix(in srgb, var(--color-studio-green) 12%, var(--surface-card-body))",
        borderColor: "color-mix(in srgb, var(--color-studio-green) 30%, var(--color-line))",
      }
    : null;

  const totalAmount = typeof price === "number" && Number.isFinite(price) ? price : null;
  const normalizedSignalPaidAmount =
    typeof signalPaidAmount === "number" && Number.isFinite(signalPaidAmount) ? signalPaidAmount : null;
  const inferredPartialPaid =
    totalAmount !== null
      ? Number(((totalAmount * Math.min(Math.max(signalPercentage, 0), 100)) / 100).toFixed(2))
      : null;
  const partialPaidAmount =
    normalizedSignalPaidAmount !== null && normalizedSignalPaidAmount > 0 ? normalizedSignalPaidAmount : inferredPartialPaid;
  const defaultPaymentDotClass = paymentStatusMap[paymentStatus ?? "pending"]?.dotClass ?? "bg-amber-500";

  const paymentView = (() => {
    switch (paymentStatus) {
      case "paid":
        return {
          dotClass: "bg-emerald-500",
          amountClass: "text-emerald-600",
          amountLabel: formatPriceLabel(totalAmount),
        };
      case "partial":
        return {
          dotClass: "bg-amber-500",
          amountClass: "text-amber-600",
          amountLabel:
            totalAmount !== null && partialPaidAmount !== null
              ? `${formatPriceLabel(partialPaidAmount)} de ${formatPriceLabel(totalAmount)}`
              : formatPriceLabel(totalAmount),
        };
      case "pending":
        return {
          dotClass: "bg-amber-500",
          amountClass: "text-studio-text",
          amountLabel: formatPriceLabel(totalAmount),
        };
      case "waived":
        return {
          dotClass: "bg-sky-500",
          amountClass: "text-sky-600",
          amountLabel: "Cortesia",
        };
      case "refunded":
        return {
          dotClass: "bg-slate-500",
          amountClass: "text-slate-600",
          amountLabel: "Estornado",
        };
      default:
        return {
          dotClass: defaultPaymentDotClass,
          amountClass: "text-studio-text",
          amountLabel: formatPriceLabel(totalAmount),
        };
    }
  })();

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen]);

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

  const handleToggleMenu = () => {
    if (canShowActionsMenu) {
      setMenuOpen((prev) => !prev);
      return;
    }
    onLongPressAction?.();
  };

  const handleOpenRecord = () => {
    setMenuOpen(false);
    onOpenRecordAction?.();
  };

  const handleEdit = () => {
    setMenuOpen(false);
    onEditAction?.();
  };

  const handleDelete = () => {
    setMenuOpen(false);
    onDeleteAction?.();
  };

  return (
    <div
      role="button"
      data-card={dataCard ? "" : undefined}
      data-appointment-id={appointmentId ?? undefined}
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
      className={`relative h-full min-h-0 w-full overflow-hidden rounded-xl border border-line border-l-4 wl-surface-card-body ${wrapperPadding} shadow-soft transition active:scale-[0.99] ${
        loading ? "cursor-wait opacity-75" : "cursor-pointer"
      } ${highlight ? "ring-2 ring-studio-green/60 animate-[pulse_0.75s_ease-in-out_2]" : ""}`}
      style={{
        borderLeftColor: accentColor,
        ...(cardSurfaceStyle ?? {}),
      }}
    >
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-paper/80">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/10 border-t-studio-green" />
        </div>
      )}

      <div className="flex h-full min-h-0 flex-col justify-between">
        <div className="min-h-0">
          <div className="relative flex items-start justify-between gap-2">
            <div className="min-w-0 flex items-center gap-1.5">
              <h3
                className={`min-w-0 flex-1 truncate leading-tight text-studio-text ${nameClass}`}
                style={{ fontFamily: "var(--font-serif), ui-serif, Georgia, serif" }}
              >
                {name}
              </h3>
              <span className="inline-flex shrink-0" title={statusSealTitle} aria-label={statusSealTitle}>
                <BadgeCheck className={`h-4 w-4 ${statusSealClass}`} />
              </span>
              {isHomeVisit ? (
                <span className="inline-flex shrink-0" title="Domicilio" aria-label="Domicilio">
                  <Home className={`${homeIconSizeClass} text-muted`} />
                </span>
              ) : null}
            </div>

            <button
              type="button"
              aria-label="Abrir acoes do agendamento"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleToggleMenu();
              }}
              className={`inline-flex ${menuButtonSizeClass} shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-paper hover:text-studio-text`}
            >
              <MoreHorizontal className={menuIconSizeClass} />
            </button>

            {menuOpen && canShowActionsMenu ? (
              <div
                ref={actionsMenuRef}
                className="absolute right-0 top-8 z-20 min-w-44 overflow-hidden rounded-xl border border-line wl-surface-card-body text-studio-text shadow-soft"
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleOpenRecord();
                  }}
                  className="wl-typo-menu-item flex w-full items-center gap-2.5 border-b border-line px-3 py-2.5 text-left text-studio-text transition hover:bg-paper"
                >
                  <BookOpenText className="h-4 w-4" />
                  Abrir prontuario
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleEdit();
                  }}
                  className="wl-typo-menu-item flex w-full items-center gap-2.5 border-b border-line px-3 py-2.5 text-left text-studio-text transition hover:bg-paper"
                >
                  <Pencil className="h-4 w-4" />
                  Editar agendamento
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDelete();
                  }}
                  className="wl-typo-menu-item flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir agendamento
                </button>
              </div>
            ) : null}
          </div>

          {density !== "micro" && isVip ? <span className={`${vipClass} mt-1`}>VIP</span> : null}

          {density === "micro" ? null : showService ? (
            <p className="mt-0.5 line-clamp-1 text-muted wl-typo-card-service">{service}</p>
          ) : null}

          <p className={`${density === "micro" ? "mt-0.5" : showService ? "mt-1" : "mt-0.5"} text-muted ${timeClass}`}>
            {timeRange}
          </p>
        </div>

        {density === "micro" ? (
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${paymentView.dotClass}`} />
            <span className={`truncate ${paymentView.amountClass} ${priceClass}`}>{paymentView.amountLabel}</span>
          </div>
        ) : (
          <div className={`${showDivider ? "mt-2.5 border-t border-line pt-2" : density === "tight" ? "mt-1.5" : "mt-1"}`}>
            <div className="flex min-w-0 items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${paymentView.dotClass}`} />
              <span className={`truncate ${paymentView.amountClass} ${priceClass}`}>{paymentView.amountLabel}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
