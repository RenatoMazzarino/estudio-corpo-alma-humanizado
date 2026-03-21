import { addMinutes, format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, Home, Hospital, Sparkles } from "lucide-react";
import type { RefObject, UIEvent } from "react";

import { AppointmentCard } from "./appointment-card";
import {
  formatAgendaDuration,
  getAgendaServiceDuration,
  parseAgendaDate,
} from "./mobile-agenda.helpers";
import type { Appointment, AvailabilityBlock, DayItem } from "./mobile-agenda.types";
import {
  getDurationHeight,
  getOffsetForTime,
  type TimeGridConfig,
} from "../../src/modules/agenda/time-grid";

interface MobileAgendaDaySectionProps {
  visible: boolean;
  monthDays: Date[];
  now: Date | null;
  timeGridConfig: TimeGridConfig;
  timeSlots: Array<{ key: string; label: string; isHalf: boolean; minutes: number }>;
  slotHeight: number;
  timelineHeight: number;
  timelineLeftOffset: number;
  timeColumnWidth: number;
  timeColumnGap: number;
  loadingAppointmentId: string | null;
  daySliderRef: RefObject<HTMLDivElement | null>;
  onDayScroll: (event: UIEvent<HTMLDivElement>) => void;
  onGoToToday: () => void;
  onOpenAppointment: (appointmentId: string) => void;
  onOpenMonthPickerAction: () => void;
  onOpenActionSheet: (payload: {
    id: string;
    clientName: string;
    serviceName: string;
    startTime: string;
    returnTo: string;
  }) => void;
  getDayData: (day: Date) => {
    dayAppointments: Appointment[];
    dayBlocks: AvailabilityBlock[];
    items: DayItem[];
  };
}

const chipBaseClass =
  "wl-typo-chip px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5";

