"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconActionButton } from "../ui/icon-action-button";

type MonthPickerPopoverProps = {
  open: boolean;
  monthPickerYear: number;
  monthLabels: string[];
  currentMonthYear: number;
  currentMonthIndex: number;
  onCloseAction?: () => void;
  onPrevYearAction: () => void;
  onNextYearAction: () => void;
  onSelectMonthAction: (monthIndex: number) => void;
};

export function MonthPickerPopover({
  open,
  monthPickerYear,
  monthLabels,
  currentMonthYear,
  currentMonthIndex,
  onCloseAction,
  onPrevYearAction,
  onNextYearAction,
  onSelectMonthAction,
}: MonthPickerPopoverProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Fechar seletor de mes"
        onClick={onCloseAction}
        className="fixed inset-0 z-40 bg-transparent"
      />

      <div className="absolute left-4 right-4 top-full z-50 mt-2 pointer-events-auto overflow-hidden wl-surface-card shadow-float">
        <div className="flex items-center justify-between border-b border-line wl-surface-card-header px-3 py-2.5">
          <IconActionButton
            label="Ano anterior"
            icon={<ChevronLeft className="h-4 w-4" />}
            onClick={onPrevYearAction}
            className="wl-header-icon-button-soft"
            size="sm"
          />
          <p className="wl-typo-title text-studio-text">{monthPickerYear}</p>
          <IconActionButton
            label="Proximo ano"
            icon={<ChevronRight className="h-4 w-4" />}
            onClick={onNextYearAction}
            className="wl-header-icon-button-soft"
            size="sm"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 p-3 wl-surface-card-body">
          {monthLabels.map((label, index) => {
            const isActive = monthPickerYear === currentMonthYear && index === currentMonthIndex;
            return (
              <button
                key={`${label}-${index}`}
                type="button"
                onClick={() => onSelectMonthAction(index)}
                className={`wl-typo-label rounded-lg border px-2 py-2 text-center transition ${
                  isActive
                    ? "border-studio-green bg-studio-green text-white shadow-soft"
                    : "border-line wl-surface-card-body text-studio-text hover:bg-paper"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
