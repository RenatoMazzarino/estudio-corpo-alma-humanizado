"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search } from "lucide-react";
import { ModuleHeader } from "../ui/module-header";
import { IconButton } from "../ui/buttons";
import { MonthPickerPopover } from "./month-picker-popover";
import type { AgendaView } from "./mobile-agenda.types";

type MobileAgendaHeaderProps = {
  headerCompact: boolean;
  isOnline: boolean;
  currentMonth: Date;
  view: AgendaView;
  monthPickerYear: number;
  monthLabels: string[];
  isMonthPickerOpen: boolean;
  onToggleMonthPicker: () => void;
  onOpenSearch: () => void;
  onSetView: (view: AgendaView) => void;
  onPrevYear: () => void;
  onNextYear: () => void;
  onSelectMonth: (monthIndex: number) => void;
};

export function MobileAgendaHeader({
  headerCompact,
  isOnline,
  currentMonth,
  view,
  monthPickerYear,
  monthLabels,
  isMonthPickerOpen,
  onToggleMonthPicker,
  onOpenSearch,
  onSetView,
  onPrevYear,
  onNextYear,
  onSelectMonth,
}: MobileAgendaHeaderProps) {
  return (
    <>
      <ModuleHeader
        kicker="Olá, Janaina"
        title={
          <div className="flex items-center gap-2">
            <span>Sua Agenda de</span>
            <button
              type="button"
              onClick={onToggleMonthPicker}
              className="text-studio-green border-b-2 border-studio-green/20 hover:border-studio-green transition capitalize"
            >
              {format(currentMonth, "MMMM", { locale: ptBR })}
            </button>
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}
              aria-label={isOnline ? "Conectado" : "Sem conexão"}
              title={isOnline ? "Conectado" : "Sem conexão"}
            />
            <IconButton size="sm" icon={<Search className="w-4 h-4" />} aria-label="Buscar" onClick={onOpenSearch} />
          </div>
        }
        bottomSlot={
          <div className="bg-studio-light p-1 rounded-2xl flex justify-between border border-line">
            <button
              type="button"
              onClick={() => onSetView("day")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                view === "day" ? "bg-white text-studio-green shadow-soft" : "text-muted hover:text-studio-green"
              }`}
            >
              DIA
            </button>
            <button
              type="button"
              onClick={() => onSetView("week")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                view === "week" ? "bg-white text-studio-green shadow-soft" : "text-muted hover:text-studio-green"
              }`}
            >
              SEMANA
            </button>
            <button
              type="button"
              onClick={() => onSetView("month")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                view === "month" ? "bg-white text-studio-green shadow-soft" : "text-muted hover:text-studio-green"
              }`}
            >
              MÊS
            </button>
          </div>
        }
        compact={headerCompact}
        className={`${headerCompact ? "min-h-30" : "min-h-37.5"}`}
      />

      <MonthPickerPopover
        open={isMonthPickerOpen}
        monthPickerYear={monthPickerYear}
        monthLabels={monthLabels}
        currentMonthYear={currentMonth.getFullYear()}
        currentMonthIndex={currentMonth.getMonth()}
        onPrevYear={onPrevYear}
        onNextYear={onNextYear}
        onSelectMonth={onSelectMonth}
      />
    </>
  );
}
