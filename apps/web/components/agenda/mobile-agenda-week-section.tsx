"use client";

import { addDays, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment, AvailabilityBlock, DayItem } from "./mobile-agenda.types";
import { parseAgendaDate } from "./mobile-agenda.helpers";

type MobileAgendaWeekSectionProps = {
  visible: boolean;
  selectedDate: Date;
  weekDays: Date[];
  getDayDataAction: (day: Date) => {
    dayAppointments: Appointment[];
    dayBlocks: AvailabilityBlock[];
    items: DayItem[];
  };
  onChangeSelectedDateAction: (date: Date) => void;
  onOpenDayAction: (day: Date) => void;
};

function formatWeekdayShort(day: Date) {
  return format(day, "EEE", { locale: ptBR }).replace(".", "").toUpperCase();
}

export function MobileAgendaWeekSection({
  visible,
  selectedDate,
  weekDays,
  getDayDataAction,
  onChangeSelectedDateAction,
  onOpenDayAction,
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
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-white"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="text-center">
          <h2 className="wl-typo-h2 capitalize leading-tight text-studio-text">{rangeLabel}</h2>
          <p className="wl-typo-body mt-1 text-muted">Visao semanal</p>
        </div>

        <button
          type="button"
          onClick={() => onChangeSelectedDateAction(addDays(selectedDate, 7))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-white"
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

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onOpenDayAction(day)}
              className={`w-full rounded-xl border bg-white px-4 py-3 text-left shadow-soft transition active:scale-[0.99] ${
                isActive || hasAppointments ? "border-studio-green/35" : "border-line"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-end gap-2">
                  <span className="wl-typo-h1 leading-none text-studio-text">{dayNumber}</span>
                  <span className="wl-typo-label pb-1 text-muted">
                    {dayShort}.
                  </span>
                </div>

                <div className="wl-typo-body pt-1 text-right text-muted">
                  {hasAppointments ? (
                    <>
                      <p>{dayAppointments.length} agendamentos</p>
                      <p>{hasBlocks ? `${partialBlocks.length} bloqueio(s)` : " "}</p>
                    </>
                  ) : hasBlocks ? (
                    <p>{partialBlocks.length} bloqueio(s)</p>
                  ) : (
                    <p>Livre</p>
                  )}
                </div>
              </div>

              {hasAppointments ? (
                <div className="mt-3 space-y-2">
                  {dayAppointments.map((appt) => (
                    <div
                      key={appt.id}
                        className="flex items-center justify-between rounded-xl border border-line bg-studio-bg px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="wl-typo-title truncate text-studio-text">
                          {appt.clients?.name ?? "Cliente"}
                        </p>
                        <p className="wl-typo-body truncate text-muted">{appt.service_name}</p>
                      </div>
                      <span className="wl-typo-body ml-2 text-studio-text">
                        {format(parseAgendaDate(appt.start_time), "HH:mm")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
