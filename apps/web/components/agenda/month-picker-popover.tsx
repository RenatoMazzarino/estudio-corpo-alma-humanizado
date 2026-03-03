"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type MonthPickerPopoverProps = {
  open: boolean;
  monthPickerYear: number;
  monthLabels: string[];
  currentMonthYear: number;
  currentMonthIndex: number;
  onPrevYear: () => void;
  onNextYear: () => void;
  onSelectMonth: (monthIndex: number) => void;
};

export function MonthPickerPopover({
  open,
  monthPickerYear,
  monthLabels,
  currentMonthYear,
  currentMonthIndex,
  onPrevYear,
  onNextYear,
  onSelectMonth,
}: MonthPickerPopoverProps) {
  if (!open) return null;

  return (
    <div className="absolute left-6 right-6 top-full mt-2 bg-white rounded-2xl shadow-float border border-line p-4 z-50 pointer-events-auto">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onPrevYear}
          className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-sm font-extrabold text-studio-text">{monthPickerYear}</div>
        <button
          type="button"
          onClick={onNextYear}
          className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center hover:bg-studio-green hover:text-white transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {monthLabels.map((label, index) => {
          const isActive = monthPickerYear === currentMonthYear && index === currentMonthIndex;
          return (
            <button
              key={`${label}-${index}`}
              type="button"
              onClick={() => onSelectMonth(index)}
              className={`py-2 rounded-xl text-xs font-extrabold transition ${
                isActive
                  ? "bg-studio-green text-white shadow-soft"
                  : "bg-studio-light text-muted hover:text-studio-green hover:bg-studio-green/10"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
