"use client";

import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Car, ChevronLeft, ChevronRight, Hospital } from "lucide-react";
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

export function MobileAgendaWeekSection({
  visible,
  selectedDate,
  weekDays,
  getDayDataAction,
  onChangeSelectedDateAction,
  onOpenDayAction,
}: MobileAgendaWeekSectionProps) {
  return (
    <section className={`${visible ? "block" : "hidden"} p-6 pb-0 animate-in fade-in`}>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => onChangeSelectedDateAction(addDays(selectedDate, -7))}
          className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-sm font-extrabold text-studio-text capitalize">
          {weekDays.length > 0
            ? (() => {
                const startOfWeek = weekDays[0];
                const endOfWeek = weekDays[weekDays.length - 1];
                return startOfWeek && endOfWeek
                  ? `${format(startOfWeek, "dd MMM", { locale: ptBR })} - ${format(endOfWeek, "dd MMM", {
                      locale: ptBR,
                    })}`
                  : "";
              })()
            : ""}
        </div>
        <button
          type="button"
          onClick={() => onChangeSelectedDateAction(addDays(selectedDate, 7))}
          className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {weekDays.map((day) => {
          const { dayAppointments, dayBlocks } = getDayDataAction(day);
          const hasAppointments = dayAppointments.length > 0;
          const hasShiftBlock = dayBlocks.some((block) => (block.block_type ?? "") === "shift" && block.is_full_day);
          const partialBlocks = dayBlocks.filter(
            (block) => !((block.block_type ?? "") === "shift" && block.is_full_day)
          );
          const hasBlocks = partialBlocks.length > 0;

          if (hasAppointments) {
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onOpenDayAction(day)}
                className="bg-white p-4 rounded-3xl border-l-4 border-studio-green shadow-soft text-left active:scale-[0.99] transition"
              >
                <div className="flex justify-between border-b border-line pb-2 mb-2">
                  <span className="font-extrabold text-studio-text capitalize">
                    {format(day, "EEE, dd", { locale: ptBR })}
                  </span>
                  <span className="text-xs font-extrabold bg-studio-green/10 text-studio-green px-2 rounded-full">
                    {dayAppointments.length} atendimentos
                  </span>
                </div>
                <div className="space-y-2">
                  {dayAppointments.slice(0, 3).map((appt) => (
                    <div key={appt.id} className="flex items-center gap-2 text-sm">
                      <span className="text-xs font-semibold text-muted">
                        {format(parseAgendaDate(appt.start_time), "HH:mm")}
                      </span>
                      <span className="text-xs text-muted">•</span>
                      <span className="font-bold text-studio-text truncate">{appt.clients?.name ?? ""}</span>
                      {appt.is_home_visit && (
                        <span className="ml-auto flex items-center justify-center w-6 h-6 rounded-full bg-dom/20 text-dom-strong">
                          <Car className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </button>
            );
          }

          if (hasShiftBlock || hasBlocks) {
            return (
              <div
                key={day.toISOString()}
                className={`bg-white p-4 rounded-3xl shadow-soft opacity-90 ${
                  hasBlocks ? "border-l-4 border-amber-400" : "border border-stone-100"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-studio-text capitalize">
                    {format(day, "EEE, dd", { locale: ptBR })}
                  </span>
                  <div className="flex items-center gap-2">
                    {hasShiftBlock && (
                      <span className="text-xs font-extrabold bg-red-100 text-danger px-2 py-1 rounded-full flex items-center gap-1">
                        <Hospital className="w-3 h-3" /> PLANTÃO
                      </span>
                    )}
                    {hasBlocks && (
                      <span className="text-xs font-extrabold bg-amber-100 text-amber-700 px-2 py-1 rounded-full flex items-center gap-1">
                        Bloqueio parcial
                      </span>
                    )}
                  </div>
                </div>
                {hasBlocks ? (
                  <p className="text-xs text-muted mt-2">{partialBlocks.length} bloqueio(s) parcial(is) neste dia.</p>
                ) : (
                  <p className="text-xs text-muted mt-2">Plantão programado.</p>
                )}
              </div>
            );
          }

          return (
            <div
              key={day.toISOString()}
              className="bg-studio-light p-4 rounded-3xl border border-dashed border-line text-center"
            >
              <span className="font-extrabold text-muted capitalize">{format(day, "EEE, dd", { locale: ptBR })}</span>
              <p className="text-xs text-muted">Agenda livre</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
