"use client";

import { useMemo, type ReactNode } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface MonthCalendarDot {
  key: string;
  className: string;
  title?: string;
}

type DayTone = "shift" | "none";

interface MonthCalendarProps {
  currentMonth: Date;
  selectedDate?: Date | null;
  onSelectDay?: (day: Date) => void;
  onChangeMonth?: (nextMonth: Date) => void;
  getDayDots?: (day: Date) => MonthCalendarDot[];
  getDayTone?: (day: Date) => DayTone;
  className?: string;
  legend?: ReactNode;
  legendPlacement?: "top" | "bottom";
  headerActions?: ReactNode;
  footer?: ReactNode;
}

const weekdayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];

export function MonthCalendar({
  currentMonth,
  selectedDate,
  onSelectDay,
  onChangeMonth,
  getDayDots,
  className = "",
  legend,
  legendPlacement = "bottom",
  getDayTone,
  headerActions,
  footer,
}: MonthCalendarProps) {
  const monthGridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const legendNode = legend ? <div className="mt-4">{legend}</div> : null;

  return (
    <div className={`bg-white rounded-3xl shadow-soft p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-extrabold text-studio-text capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeMonth?.(addMonths(currentMonth, -1))}
              className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onChangeMonth?.(addMonths(currentMonth, 1))}
              className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {legendPlacement === "top" && legendNode}

      <div className="grid grid-cols-7 gap-1 text-center mb-2 mt-3">
        {weekdayLabels.map((label, index) => (
          <div key={`${label}-${index}`} className="text-[10px] font-extrabold text-muted uppercase">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-4 gap-x-1 text-center text-sm">
        {monthGridDays.map((day) => {
          const isCurrent = isSameMonth(day, currentMonth);
          const isDayToday = isToday(day);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const dots = getDayDots?.(day) ?? [];
          const tone = getDayTone?.(day) ?? "none";
          const toneClass =
            tone === "shift" && !isSelected && !isDayToday ? "bg-purple-50 text-purple-700" : "";
          const todayClass = isDayToday && !isSelected ? "border border-studio-green text-studio-green" : "";
          const selectedClass = isSelected ? "bg-studio-green text-white shadow-soft" : "";

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay?.(day)}
              className="relative flex flex-col items-center"
            >
              <span
                className={`w-8 h-8 flex items-center justify-center rounded-full font-extrabold transition ${
                  isCurrent ? "text-studio-text" : "text-muted/60"
                } ${toneClass} ${todayClass} ${selectedClass}`}
              >
                {format(day, "dd")}
              </span>
              {dots.length > 0 && (
                <div className="absolute -bottom-2 flex items-center gap-1">
                  {dots.map((dot) => (
                    <span
                      key={dot.key}
                      title={dot.title}
                      className={`w-1.5 h-1.5 rounded-full ${dot.className}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {legendPlacement === "bottom" && legendNode}
      {footer ? <div className="mt-4 border-t border-stone-100 pt-4">{footer}</div> : null}
    </div>
  );
}
