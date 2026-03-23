"use client";

import { ChevronLeft, Search } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { IconButton } from "../ui/buttons";

export interface SearchAppointmentResult {
  id: string;
  service_name: string;
  start_time: string;
  clients: { id: string; name: string; phone: string | null } | null;
}

export interface SearchClientResult {
  id: string;
  name: string;
  phone: string | null;
}

export interface SearchResults {
  appointments: SearchAppointmentResult[];
  clients: SearchClientResult[];
}

interface AgendaSearchModalProps {
  open: boolean;
  searchTerm: string;
  isSearching: boolean;
  results: SearchResults;
  onCloseAction: () => void;
  onSearchTermChangeAction: (value: string) => void;
  onSearchClickAction: () => void;
  onSelectAppointmentAction: (appointment: SearchAppointmentResult) => void;
  onSelectClientAction: (client: SearchClientResult) => void;
}

const parseDate = (value: string) => {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date(value);
};

export function AgendaSearchModal({
  open,
  searchTerm,
  isSearching,
  results,
  onCloseAction,
  onSearchTermChangeAction,
  onSearchClickAction,
  onSelectAppointmentAction,
  onSelectClientAction,
}: AgendaSearchModalProps) {
  if (!open) return null;
  const hasQuery = searchTerm.trim().length >= 3;

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center bg-black/40 p-6 backdrop-blur-sm">
      <div className="wl-surface-modal flex max-h-[80vh] w-full flex-col overflow-hidden rounded-xl shadow-float">
        <div className="wl-sheet-header-surface sticky top-0 z-10 px-5 pb-3 pt-4">
          <div className="flex items-center gap-3">
            <IconButton
              size="sm"
              icon={<ChevronLeft className="h-4 w-4" />}
              aria-label="Voltar"
              onClick={onCloseAction}
            />
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                value={searchTerm}
                onChange={(event) => onSearchTermChangeAction(event.target.value)}
                placeholder="Buscar em agenda e clientes..."
                className="w-full rounded-xl wl-surface-input border border-line py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-muted caret-studio-text focus:outline-none focus:ring-1 focus:ring-studio-green"
              />
            </div>
            <button
              type="button"
              onClick={onSearchClickAction}
              className="wl-typo-button inline-flex h-8 items-center justify-center rounded-full bg-white px-3 text-studio-green transition hover:bg-paper"
            >
              Buscar
            </button>
          </div>
          <p className="mt-2 text-[11px] text-white/80">Digite ao menos 3 letras para ver resultados.</p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-6 pt-4">
          {isSearching ? <div className="py-6 text-xs text-muted">Buscando...</div> : null}

          {!isSearching && !hasQuery ? (
            <div className="py-10 text-center text-xs text-muted">Digite para comecar a buscar.</div>
          ) : null}

          {!isSearching && hasQuery ? (
            <>
              <section className="wl-surface-card overflow-hidden rounded-xl">
                <div className="wl-surface-card-header flex h-10 items-center border-b border-line px-3">
                  <h3 className="wl-typo-card-title-sm font-bold text-studio-text">Agendamentos</h3>
                </div>
                <div className="wl-surface-card-body">
                  {results.appointments.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted">Nenhum atendimento encontrado.</p>
                  ) : (
                    results.appointments.map((item, index) => {
                      const when = format(parseDate(item.start_time), "dd MMM - HH:mm", { locale: ptBR });
                      const clientName = item.clients?.name ?? "Cliente";
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectAppointmentAction(item)}
                          className={`w-full px-3 py-3 text-left transition hover:bg-paper ${
                            index < results.appointments.length - 1 ? "border-b border-line" : ""
                          }`}
                        >
                          <p className="wl-typo-card-name-sm text-studio-text">{clientName}</p>
                          <p className="wl-typo-body-sm mt-0.5 text-muted">{item.service_name}</p>
                          <p className="wl-typo-body-sm mt-0.5 text-muted">{when}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="wl-surface-card overflow-hidden rounded-xl">
                <div className="wl-surface-card-header flex h-10 items-center border-b border-line px-3">
                  <h3 className="wl-typo-card-title-sm font-bold text-studio-text">Clientes</h3>
                </div>
                <div className="wl-surface-card-body">
                  {results.clients.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted">Nenhum cliente encontrado.</p>
                  ) : (
                    results.clients.map((client, index) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => onSelectClientAction(client)}
                        className={`w-full px-3 py-3 text-left transition hover:bg-paper ${
                          index < results.clients.length - 1 ? "border-b border-line" : ""
                        }`}
                      >
                        <p className="wl-typo-card-name-sm text-studio-text">{client.name}</p>
                        {client.phone ? <p className="wl-typo-body-sm mt-0.5 text-muted">{client.phone}</p> : null}
                      </button>
                    ))
                  )}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
