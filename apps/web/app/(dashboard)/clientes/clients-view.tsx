"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, User, ChevronRight, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Chip } from "../../../components/ui/chip";
import { ModuleHeader } from "../../../components/ui/module-header";

interface ClientListItem {
  id: string;
  name: string;
  initials: string | null;
  phone: string | null;
  created_at: string;
  is_vip: boolean;
  needs_attention: boolean;
}

interface ClientsViewProps {
  clients: ClientListItem[];
  lastVisits: Record<string, string>;
  query: string;
  filter: string;
}

const alphabet = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));

export function ClientsView({ clients, lastVisits, query, filter }: ClientsViewProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const grouped = useMemo(() => {
    return clients.reduce<Record<string, ClientListItem[]>>((acc, client) => {
      const normalized = client.name?.trim() || "";
      const letter = normalized.charAt(0).toUpperCase() || "#";
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(client);
      return acc;
    }, {});
  }, [clients]);

  const existingLetters = useMemo(
    () => Object.keys(grouped).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [grouped]
  );

  const buildFilterHref = (nextFilter: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (nextFilter !== "all") params.set("filter", nextFilter);
    const qs = params.toString();
    return qs ? `/clientes?${qs}` : "/clientes";
  };

  const handleLetterClick = (letter: string) => {
    const section = document.getElementById(`clients-letter-${letter}`);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setToast(`Sem clientes na letra ${letter}`);
  };

  return (
    <div className="flex flex-col min-h-full bg-studio-bg -mx-4 -mt-4">
      <ModuleHeader
        title="Meus Clientes"
        bottomSlot={
          <div className="space-y-3">
            <form method="GET" className="relative">
              <Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Buscar por nome..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-paper border border-transparent focus:border-studio-green/30 focus:ring-2 focus:ring-studio-green/15 text-sm font-semibold text-studio-text transition"
              />
              {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
            </form>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-studio-light text-studio-green text-xs font-extrabold"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtros
                <ChevronDown className="w-3 h-3" />
              </button>
              {filter !== "all" && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full bg-studio-green/10 text-[10px] font-extrabold text-studio-green uppercase">
                  {filter === "vip" ? "VIP" : filter === "alert" ? "Atenção" : "Novos"}
                </span>
              )}
              {filtersOpen && (
                <div className="absolute mt-2 w-44 rounded-2xl bg-white shadow-float border border-line p-2 z-40">
                  {[
                    { id: "all", label: "Todos" },
                    { id: "vip", label: "VIP" },
                    { id: "alert", label: "Atenção" },
                    { id: "new", label: "Novos" },
                  ].map((item) => (
                    <Link
                      key={item.id}
                      href={buildFilterHref(item.id)}
                      onClick={() => setFiltersOpen(false)}
                      className={`block px-3 py-2 rounded-xl text-xs font-extrabold ${
                        filter === item.id
                          ? "bg-studio-green text-white"
                          : "text-studio-text hover:bg-studio-light"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        }
        className="min-h-[168px]"
      />

      <div className="relative flex-1 pb-24">
        <div className="pointer-events-none absolute right-2 top-36 z-20 flex flex-col gap-1">
          {alphabet.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => handleLetterClick(letter)}
              className="pointer-events-auto text-[9px] font-extrabold text-studio-green px-2 py-0.5 rounded-full bg-studio-light/80 border border-studio-green/10"
            >
              {letter}
            </button>
          ))}
        </div>

        {existingLetters.map((letter) => (
          <section key={letter} id={`clients-letter-${letter}`} className="px-6 pt-4">
            <div className="sticky top-[152px] z-10 bg-studio-bg/90 backdrop-blur py-2">
              <h3 className="text-[11px] font-extrabold text-studio-green uppercase tracking-[0.2em]">
                {letter}
              </h3>
            </div>

            <div className="bg-white rounded-3xl border border-white shadow-soft overflow-hidden divide-y divide-line">
              {(grouped[letter] ?? []).map((client) => {
                const lastVisit = lastVisits[client.id];
                const lastVisitLabel = lastVisit
                  ? format(new Date(lastVisit), "dd MMM", { locale: ptBR })
                  : "Sem visitas";
                return (
                  <Link
                    key={client.id}
                    href={`/clientes/${client.id}`}
                    className="flex items-center gap-4 px-4 py-4 transition active:scale-[0.99] hover:bg-studio-light/60"
                  >
                    <div className="w-11 h-11 rounded-full bg-studio-light text-studio-green flex items-center justify-center font-serif font-bold text-sm">
                      {client.initials || <User className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <h4 className="font-extrabold text-studio-text text-sm truncate">{client.name}</h4>
                        {client.is_vip && <Chip tone="success">VIP</Chip>}
                        {client.needs_attention && <Chip tone="danger">Atenção</Chip>}
                      </div>
                      <p className="text-[11px] text-muted font-semibold">Última visita: {lastVisitLabel}</p>
                      {client.phone && (
                        <span className="mt-1 inline-flex text-[11px] text-muted bg-studio-light px-2 py-0.5 rounded-full">
                          {client.phone}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted/60" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {clients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-70">
            <User className="w-12 h-12 text-muted mb-4" />
            <p className="text-muted text-sm">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-studio-text text-white text-xs px-4 py-2 rounded-full shadow-float z-40">
          {toast}
        </div>
      )}
    </div>
  );
}
