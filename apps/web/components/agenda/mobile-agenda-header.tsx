"use client";

import Image from "next/image";
import { Bell, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { IconButton } from "../ui/buttons";
import { MonthPickerPopover } from "./month-picker-popover";
import type { AgendaView } from "./mobile-agenda.types";

type MobileAgendaHeaderProps = {
  headerCompact: boolean;
  isOnline: boolean;
  currentMonth: Date;
  currentUserName: string | null;
  currentUserAvatarUrl: string | null;
  view: AgendaView;
  monthPickerYear: number;
  monthLabels: string[];
  isMonthPickerOpen: boolean;
  onOpenSearchAction: () => void;
  onSetViewAction: (view: AgendaView) => void;
  onPrevYearAction: () => void;
  onNextYearAction: () => void;
  onSelectMonthAction: (monthIndex: number) => void;
};

function getInitials(value: string) {
  const safe = value
    .replace(/[^a-zA-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!safe) return "US";
  const parts = safe.split(" ");
  const [firstPart = "", secondPart = ""] = parts;
  if (!firstPart) return "US";
  if (!secondPart) return firstPart.slice(0, 2).toUpperCase();
  return `${firstPart.charAt(0)}${secondPart.charAt(0)}`.toUpperCase();
}

export function MobileAgendaHeader({
  headerCompact,
  isOnline,
  currentMonth,
  currentUserName,
  currentUserAvatarUrl,
  view,
  monthPickerYear,
  monthLabels,
  isMonthPickerOpen,
  onOpenSearchAction,
  onSetViewAction,
  onPrevYearAction,
  onNextYearAction,
  onSelectMonthAction,
}: MobileAgendaHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const safeDisplayName = useMemo(() => {
    const normalized = (currentUserName ?? "").trim();
    return normalized.length > 0 ? normalized : "Usuario";
  }, [currentUserName]);

  const userInitials = useMemo(() => getInitials(safeDisplayName), [safeDisplayName]);

  return (
    <>
      <header
        className={`sticky top-0 z-30 bg-studio-bg safe-top safe-top-4 px-5 pb-0 transition-all ${
          headerCompact ? "pt-3" : "pt-4"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="group flex items-center gap-2.5 rounded-lg px-0.5 py-0.5 text-left"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
            >
              <div className="relative h-8 w-8 overflow-hidden rounded-full border border-line bg-[#0B1C13] text-[#FCFAF6]">
                {currentUserAvatarUrl ? (
                  <Image
                    src={currentUserAvatarUrl}
                    alt={safeDisplayName}
                    fill
                    sizes="32px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold uppercase">
                    {userInitials}
                  </span>
                )}
              </div>
              <span className="max-w-[150px] truncate text-[15px] font-semibold text-studio-text">{safeDisplayName}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-muted transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isUserMenuOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-44 rounded-lg border border-line bg-white p-2 shadow-soft">
                <p className="text-[11px] font-medium text-muted">Menu de perfil em construcao.</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <IconButton size="sm" icon={<Search className="h-4 w-4" />} aria-label="Buscar" onClick={onOpenSearchAction} />
            <IconButton
              size="sm"
              icon={<Bell className="h-4 w-4" />}
              aria-label="Notificacoes"
              onClick={() => setIsUserMenuOpen(false)}
            />
            <span
              className={`inline-flex h-2.5 w-2.5 rounded-full border border-white ${
                isOnline ? "bg-emerald-500" : "bg-red-500"
              }`}
              aria-label={isOnline ? "Conectado" : "Sem conexao"}
              title={isOnline ? "Conectado" : "Sem conexao"}
            />
          </div>
        </div>
        <div className="flex gap-6 border-b border-line pb-0.5">
          <button
            type="button"
            onClick={() => onSetViewAction("day")}
            className={`relative pb-2 text-[13px] font-semibold transition-colors ${
              view === "day" ? "text-studio-text" : "text-muted hover:text-studio-green"
            }`}
          >
            Dia
            <span
              className={`absolute inset-x-0 -bottom-px h-0.5 bg-studio-text transition-opacity ${
                view === "day" ? "opacity-100" : "opacity-0"
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => onSetViewAction("week")}
            className={`relative pb-2 text-[13px] font-semibold transition-colors ${
              view === "week" ? "text-studio-text" : "text-muted hover:text-studio-green"
            }`}
          >
            Semana
            <span
              className={`absolute inset-x-0 -bottom-px h-0.5 bg-studio-text transition-opacity ${
                view === "week" ? "opacity-100" : "opacity-0"
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => onSetViewAction("month")}
            className={`relative pb-2 text-[13px] font-semibold transition-colors ${
              view === "month" ? "text-studio-text" : "text-muted hover:text-studio-green"
            }`}
          >
            Calendario
            <span
              className={`absolute inset-x-0 -bottom-px h-0.5 bg-studio-text transition-opacity ${
                view === "month" ? "opacity-100" : "opacity-0"
              }`}
            />
          </button>
        </div>
      </header>

      <MonthPickerPopover
        open={isMonthPickerOpen}
        monthPickerYear={monthPickerYear}
        monthLabels={monthLabels}
        currentMonthYear={currentMonth.getFullYear()}
        currentMonthIndex={currentMonth.getMonth()}
        onPrevYearAction={onPrevYearAction}
        onNextYearAction={onNextYearAction}
        onSelectMonthAction={onSelectMonthAction}
      />
    </>
  );
}
