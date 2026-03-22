"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell, ChevronDown, LogOut, Search, Settings, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "../ui/buttons";
import { MonthPickerPopover } from "./month-picker-popover";
import type { AgendaDayLayoutMode, AgendaView } from "./mobile-agenda.types";

type MobileAgendaHeaderProps = {
  headerCompact: boolean;
  isOnline: boolean;
  currentMonth: Date;
  currentUserName: string | null;
  currentUserAvatarUrl: string | null;
  view: AgendaView;
  dayLayoutMode: AgendaDayLayoutMode;
  monthPickerYear: number;
  monthLabels: string[];
  isMonthPickerOpen: boolean;
  onCloseMonthPickerAction: () => void;
  onOpenSearchAction: () => void;
  onTriggerLoadingPreviewAction?: () => void;
  onSetViewAction: (view: AgendaView) => void;
  onSetDayLayoutModeAction: (mode: AgendaDayLayoutMode) => void;
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
  dayLayoutMode,
  monthPickerYear,
  monthLabels,
  isMonthPickerOpen,
  onCloseMonthPickerAction,
  onOpenSearchAction,
  onTriggerLoadingPreviewAction,
  onSetViewAction,
  onSetDayLayoutModeAction,
  onPrevYearAction,
  onNextYearAction,
  onSelectMonthAction,
}: MobileAgendaHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const safeDisplayName = useMemo(() => {
    const normalized = (currentUserName ?? "").trim();
    return normalized.length > 0 ? normalized : "Usuario";
  }, [currentUserName]);

  const userInitials = useMemo(() => getInitials(safeDisplayName), [safeDisplayName]);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isUserMenuOpen]);

  return (
    <>
      <header
        className={`sticky top-0 z-30 bg-studio-green text-white safe-top safe-top-4 px-5 pb-0 transition-all ${
          headerCompact ? "pt-3" : "pt-4"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div ref={userMenuRef} className="relative">
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
              <span className="wl-typo-card-name-xs max-w-[150px] truncate text-white">{safeDisplayName}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-white/80 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isUserMenuOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-lg border border-line wl-surface-card-body p-1.5 shadow-soft">
                <Link
                  href="/catalogo"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="wl-typo-menu-item flex items-center gap-2 rounded-md px-2.5 py-2 text-studio-text transition hover:bg-paper"
                >
                  <Sparkles className="h-4 w-4 text-studio-green" />
                  Catalogo
                </Link>
                <Link
                  href="/configuracoes"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="wl-typo-menu-item flex items-center gap-2 rounded-md px-2.5 py-2 text-studio-text transition hover:bg-paper"
                >
                  <Settings className="h-4 w-4 text-studio-green" />
                  Configuracoes
                </Link>
                <a
                  href="/auth/logout"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="wl-typo-menu-item flex items-center gap-2 rounded-md px-2.5 py-2 text-red-600 transition hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </a>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <IconButton
              size="sm"
              icon={<Search className="h-4 w-4" />}
              aria-label="Buscar"
              onClick={onOpenSearchAction}
              className="wl-header-icon-button-strong"
            />
            {onTriggerLoadingPreviewAction ? (
              <IconButton
                size="sm"
                icon={<Sparkles className="h-4 w-4" />}
                aria-label="Preview de carregamento"
                onClick={onTriggerLoadingPreviewAction}
                className="wl-header-icon-button-strong"
              />
            ) : null}
            <IconButton
              size="sm"
              icon={<Bell className="h-4 w-4" />}
              aria-label="Notificacoes"
              onClick={() => setIsUserMenuOpen(false)}
              className="wl-header-icon-button-strong"
            />
            <span
              className={`inline-flex h-2.5 w-2.5 rounded-full border border-white/90 ${
                isOnline ? "bg-emerald-500" : "bg-red-500"
              }`}
              aria-label={isOnline ? "Conectado" : "Sem conexao"}
              title={isOnline ? "Conectado" : "Sem conexao"}
            />
          </div>
        </div>
        <div className="flex items-end justify-between gap-3 border-b border-white/25 pb-0.5">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => onSetViewAction("day")}
              className={`relative pb-2 text-[13px] font-semibold transition-colors ${
                view === "day" ? "text-white" : "text-white/75 hover:text-white"
              }`}
            >
              Dia
              <span
                className={`absolute inset-x-0 -bottom-px h-0.5 bg-white transition-opacity ${
                  view === "day" ? "opacity-100" : "opacity-0"
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => onSetViewAction("week")}
              className={`relative pb-2 text-[13px] font-semibold transition-colors ${
                view === "week" ? "text-white" : "text-white/75 hover:text-white"
              }`}
            >
              Semana
              <span
                className={`absolute inset-x-0 -bottom-px h-0.5 bg-white transition-opacity ${
                  view === "week" ? "opacity-100" : "opacity-0"
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => onSetViewAction("month")}
              className={`relative pb-2 text-[13px] font-semibold transition-colors ${
                view === "month" ? "text-white" : "text-white/75 hover:text-white"
              }`}
            >
              Calendario
              <span
                className={`absolute inset-x-0 -bottom-px h-0.5 bg-white transition-opacity ${
                  view === "month" ? "opacity-100" : "opacity-0"
                }`}
              />
            </button>
          </div>
          {view === "day" ? (
            <div className="mb-1 inline-flex items-center gap-1 rounded-md border border-white/30 bg-white/10 p-0.5">
              <button
                type="button"
                onClick={() => onSetDayLayoutModeAction("v1")}
                className={`wl-typo-chip rounded px-2 py-1 transition ${
                  dayLayoutMode === "v1" ? "bg-white text-studio-green" : "text-white/85 hover:bg-white/15"
                }`}
              >
                V1
              </button>
              <button
                type="button"
                onClick={() => onSetDayLayoutModeAction("v2")}
                className={`wl-typo-chip rounded px-2 py-1 transition ${
                  dayLayoutMode === "v2" ? "bg-white text-studio-green" : "text-white/85 hover:bg-white/15"
                }`}
              >
                V2
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <MonthPickerPopover
        open={isMonthPickerOpen}
        monthPickerYear={monthPickerYear}
        monthLabels={monthLabels}
        currentMonthYear={currentMonth.getFullYear()}
        currentMonthIndex={currentMonth.getMonth()}
        onCloseAction={onCloseMonthPickerAction}
        onPrevYearAction={onPrevYearAction}
        onNextYearAction={onNextYearAction}
        onSelectMonthAction={onSelectMonthAction}
      />
    </>
  );
}
