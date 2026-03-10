"use client";

import { CalendarClock, CalendarDays, ChevronDown, Clock3, MapPin, Wallet } from "lucide-react";
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
  return (
    <div className="rounded-3xl border border-white bg-white p-4 shadow-soft">
      <button
        type="button"
        onClick={onToggleOpenAction}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-studio-green/10 text-studio-green">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-studio-text">Agenda do cliente</h2>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-muted">
              {historyCounters.all} atendimentos
            </p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3">
          <p className="text-xs text-muted">Filtre a lista e toque no item para abrir os detalhes da sessão.</p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onChangeFilterAction("all")}
              className={`h-9 rounded-full border px-2 text-[11px] font-bold transition ${
                historyFilter === "all"
                  ? "border-studio-green/30 bg-studio-light text-studio-green"
                  : "border-line bg-white text-studio-text"
              }`}
            >
              Ver tudo ({historyCounters.all})
            </button>
            <button
              type="button"
              onClick={() => onChangeFilterAction("past")}
              className={`h-9 rounded-full border px-2 text-[11px] font-bold transition ${
                historyFilter === "past"
                  ? "border-studio-green/30 bg-studio-light text-studio-green"
                  : "border-line bg-white text-studio-text"
              }`}
            >
              Concluídos/No-show ({historyCounters.past})
            </button>
            <button
              type="button"
              onClick={() => onChangeFilterAction("scheduled")}
              className={`h-9 rounded-full border px-2 text-[11px] font-bold transition ${
                historyFilter === "scheduled"
                  ? "border-studio-green/30 bg-studio-light text-studio-green"
                  : "border-line bg-white text-studio-text"
              }`}
            >
              Agendados ({historyCounters.scheduled})
            </button>
          </div>

          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
            {filteredHistory.length === 0 ? (
              <p className="rounded-2xl border border-line bg-paper p-4 text-xs text-muted">
                Nenhum atendimento encontrado para este filtro.
              </p>
            ) : (
              filteredHistory.map((item) => {
                const isExpanded = expandedHistoryId === item.appointment_id;
                const paymentMeta = getPaymentStatusMeta(item.appointment_payment_status);
                const headlineTag = getHistoryHeadlineTag(item);
                const hasSavedNotes = Boolean(item.evolution_text?.trim());
                const canOpenNotes = item.timeline === "past" && hasSavedNotes;

                return (
                  <div key={item.appointment_id} className="rounded-2xl border border-line bg-paper">
                    <button
                      type="button"
                      onClick={() => onToggleHistoryAccordionAction(item.appointment_id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-studio-light/50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-bold text-muted">
                            {formatHistoryDate(item.start_time)} • {formatHistoryTime(item.start_time)}
                          </p>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${headlineTag.badgeClass}`}
                          >
                            {headlineTag.label}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-base font-bold text-studio-text">{item.service_name}</p>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-white">
                        <ChevronDown
                          className={`h-4 w-4 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-line bg-white px-4 py-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-line bg-paper px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted inline-flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" />
                              Serviço
                            </p>
                            <p className="mt-1 truncate text-xs font-semibold text-studio-text">{item.service_name}</p>
                          </div>
                          <div className="rounded-xl border border-line bg-paper px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Local
                            </p>
                            <p className="mt-1 truncate text-xs font-semibold text-studio-text">
                              {getHistoryLocationLabel(item.is_home_visit)}
                            </p>
                          </div>
                          <div className="col-span-2 rounded-xl border border-line bg-paper px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted inline-flex items-center gap-1">
                              <Clock3 className="h-3 w-3" />
                              Horário
                            </p>
                            <p className="mt-1 text-xs font-semibold text-studio-text">
                              {formatHistoryTime(item.start_time)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 rounded-xl border border-line bg-paper px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold text-muted inline-flex items-center gap-1">
                              <Wallet className="h-3 w-3" />
                              Status do pagamento
                            </p>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${paymentMeta.badgeClass}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${paymentMeta.dotClass}`} />
                              {paymentMeta.label}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectHistoryAction(item)}
                          disabled={!canOpenNotes}
                          className={`mt-3 h-9 rounded-xl border px-3 text-[10px] font-extrabold uppercase tracking-wider ${
                            canOpenNotes
                              ? "border-studio-green/30 bg-white text-studio-green"
                              : "border-line bg-stone-100 text-muted"
                          }`}
                        >
                          {canOpenNotes ? "Ver anotações" : "Sem anotações"}
                        </button>
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
