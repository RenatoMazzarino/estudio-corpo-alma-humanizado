"use client";

import { addDays, addMinutes, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BadgeCheck, BookOpenText, ChevronLeft, ChevronRight, Home, MoreHorizontal, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Appointment, AvailabilityBlock, DayItem } from "./mobile-agenda.types";
import { parseAgendaDate } from "./mobile-agenda.helpers";

type AppointmentMenuPayload = {
  id: string;
  clientName: string;
  serviceName: string;
  startTime: string;
  returnTo: string;
};

type MobileAgendaWeekSectionProps = {
  visible: boolean;
  selectedDate: Date;
  signalPercentage: number;
  weekDays: Date[];
  getDayDataAction: (day: Date) => {
    dayAppointments: Appointment[];
    dayBlocks: AvailabilityBlock[];
    items: DayItem[];
  };
  onChangeSelectedDateAction: (date: Date) => void;
  onOpenDayAction: (day: Date) => void;
  onOpenAppointmentAction: (appointmentId: string) => void;
  onOpenRecordFromCard: (payload: AppointmentMenuPayload) => void;
  onEditFromCard: (payload: AppointmentMenuPayload) => void;
  onDeleteFromCard: (payload: AppointmentMenuPayload) => Promise<void>;
};

type WeekAppointmentItemProps = {
  payload: AppointmentMenuPayload;
  status: string | null | undefined;
  paymentStatus: string | null | undefined;
  signalPaidAmount: number | null | undefined;
  signalPercentage: number;
  isHomeVisit: boolean;
  price: number | null | undefined;
  startLabel: string;
  endLabel: string;
  durationLabel: string;
  onOpenAction: () => void;
  onOpenRecordAction: (payload: AppointmentMenuPayload) => void;
  onEditAction: (payload: AppointmentMenuPayload) => void;
  onDeleteAction: (payload: AppointmentMenuPayload) => Promise<void>;
};

function formatWeekdayShort(day: Date) {
  const label = format(day, "EEE", { locale: ptBR }).replace(".", "").trim();
  if (!label) return "";
  return `${label.charAt(0).toUpperCase()}${label.slice(1).toLowerCase()}`;
}

function resolveDurationMinutes(appointment: Appointment) {
  if (typeof appointment.total_duration_minutes === "number" && appointment.total_duration_minutes > 0) {
    return appointment.total_duration_minutes;
  }
  const service = appointment.service_duration_minutes ?? 60;
  const before = appointment.buffer_before_minutes ?? 0;
  const after = appointment.buffer_after_minutes ?? 0;
  return service + before + after;
}

function formatDurationLabel(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours <= 0) return `${rest}min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h${rest.toString().padStart(2, "0")}`;
}

function formatPriceLabel(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "R$ --";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function resolveStatusSeal(status: string | null | undefined) {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "in_progress") {
    return {
      title: "Em atendimento",
      className: "text-sky-500 animate-pulse drop-shadow-[0_0_6px_rgba(59,130,246,0.45)]",
    };
  }
  if (normalized === "confirmed" || normalized === "completed") {
    return { title: "Confirmado", className: "text-emerald-600" };
  }
  return { title: "Aguardando confirmacao", className: "text-slate-500" };
}

function resolvePaymentView(params: {
  paymentStatus: string | null | undefined;
  price: number | null | undefined;
  signalPaidAmount: number | null | undefined;
  signalPercentage: number;
}) {
  const totalAmount = typeof params.price === "number" && Number.isFinite(params.price) ? params.price : null;
  const normalizedSignalPaidAmount =
    typeof params.signalPaidAmount === "number" && Number.isFinite(params.signalPaidAmount)
      ? params.signalPaidAmount
      : null;
  const inferredPartialPaid =
    totalAmount !== null
      ? Number(((totalAmount * Math.min(Math.max(params.signalPercentage, 0), 100)) / 100).toFixed(2))
      : null;
  const partialPaidAmount =
    normalizedSignalPaidAmount !== null && normalizedSignalPaidAmount > 0 ? normalizedSignalPaidAmount : inferredPartialPaid;

  switch (params.paymentStatus) {
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
        dotClass: "bg-amber-500",
        amountClass: "text-studio-text",
        amountLabel: formatPriceLabel(totalAmount),
      };
  }
}

