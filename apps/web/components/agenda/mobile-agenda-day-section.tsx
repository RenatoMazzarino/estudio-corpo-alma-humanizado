import { addMinutes, format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Home, Hospital, Sparkles } from "lucide-react";
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

          return (
            <div
              key={day.toISOString()}
              data-date={format(day, "yyyy-MM-dd")}
              className="min-w-full snap-center px-3 pb-0 pt-5 flex flex-col"
              style={{ scrollSnapStop: "always" }}
            >
              <div className="text-center mb-5">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="w-10" aria-hidden="true"></div>
                  <h2
                    className={`text-[10px] font-extrabold uppercase tracking-widest ${
                      isToday(day) ? "text-studio-green" : "text-muted"
                    }`}
                  >
                    {format(day, "EEEE", { locale: ptBR })}
                  </h2>
                  <button
                    type="button"
                    onClick={onGoToToday}
                    className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-studio-light text-studio-green hover:bg-studio-green hover:text-white transition"
                  >
                    Hoje
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-3xl font-serif text-studio-text capitalize">
                    {format(day, "dd MMM", { locale: ptBR })}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
                  {isToday(day) && (
                    <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-studio-green/10 text-studio-green">
                      Hoje
                    </span>
                  )}
                  {appointmentCount > 0 && (
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-studio-green/10 text-studio-green">
                      <Sparkles className="w-3 h-3" /> {appointmentCount} atendimentos
                    </span>
                  )}
                  {homeCount > 0 && (
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-dom/20 text-dom-strong">
                      <Home className="w-3 h-3" /> {homeCount} domicílio
                    </span>
                  )}
                  {hasShiftBlock && (
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-red-100 text-red-600">
                      <Hospital className="w-3 h-3" /> Plantão
                    </span>
                  )}
                  {!hasShiftBlock && appointmentCount === 0 && blockCount > 0 && (
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-amber-100 text-amber-700">
                      Bloqueio parcial
                    </span>
                  )}
                  {hasShiftBlock && hasPartialBlocks && (
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-amber-100 text-amber-700">
                      Bloqueio parcial
                    </span>
                  )}
                  {appointmentCount === 0 && blockCount === 0 && (
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-studio-light text-muted">
                      Agenda livre
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
                          slot.isHalf ? "text-[10px] text-muted/60 pr-1" : "pr-0.5"
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
                          className="text-[11px] font-extrabold text-danger text-right pr-2"
                          style={{ width: timeColumnWidth }}
                        >
                          {format(now, "HH:mm")}
                        </span>
                        <div className="flex-1 h-px bg-danger/70 relative">
                          <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-danger"></div>
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
                      const isCompact = durationMinutes <= 30;
                      const bufferBefore = item.buffer_before_minutes ?? 0;
                      const bufferAfter = item.buffer_after_minutes ?? 0;
                      const apptHeight = getDurationHeight(durationMinutes, timeGridConfig);
                      const rawPreHeight =
                        bufferBefore > 0 ? getDurationHeight(bufferBefore, timeGridConfig) : 0;
                      const postHeight =
                        bufferAfter > 0 ? getDurationHeight(bufferAfter, timeGridConfig) : 0;
                      const accentColor = isHomeVisit ? "var(--color-dom)" : "var(--color-studio-green)";
                      const stripeColor = isHomeVisit
                        ? "rgba(192,164,176,0.2)"
                        : "rgba(93,110,86,0.16)";
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
                      const hasPreBuffer = preHeight > 0;
                      const hasPostBuffer = postHeight > 0;

                      const returnTo = `/?view=day&date=${format(day, "yyyy-MM-dd")}`;

                      return (
                        <div
                          key={item.id}
                          className="absolute left-0 right-0 pr-1 pointer-events-auto"
                          style={{ top: wrapperTop, height: wrapperHeight }}
                        >
                          {isBlock ? (
                            <div className="h-full bg-white p-3.5 rounded-3xl shadow-soft border-l-4 border-amber-400 flex flex-col justify-between overflow-hidden">
                              <div className="flex justify-between items-start mb-1">
                                <h3 className="font-extrabold text-studio-text text-sm leading-tight line-clamp-1">
                                  {item.clientName}
                                </h3>
                                <div className="w-7 h-7 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                                  <Hospital className="w-3.5 h-3.5" />
                                </div>
                              </div>
                              <p className="text-xs text-muted line-clamp-1">{item.serviceName}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 bg-red-100 text-red-600">
                                  Bloqueado
                                </span>
                                {endLabel && <span className="text-[11px] text-muted">Até {endLabel}</span>}
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex flex-col">
                              {preHeight > 0 && (
                                <div className="pointer-events-none relative" style={{ height: preHeight }}>
                                  <div
                                    className="absolute inset-0 rounded-2xl rounded-b-none border-l-4 border-dashed px-3 py-1 flex items-start overflow-hidden"
                                    style={bufferStyle}
                                  >
                                    <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted/80 leading-none whitespace-nowrap">
                                      Buffer Pré · {formatAgendaDuration(bufferBefore)}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div style={{ height: apptHeight }}>
                                <AppointmentCard
                                  data-card
                                  name={item.clientName}
                                  service={item.serviceName}
                                  durationLabel={durationMinutes ? formatAgendaDuration(durationMinutes) : null}
                                  startLabel={startLabel}
                                  endLabel={endLabel}
                                  status={item.status}
                                  paymentStatus={item.payment_status ?? null}
                                  isHomeVisit={!!isHomeVisit}
                                  compact={isCompact}
                                  hasPreBuffer={hasPreBuffer}
                                  hasPostBuffer={hasPostBuffer}
                                  loading={loadingAppointmentId === item.id}
                                  onOpen={() => onOpenAppointment(item.id)}
                                  onLongPress={() => {
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
                                    className="absolute inset-0 rounded-2xl rounded-t-none border-l-4 border-dashed px-3 py-1 flex items-end overflow-hidden"
                                    style={bufferStyle}
                                  >
                                    <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted/80 leading-none whitespace-nowrap">
                                      Buffer Pós · {formatAgendaDuration(bufferAfter)}
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
                  <h3 className="text-muted font-bold text-sm">Agenda Livre</h3>
                  <p className="text-xs text-muted mt-1">Nenhum agendamento para este dia.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
