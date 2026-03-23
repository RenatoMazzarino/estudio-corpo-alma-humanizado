"use client";

import { useMemo, useRef, type ReactNode } from "react";
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
  onSelectDayAction?: (day: Date) => void;
  onChangeMonthAction?: (nextMonth: Date) => void;
  getDayDotsAction?: (day: Date) => MonthCalendarDot[];
  getDayToneAction?: (day: Date) => DayTone;
  isDayDisabledAction?: (day: Date) => boolean;
  className?: string;
  legend?: ReactNode;
  legendPlacement?: "top" | "bottom";
  headerActions?: ReactNode;
  footer?: ReactNode;
  enableSwipe?: boolean;
  framed?: boolean;
  headerSize?: "regular" | "compact";
}

const weekdayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];

export function MonthCalendar({
  currentMonth,
  selectedDate,
  onSelectDayAction,
  onChangeMonthAction,
  getDayDotsAction,
  className = "",
  legend,
  legendPlacement = "bottom",
  getDayToneAction,
  isDayDisabledAction,
  headerActions,
  footer,
  enableSwipe = true,
  framed = true,
  headerSize = "regular",
}: MonthCalendarProps) {
  const monthGridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enableSwipe) return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enableSwipe || !swipeStartRef.current) return;
    const deltaX = event.clientX - swipeStartRef.current.x;
    const deltaY = event.clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    const direction = deltaX < 0 ? 1 : -1;
    onChangeMonthAction?.(addMonths(currentMonth, direction));
  };

  const handlePointerCancel = () => {
    swipeStartRef.current = null;
  };

  const legendNode = legend ? <div className="mt-3">{legend}</div> : null;

  const isCompactHeader = headerSize === "compact";
  return (
    <div
      className={`touch-pan-y ${
        framed ? "wl-surface-card rounded-xl border border-line shadow-soft overflow-hidden" : "bg-transparent overflow-hidden"
      } ${className}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
    >
      <div
        className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-line wl-surface-card-header ${
          isCompactHeader ? "px-3 py-2" : "px-4 py-3"
        }`}
      >
        <button
          type="button"
          onClick={() => onChangeMonthAction?.(addMonths(currentMonth, -1))}
          className={`wl-header-icon-button-soft inline-flex items-center justify-center rounded-full transition ${
            isCompactHeader ? "h-8 w-8" : "h-9 w-9"
          }`}
          aria-label="Mes anterior"
          title="Mes anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="min-w-0 text-center">
          <p className={`${isCompactHeader ? "wl-typo-card-name-sm" : "wl-typo-h2"} capitalize leading-tight text-studio-text`}>
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          {!isCompactHeader ? headerActions : null}
          <button
            type="button"
            onClick={() => onChangeMonthAction?.(addMonths(currentMonth, 1))}
            className={`wl-header-icon-button-soft inline-flex items-center justify-center rounded-full transition ${
              isCompactHeader ? "h-8 w-8" : "h-9 w-9"
            }`}
            aria-label="Proximo mes"
            title="Proximo mes"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 wl-surface-card-body">
        {legendPlacement === "top" && legendNode}

        <div className="mb-1 grid grid-cols-7 gap-1 text-center">
          {weekdayLabels.map((label, index) => (
            <div key={`${label}-${index}`} className="wl-typo-label text-muted">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1.5 text-center">
          {monthGridDays.map((day) => {
            const isCurrent = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const dots = getDayDotsAction?.(day) ?? [];
            const tone = getDayToneAction?.(day) ?? "none";
            const disabled = isDayDisabledAction?.(day) ?? false;
            const toneClass =
              tone === "shift" && !isSelected && !isDayToday ? "bg-red-50 text-red-600" : "";
            const todayClass = isDayToday && !isSelected ? "border border-studio-green text-studio-green" : "";
            const selectedClass = isSelected ? "bg-studio-green text-white shadow-soft" : "";

            return (
              <div key={day.toISOString()} className="py-0.5">
                <button
                  type="button"
                  onClick={disabled ? undefined : () => onSelectDayAction?.(day)}
                  disabled={disabled}
                  className={`mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-lg transition ${
                    disabled ? "opacity-40 cursor-not-allowed" : ""
                  } ${
                    isCurrent ? "text-studio-text" : "text-muted/60"
                  } ${toneClass} ${todayClass} ${selectedClass}`}
                >
                  <span className="wl-typo-body-sm leading-none">{format(day, "d")}</span>
                  {dots.length > 0 ? (
                    <span className="mt-1 flex items-center gap-0.5">
                      {dots.map((dot, index) => (
                        <span
                          key={`${dot.key}-${index}`}
                          title={dot.title}
                          className={`h-1 w-1 rounded-full ${dot.className}`}
                        />
                      ))}
                    </span>
                  ) : (
                    <span className="mt-1 h-1" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {legendPlacement === "bottom" && legendNode}
        {footer ? <div className="mt-4 border-t border-stone-100 pt-4">{footer}</div> : null}
      </div>
    </div>
  );
}