export function MobileAgendaDaySection({
  visible,
  monthDays,
  now,
  timeGridConfig,
  timeSlots,
  slotHeight,
  timelineHeight,
  timelineLeftOffset,
  timeColumnWidth,
  timeColumnGap,
  loadingAppointmentId,
  daySliderRef,
  onDayScroll,
  onGoToToday,
  onOpenAppointment,
  onOpenMonthPickerAction,
  onOpenActionSheet,
  getDayData,
}: MobileAgendaDaySectionProps) {
  return (
    <section className={`${visible ? "flex" : "hidden"} flex-col`}>
      <div
        ref={daySliderRef}
        onScroll={onDayScroll}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {monthDays.map((day) => {
          const { dayAppointments, dayBlocks, items } = getDayData(day);
          const appointmentCount = dayAppointments.length;
          const homeCount = dayAppointments.filter((appt) => appt.is_home_visit).length;
          const blockCount = dayBlocks.length;
          const hasShiftBlock = dayBlocks.some(
            (block) => (block.block_type ?? "") === "shift" && block.is_full_day
          );
          const hasPartialBlocks = dayBlocks.some(
            (block) => !((block.block_type ?? "") === "shift" && block.is_full_day)
          );
          const nowOffset = now && isToday(day) ? getOffsetForTime(now, timeGridConfig) : null;
          const dayNumber = format(day, "dd");
          const weekdayLabel = format(day, "EEEE", { locale: ptBR });
          const monthLabel = format(day, "MMMM", { locale: ptBR });
          const dayLabel = isToday(day) ? `Hoje, ${weekdayLabel}` : weekdayLabel;

          return (
            <div
              key={day.toISOString()}
              data-date={format(day, "yyyy-MM-dd")}
              className="min-w-full snap-center px-4 pb-0 pt-4"
              style={{ scrollSnapStop: "always" }}
            >
              <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <p className="wl-typo-h1 leading-none text-studio-text">{dayNumber}</p>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={onOpenMonthPickerAction}
                        className="wl-typo-body-sm inline-flex items-center gap-1 rounded-md border border-line/70 bg-white/80 px-2 py-0.5 text-muted transition hover:bg-white hover:text-studio-green"
                      >
                        {monthLabel}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <p className="wl-typo-body mt-1 capitalize text-muted">{dayLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={onGoToToday}
                    className="wl-typo-label rounded-lg border border-line bg-white px-2.5 py-1 text-studio-green transition hover:bg-studio-green hover:text-white"
                  >
                    Hoje
                  </button>

                  {appointmentCount > 0 && (
                    <span className={`${chipBaseClass} border-studio-green/20 bg-studio-green/10 text-studio-green`}>
                      <Sparkles className="h-3 w-3" /> {appointmentCount}
                    </span>
                  )}
                  {homeCount > 0 && (
                    <span className={`${chipBaseClass} border-dom/25 bg-dom/20 text-dom-strong`}>
                      <Home className="h-3 w-3" /> {homeCount}
                    </span>
                  )}
                  {hasShiftBlock && (
                    <span className={`${chipBaseClass} border-red-200 bg-red-100 text-red-600`}>
                      <Hospital className="h-3 w-3" /> Plantao
                    </span>
                  )}
                  {!hasShiftBlock && appointmentCount === 0 && blockCount > 0 && (
                    <span className={`${chipBaseClass} border-amber-200 bg-amber-100 text-amber-700`}>
                      Bloqueio
                    </span>
                  )}
                  {hasShiftBlock && hasPartialBlocks && (
                    <span className={`${chipBaseClass} border-amber-200 bg-amber-100 text-amber-700`}>
                      Bloqueio
                    </span>
                  )}
                </div>
              </div>

              {items.length > 0 ? (
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `${timeColumnWidth}px minmax(0, 1fr)`,
                    columnGap: timeColumnGap,
                  }}
                >
                  <div className="flex flex-col items-end text-xs text-muted font-semibold">
                    {timeSlots.map((slot) => (
                      <div
                        key={slot.key}
                        style={{ height: slotHeight }}
                        className={`flex items-start justify-end w-full ${
                          slot.isHalf ? "text-xs text-muted/60 pr-1.5" : "pr-0.5 text-sm"
                        }`}
                      >
                        {slot.label}
                      </div>
                    ))}
                  </div>
                  <div
                    className="relative"
                    style={{
                      height: (() => {
                        const maxBottom = items.reduce((max, item) => {
                          const startTimeDate = parseAgendaDate(item.start_time);
                          const durationMinutes = getAgendaServiceDuration(item);
                          const bufferAfter = item.buffer_after_minutes ?? 0;
                          const endTimeDate = addMinutes(startTimeDate, durationMinutes + bufferAfter);
                          const endOffset = getOffsetForTime(endTimeDate, timeGridConfig);
                          if (endOffset === null) return max;
                          return Math.max(max, endOffset);
                        }, 0);
                        return Math.max(timelineHeight, maxBottom + 16);
                      })(),
                    }}
                  >
                    {timeSlots.map((slot, index) => (
                      <div
                        key={slot.key}
                        className="absolute border-t border-dashed border-[#e5e5e5] pointer-events-none"
                        style={{
                          top: index * slotHeight,
                          left: slot.isHalf ? 12 : 0,
                          right: 0,
                        }}
                      />
                    ))}

                    {nowOffset !== null && now && (
                      <div
                        className="absolute flex items-center gap-2 z-20"
                        style={{ top: nowOffset, left: -timelineLeftOffset, right: 0 }}
                      >
                        <span
                          className="wl-typo-body-sm font-extrabold text-danger text-right pr-2"
                          style={{ width: timeColumnWidth }}
                        >
                          {format(now, "HH:mm")}
                        </span>
                        <div className="flex-1 h-px bg-danger/70 relative">
                          <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-danger" />
                        </div>
                      </div>
                    )}

                    {items.map((item) => {
                      const startTimeDate = parseAgendaDate(item.start_time);
                      const startLabel = format(startTimeDate, "HH:mm");
                      const isBlock = item.type === "block";
                      const isHomeVisit =
                        typeof item.is_home_visit === "boolean" ? item.is_home_visit : Boolean(item.address);
                      const durationMinutes = getAgendaServiceDuration(item);
                      const bufferBefore = item.buffer_before_minutes ?? 0;
                      const bufferAfter = item.buffer_after_minutes ?? 0;
                      const apptHeight = getDurationHeight(durationMinutes, timeGridConfig);
                      const rawPreHeight =
                        bufferBefore > 0 ? getDurationHeight(bufferBefore, timeGridConfig) : 0;
                      const postHeight =
                        bufferAfter > 0 ? getDurationHeight(bufferAfter, timeGridConfig) : 0;
                      const accentColor = isHomeVisit ? "var(--color-dom)" : "var(--color-studio-green)";
                      const stripeColor = isHomeVisit
                        ? "rgba(192,164,176,0.1)"
                        : "rgba(93,110,86,0.08)";
                      const bufferStyle = {
                        borderLeftColor: accentColor,
                        backgroundImage: `repeating-linear-gradient(135deg, ${stripeColor} 0, ${stripeColor} 6px, transparent 6px, transparent 12px)`,
                      } as const;

                      let endLabel = "";
                      if (isBlock && item.finished_at) {
                        endLabel = format(parseAgendaDate(item.finished_at), "HH:mm");
                      } else if (durationMinutes) {
                        endLabel = format(addMinutes(startTimeDate, durationMinutes), "HH:mm");
                      }

                      const top = getOffsetForTime(startTimeDate, timeGridConfig);
                      if (top === null) return null;
                      const preHeight = rawPreHeight > 0 ? Math.min(rawPreHeight, top) : 0;
                      const wrapperTop = top - preHeight;
                      const wrapperHeight = preHeight + apptHeight + postHeight;
                      const returnTo = `/?view=day&date=${format(day, "yyyy-MM-dd")}`;

                      return (
                        <div
                          key={item.id}
                          className="absolute left-0 right-0 pr-1 pointer-events-auto"
                          style={{ top: wrapperTop, height: wrapperHeight }}
                        >
                          {isBlock ? (
                            <div className="h-full rounded-xl border border-line border-l-4 border-l-amber-400 bg-white p-3.5 shadow-soft overflow-hidden">
                              <div className="wl-typo-chip mb-2 inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-100 px-2 py-0.5 text-red-600">
                                <Hospital className="h-3 w-3" /> Bloqueado
                              </div>
                              <h3 className="wl-typo-h2 leading-tight text-studio-text line-clamp-1">
                                {item.clientName}
                              </h3>
                              <p className="wl-typo-body mt-1 text-muted line-clamp-1">{item.serviceName}</p>
                              {endLabel ? (
                                <p className="wl-typo-body-sm mt-2 text-muted">Ate {endLabel}</p>
                              ) : null}
                            </div>
                          ) : (
                            <div className="h-full flex flex-col">
                              {preHeight > 0 && (
                                <div className="pointer-events-none relative" style={{ height: preHeight }}>
                                  <div
                                    className="absolute inset-0 rounded-lg rounded-b-none border-l-4 border-dashed px-3 py-1 flex items-start overflow-hidden"
                                    style={bufferStyle}
                                  >
                                    <span className="wl-typo-chip text-muted/80 leading-none whitespace-nowrap">
                                      Buffer Pre - {formatAgendaDuration(bufferBefore)}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div style={{ height: apptHeight }}>
                                <AppointmentCard
                                  data-card
                                  name={item.clientName}
                                  service={item.serviceName}
                                  startLabel={startLabel}
                                  endLabel={endLabel}
                                  status={item.status}
                                  paymentStatus={item.payment_status ?? null}
                                  isHomeVisit={!!isHomeVisit}
                                  price={item.price ?? null}
                                  isVip={item.is_vip === true}
                                  durationMinutes={durationMinutes}
                                  loading={loadingAppointmentId === item.id}
                                  onOpenAction={() => onOpenAppointment(item.id)}
                                  onLongPressAction={() => {
                                    onOpenActionSheet({
                                      id: item.id,
                                      clientName: item.clientName,
                                      serviceName: item.serviceName,
                                      startTime: item.start_time,
                                      returnTo,
                                    });
                                  }}
                                />
                              </div>

                              {postHeight > 0 && (
                                <div className="pointer-events-none relative" style={{ height: postHeight }}>
                                  <div
                                    className="absolute inset-0 rounded-lg rounded-t-none border-l-4 border-dashed px-3 py-1 flex items-end overflow-hidden"
                                    style={bufferStyle}
                                  >
                                    <span className="wl-typo-chip text-muted/80 leading-none whitespace-nowrap">
                                      Buffer Pos - {formatAgendaDuration(bufferAfter)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                  <div className="w-16 h-16 bg-white border-2 border-dashed border-line rounded-full flex items-center justify-center mb-4 text-muted">
                    <Sparkles size={28} />
                  </div>
                  <h3 className="text-sm font-bold text-muted">Agenda Livre</h3>
                  <p className="mt-1 text-xs text-muted">Nenhum agendamento para este dia.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
