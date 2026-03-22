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
    <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center p-6">
      <div className="wl-surface-modal w-full max-h-[80vh] rounded-3xl shadow-float overflow-hidden flex flex-col border border-line">
        <div className="sticky top-0 wl-sheet-header-surface px-6 pt-5 pb-4 shadow-soft z-10">
          <div className="flex items-center gap-3">
            <IconButton
              size="sm"
              icon={<ChevronLeft className="w-4 h-4" />}
              aria-label="Voltar"
              onClick={onCloseAction}
            />
            <Search className="w-4 h-4 text-muted" />
            <input
              autoFocus
              value={searchTerm}
              onChange={(event) => onSearchTermChangeAction(event.target.value)}
              placeholder="Buscar em tudo..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/75 focus:outline-none"
            />
            <button
              type="button"
              onClick={onSearchClickAction}
              className="text-xs font-extrabold text-studio-green px-3 py-1.5 rounded-full bg-studio-light"
            >
              Buscar
            </button>
          </div>
          <p className="text-[11px] text-white/80 mt-2">Digite ao menos 3 letras para ver resultados.</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-8">
          {isSearching && <div className="py-6 text-xs text-muted">Buscando...</div>}

          {!isSearching && !hasQuery && (
            <div className="py-10 text-center text-xs text-muted">Digite para começar a buscar.</div>
          )}

          {!isSearching && hasQuery && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-studio-green">Agenda</h3>
                <div className="mt-3 space-y-2">
                  {results.appointments.length === 0 && (
                    <p className="text-xs text-muted">Nenhum atendimento encontrado.</p>
                  )}
                  {results.appointments.map((item) => {
                    const when = format(parseDate(item.start_time), "dd MMM • HH:mm", { locale: ptBR });
                    const clientName = item.clients?.name ?? "Cliente";
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectAppointmentAction(item)}
                        className="w-full text-left bg-paper rounded-2xl px-4 py-3 border border-line hover:bg-studio-light transition"
                      >
                        <div className="text-sm font-extrabold text-studio-text">{clientName}</div>
                        <div className="text-xs text-muted">
                          {item.service_name} • {when}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-studio-green">Clientes</h3>
                <div className="mt-3 space-y-2">
                  {results.clients.length === 0 && (
                    <p className="text-xs text-muted">Nenhum cliente encontrado.</p>
                  )}
                  {results.clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => onSelectClientAction(client)}
                      className="w-full text-left bg-paper rounded-2xl px-4 py-3 border border-line hover:bg-studio-light transition"
                    >
                      <div className="text-sm font-extrabold text-studio-text">{client.name}</div>
                      {client.phone && <div className="text-xs text-muted">{client.phone}</div>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
