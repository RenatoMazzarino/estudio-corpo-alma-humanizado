"use client";

import { CalendarClock, CalendarDays, ChevronDown, Clock3, MapPin, NotebookPen, Wallet } from "lucide-react";
import type { ClientHistoryEntry } from "../../../../../lib/attendance/attendance-types";
import {
  formatHistoryDate,
  formatHistoryTime,
  getHistoryHeadlineTag,
  getHistoryLocationLabel,
  getPaymentStatusMeta,
  type HistoryFilter,
} from "./session-stage.helpers";

interface SessionHistoryPanelProps {
  open: boolean;
  onToggleOpenAction: () => void;
  historyFilter: HistoryFilter;
  onChangeFilterAction: (value: HistoryFilter) => void;
  historyCounters: {
    all: number;
    past: number;
    scheduled: number;
  };
  filteredHistory: ClientHistoryEntry[];
  expandedHistoryId: string | null;
  onToggleHistoryAccordionAction: (appointmentId: string) => void;
  onSelectHistoryAction: (item: ClientHistoryEntry) => void;
}

const HISTORY_FILTER_OPTIONS: Array<{ value: HistoryFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "past", label: "Concluidos" },
  { value: "scheduled", label: "Agendados" },
];

export function SessionHistoryPanel({
  open,
  onToggleOpenAction,
  historyFilter,
  onChangeFilterAction,
  historyCounters,
  filteredHistory,
  expandedHistoryId,
  onToggleHistoryAccordionAction,
  onSelectHistoryAction,
}: SessionHistoryPanelProps) {
  const countersByFilter: Record<HistoryFilter, number> = {
    all: historyCounters.all,
    past: historyCounters.past,
    scheduled: historyCounters.scheduled,
  };

  return (
    <div className="wl-surface-card shadow-soft">
      <button
        type="button"
        onClick={onToggleOpenAction}
        className="flex h-12 w-full items-center justify-between gap-3 border-b border-line px-3 text-left wl-surface-card-header"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-studio-green/10 text-studio-green">
            <CalendarDays className="h-4 w-4" />
          </div>
          <h2 className="wl-typo-card-name-md truncate text-studio-text">Agenda do cliente</h2>
        </div>
        <span className="wl-header-icon-button-strong inline-flex h-8 w-8 items-center justify-center rounded-full">
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-3 wl-surface-card-body">
          <div className="mb-0.5 border-b border-line">
            <div className="no-scrollbar flex items-center gap-5 overflow-x-auto">
              {HISTORY_FILTER_OPTIONS.map((option) => {
                const active = historyFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChangeFilterAction(option.value)}
                    className={`relative shrink-0 pb-2 text-left text-[13px] font-semibold transition ${
                      active ? "text-studio-text" : "text-muted"
                    }`}
                  >
                    <span>{option.label}</span>
                    <span className="ml-1 text-[11px]">({countersByFilter[option.value]})</span>
                    <span
                      className={`pointer-events-none absolute -bottom-px left-0 h-0.5 w-full rounded-full transition ${
                        active ? "bg-studio-text" : "bg-transparent"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
            {filteredHistory.length === 0 ? (
              <p className="wl-typo-body-sm rounded-lg border border-line px-3 py-3 text-muted">
                Nenhum atendimento encontrado para este filtro.
              </p>
            ) : (
              filteredHistory.map((item) => {
                const isExpanded = expandedHistoryId === item.appointment_id;
                const paymentMeta = getPaymentStatusMeta(item.appointment_payment_status);
                const headlineTag = getHistoryHeadlineTag(item);
                const hasSavedNotes = Boolean(item.evolution_text?.trim());
                const canOpenNotes = (item.appointment_status === "completed" || item.appointment_status === "no_show") && hasSavedNotes;
                const showStatusTag =
                  historyFilter === "all" ||
                  (historyFilter === "past" && item.appointment_status === "no_show");

                return (
                  <div key={item.appointment_id} className="wl-surface-card">
                    <div className="wl-surface-card-header flex h-10 w-full items-center gap-2 border-b border-line px-3">
                      <button
                        type="button"
                        onClick={() => onToggleHistoryAccordionAction(item.appointment_id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="wl-typo-card-name-xs truncate text-studio-text">{item.service_name}</p>
                          <p className="text-[10px] text-muted">
                            {formatHistoryDate(item.start_time)} - {formatHistoryTime(item.start_time)}
                          </p>
                        </div>
                        {showStatusTag ? (
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] ${headlineTag.badgeClass}`}
                          >
                            {headlineTag.label}
                          </span>
                        ) : null}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (canOpenNotes) onSelectHistoryAction(item);
                        }}
                        disabled={!canOpenNotes}
                        title={canOpenNotes ? "Ver anotacoes" : "Sem anotacoes"}
                        aria-label={canOpenNotes ? "Ver anotacoes" : "Sem anotacoes"}
                        className={`wl-header-icon-button-strong inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                          canOpenNotes ? "" : "opacity-40"
                        }`}
                      >
                        <NotebookPen className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleHistoryAccordionAction(item.appointment_id)}
                        className="wl-header-icon-button-strong inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        aria-label={isExpanded ? "Fechar detalhes da sessao" : "Abrir detalhes da sessao"}
                      >
                        <ChevronDown
                          className={`h-4 w-4 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="wl-surface-card-body px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3 border-b border-line py-2">
                          <p className="wl-typo-chip inline-flex items-center gap-1 text-muted">
                            <MapPin className="h-3 w-3" />
                            Local
                          </p>
                          <p className="wl-typo-body text-right text-studio-text">
                            {getHistoryLocationLabel(item.is_home_visit)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-b border-line py-2">
                          <p className="wl-typo-chip inline-flex items-center gap-1 text-muted">
                            <Clock3 className="h-3 w-3" />
                            Horario
                          </p>
                          <p className="wl-typo-body text-right text-studio-text">{formatHistoryTime(item.start_time)}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-b border-line py-2">
                          <p className="wl-typo-chip inline-flex items-center gap-1 text-muted">
                            <CalendarClock className="h-3 w-3" />
                            Data
                          </p>
                          <p className="wl-typo-body text-right text-studio-text">{formatHistoryDate(item.start_time)}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3 py-2">
                          <p className="wl-typo-chip inline-flex items-center gap-1 text-muted">
                            <Wallet className="h-3 w-3" />
                            Pagamento
                          </p>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] ${paymentMeta.badgeClass}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${paymentMeta.dotClass}`} />
                            {paymentMeta.label}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