function WeekAppointmentItem({
  payload,
  status,
  paymentStatus,
  signalPaidAmount,
  signalPercentage,
  isHomeVisit,
  price,
  startLabel,
  endLabel,
  durationLabel,
  onOpenAction,
  onOpenRecordAction,
  onEditAction,
  onDeleteAction,
}: WeekAppointmentItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  const statusSeal = resolveStatusSeal(status);
  const paymentView = resolvePaymentView({
    paymentStatus,
    price,
    signalPaidAmount,
    signalPercentage,
  });
  const normalizedStatus = (status ?? "").toLowerCase();
  const isCompleted = normalizedStatus === "completed";
  const accentColor = isHomeVisit ? "var(--color-dom)" : "var(--color-studio-green)";

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

  return (
    <article
      className="relative overflow-visible rounded-xl border border-line border-l-4 wl-surface-card-body px-3 py-2.5 shadow-soft"
      style={{
        borderLeftColor: accentColor,
        ...(isCompleted
          ? {
              backgroundColor: "color-mix(in srgb, var(--color-studio-green) 12%, var(--surface-card-body))",
              borderColor: "color-mix(in srgb, var(--color-studio-green) 30%, var(--color-line))",
            }
          : {}),
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpenAction} className="min-w-0 flex-1 text-left">
          <div className="flex min-w-0 items-center gap-1.5">
            <p
              className="wl-typo-card-name-sm min-w-0 flex-1 truncate leading-tight text-studio-text"
              style={{ fontFamily: "var(--font-serif), ui-serif, Georgia, serif" }}
            >
              {payload.clientName}
            </p>
            <span className="inline-flex shrink-0" title={statusSeal.title} aria-label={statusSeal.title}>
              <BadgeCheck className={`h-4 w-4 ${statusSeal.className}`} />
            </span>
            {isHomeVisit ? (
              <span className="inline-flex shrink-0" title="Domicilio" aria-label="Domicilio">
                <Home className="h-3.5 w-3.5 text-muted" />
              </span>
            ) : null}
          </div>
          <p className="wl-typo-body mt-0.5 truncate text-muted">{payload.serviceName}</p>
          <p className="wl-typo-body-sm mt-0.5 text-muted">
            {startLabel} - {endLabel}
          </p>
          <div className="mt-1.5 flex min-w-0 items-center gap-2 border-t border-line pt-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${paymentView.dotClass}`} />
            <span className={`wl-typo-card-status truncate ${paymentView.amountClass}`}>{paymentView.amountLabel}</span>
          </div>
        </button>

        <div className="relative flex shrink-0 flex-col items-end gap-1">
          <p className="wl-typo-time-major text-studio-text">{startLabel}</p>
          <p className="wl-typo-time-minor text-muted">{durationLabel}</p>
          <button
            type="button"
            aria-label="Abrir acoes do agendamento"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted transition hover:bg-paper hover:text-studio-text"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div
              ref={actionsMenuRef}
              className="absolute right-0 top-9 z-20 min-w-44 overflow-hidden rounded-xl border border-line wl-surface-card-body shadow-soft"
              style={{ color: "var(--color-studio-text)" }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenuOpen(false);
                  onOpenRecordAction(payload);
                }}
                className="wl-typo-menu-item flex w-full items-center gap-2.5 border-b border-line px-3 py-2.5 text-left transition hover:bg-paper"
                style={{ color: "var(--color-studio-text)" }}
              >
                <BookOpenText className="h-4 w-4" />
                Abrir prontuario
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenuOpen(false);
                  onEditAction(payload);
                }}
                className="wl-typo-menu-item flex w-full items-center gap-2.5 border-b border-line px-3 py-2.5 text-left transition hover:bg-paper"
                style={{ color: "var(--color-studio-text)" }}
              >
                <Pencil className="h-4 w-4" />
                Editar agendamento
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenuOpen(false);
                  void onDeleteAction(payload);
                }}
                className="wl-typo-menu-item flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Excluir agendamento
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function MobileAgendaWeekSection({
  visible,
  selectedDate,
  signalPercentage,
  weekDays,
  getDayDataAction,
  onChangeSelectedDateAction,
  onOpenDayAction,
  onOpenAppointmentAction,
  onOpenRecordFromCard,
  onEditFromCard,
  onDeleteFromCard,
}: MobileAgendaWeekSectionProps) {
  const startOfWeek = weekDays[0] ?? null;
  const endOfWeek = weekDays[weekDays.length - 1] ?? null;
  const rangeLabel =
    startOfWeek && endOfWeek
      ? `${format(startOfWeek, "dd")} - ${format(endOfWeek, "dd MMMM", {
          locale: ptBR,
        })}`
      : "";

  return (
    <section className={`${visible ? "block" : "hidden"} animate-in fade-in px-4 pb-0 pt-4`}>
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChangeSelectedDateAction(addDays(selectedDate, -7))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-paper"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="text-center">
          <h2 className="wl-typo-h2 capitalize leading-tight text-studio-text">{rangeLabel}</h2>
        </div>

        <button
          type="button"
          onClick={() => onChangeSelectedDateAction(addDays(selectedDate, 7))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-paper"
          aria-label="Proxima semana"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 pb-16">
        {weekDays.map((day) => {
          const { dayAppointments, dayBlocks } = getDayDataAction(day);
          const hasAppointments = dayAppointments.length > 0;
          const partialBlocks = dayBlocks.filter(
            (block) => !((block.block_type ?? "") === "shift" && block.is_full_day)
          );
          const hasBlocks = partialBlocks.length > 0;
          const isActive = isSameDay(day, selectedDate);
          const dayNumber = format(day, "dd");
          const dayShort = formatWeekdayShort(day);
          const dayStatusTags = hasAppointments
            ? [
                {
                  label: `${dayAppointments.length} agendamentos`,
                  className: "border-studio-green/25 bg-studio-green/10 text-studio-green",
                },
                ...(hasBlocks
                  ? [
                      {
                        label: `${partialBlocks.length} bloqueio(s)`,
                        className: "border-amber-300 bg-amber-50 text-amber-700",
                      },
                    ]
                  : []),
              ]
            : hasBlocks
              ? [{ label: `${partialBlocks.length} bloqueio(s)`, className: "border-amber-300 bg-amber-50 text-amber-700" }]
              : [{ label: "Livre", className: "border-emerald-300 bg-emerald-50 text-emerald-700" }];

          return (
            <article
              key={day.toISOString()}
              className={`w-full overflow-visible wl-surface-card text-left shadow-soft transition ${
                isActive || hasAppointments ? "border-studio-green/35" : "border-line"
              }`}
            >
              <button
                type="button"
                onClick={() => onOpenDayAction(day)}
                className="flex w-full items-start justify-between gap-3 border-b border-line px-4 py-3 text-left wl-surface-card-header"
              >
                <div className="flex items-end gap-2.5">
                  <span className="wl-typo-h1 leading-none text-studio-text">{dayNumber}</span>
                  <span className="wl-typo-card-name-md font-bold leading-none text-studio-text">{dayShort}</span>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1.5 pt-0.5">
                  {dayStatusTags.map((tag) => (
                    <span
                      key={`${day.toISOString()}-${tag.label}`}
                      className={`wl-typo-chip inline-flex rounded-full border px-2.5 py-1 ${tag.className}`}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              </button>

              <div className="wl-surface-card-body px-4 py-3">
                {hasAppointments ? (
                  <div className="space-y-2">
                    {dayAppointments.map((appt) => {
                      const startDate = parseAgendaDate(appt.start_time);
                      const durationMinutes = resolveDurationMinutes(appt);
                      const endDate = appt.finished_at
                        ? parseAgendaDate(appt.finished_at)
                        : addMinutes(startDate, durationMinutes);
                      const returnTo = `/?view=week&date=${format(day, "yyyy-MM-dd")}`;
                      const payload: AppointmentMenuPayload = {
                        id: appt.id,
                        clientName: appt.clients?.name ?? "Cliente",
                        serviceName: appt.service_name,
                        startTime: appt.start_time,
                        returnTo,
                      };

                      return (
                        <WeekAppointmentItem
                          key={appt.id}
                          payload={payload}
                          status={appt.status}
                          paymentStatus={appt.payment_status ?? null}
                          signalPaidAmount={appt.signal_paid_amount ?? null}
                          signalPercentage={signalPercentage}
                          isHomeVisit={Boolean(appt.is_home_visit)}
                          price={appt.price ?? null}
                          startLabel={format(startDate, "HH:mm")}
                          endLabel={format(endDate, "HH:mm")}
                          durationLabel={formatDurationLabel(durationMinutes)}
                          onOpenAction={() => onOpenAppointmentAction(appt.id)}
                          onOpenRecordAction={onOpenRecordFromCard}
                          onEditAction={onEditFromCard}
                          onDeleteAction={onDeleteFromCard}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-dashed border-line wl-surface-card-body px-3 py-3 text-muted">
                    <Sparkles className="h-4 w-4" />
                    <p className="wl-typo-body-sm">Nenhum agendamento neste dia.</p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
