"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckSquare, Search, SlidersHorizontal, Square, Upload, User, UserPlus, X } from "lucide-react";

import { ModulePage } from "../../../components/ui/module-page";
import { FloatingActionMenu } from "../../../components/ui/floating-action-menu";
import { Toast, useToast } from "../../../components/ui/toast";
import { importClientsFromContacts } from "../../../src/modules/clients/actions";
import {
  appointmentFormButtonPrimaryClass,
  appointmentFormButtonSecondaryClass,
  appointmentFormHeaderIconButtonClass,
  appointmentFormScreenHeaderClass,
  appointmentFormScreenHeaderTabsClass,
  appointmentFormScreenHeaderTopRowClass,
} from "../novo/appointment-form.styles";
import { ClientListAccordionItem } from "./components/client-list-accordion-item";

interface ClientListItem {
  id: string;
  name: string;
  initials: string | null;
  phone: string | null;
  created_at: string;
  is_vip: boolean;
  needs_attention: boolean;
}

interface ClientQuickChannel {
  primaryPhoneRaw: string | null;
  whatsappPhoneRaw: string | null;
  phoneCount: number;
}

interface ClientsViewProps {
  clients: ClientListItem[];
  lastVisits: Record<string, string>;
  quickChannels: Record<string, ClientQuickChannel>;
  query: string;
  filter: string;
  currentUserName: string | null;
  currentUserAvatarUrl: string | null;
}

type ContactAddress = {
  city?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  dependentLocality?: string;
  streetAddress?: string;
  addressLine?: string[];
  type?: string;
};

type ContactResult = {
  name?: string[];
  tel?: string[];
  email?: string[];
  address?: ContactAddress[];
  birthday?: string;
  organization?: string[];
  note?: string[];
  icon?: Blob[];
};

type NavigatorWithContacts = Navigator & {
  contacts?: {
    select: (properties: string[], options: { multiple: boolean }) => Promise<ContactResult[]>;
  };
};

type ContactImportCandidate = {
  id: string;
  name: string;
  phonePreview: string | null;
  emailPreview: string | null;
  selected: boolean;
  payload: {
    name: string;
    phones: string[];
    emails: string[];
    birthday: string | null;
    addresses: Array<{
      label: string | null;
      cep: string | null;
      logradouro: string | null;
      numero: string | null;
      complemento: string | null;
      bairro: string | null;
      cidade: string | null;
      estado: string | null;
      full: string | null;
    }>;
    organization: string | null;
    note: string | null;
    photo: string | null;
    raw: {
      name: string[] | undefined;
      tel: string[] | undefined;
      email: string[] | undefined;
      address: ContactAddress[] | undefined;
      birthday: string | undefined;
      organization: string[] | undefined;
      note: string[] | undefined;
    };
  };
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Erro ao ler imagem"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(blob);
  });

const extractContactPhoto = async (icon?: Blob[]) => {
  const blob = icon?.[0];
  if (!blob) return null;
  try {
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
};

function getInitials(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized) return "US";
  const parts = normalized.split(" ");
  const first = parts[0]?.[0] ?? "U";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "S") : (parts[0]?.[1] ?? "S");
  return `${first}${second}`.toUpperCase();
}

export function ClientsView({
  clients,
  lastVisits,
  quickChannels,
  query,
  filter,
  currentUserName,
  currentUserAvatarUrl,
}: ClientsViewProps) {
  const { toast, showToast } = useToast();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importCandidates, setImportCandidates] = useState<ContactImportCandidate[]>([]);
  const [searchInput, setSearchInput] = useState(query);
  const router = useRouter();
  const filtersRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && filtersRef.current && !filtersRef.current.contains(target)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [filtersOpen]);

  const grouped = clients.reduce<Record<string, ClientListItem[]>>((acc, client) => {
    const normalized = client.name?.trim() || "";
    const letter = normalized.charAt(0).toUpperCase() || "#";
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(client);
    return acc;
  }, {});

  const existingLetters = Object.keys(grouped).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const buildFilterHref = (nextFilter: string, rawQuery: string = searchInput) => {
    const params = new URLSearchParams();
    const normalizedQuery = rawQuery.trim();
    if (normalizedQuery) params.set("q", normalizedQuery);
    if (nextFilter !== "all") params.set("filter", nextFilter);
    const qs = params.toString();
    return qs ? `/clientes?${qs}` : "/clientes";
  };

  const activeFilterLabel = useMemo(() => {
    if (filter === "vip") return "VIP";
    if (filter === "alert") return "Atencao";
    if (filter === "new") return "Novos";
    return "Todos";
  }, [filter]);

  const selectedCandidatesCount = importCandidates.filter((contact) => contact.selected).length;

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportCandidates([]);
  };

  const handleOpenImportModal = async () => {
    const navigatorWithContacts = navigator as NavigatorWithContacts;
    if (!navigatorWithContacts.contacts?.select) {
      showToast("Importacao disponivel apenas no app instalado ou navegador compativel.", "error");
      return;
    }

    setIsImporting(true);
    try {
      const selected = await navigatorWithContacts.contacts.select(
        ["name", "tel", "email", "address", "birthday", "organization", "note", "icon"],
        { multiple: true }
      );

      if (!selected || selected.length === 0) {
        showToast("Nenhum contato selecionado.", "info");
        return;
      }

      const candidates = (
        await Promise.all(
          selected.map(async (contact, index) => {
            const name = contact.name?.[0]?.trim() ?? "";
            if (!name) return null;

            const phones = (contact.tel ?? []).filter(Boolean);
            const emails = (contact.email ?? []).filter(Boolean);
            const photo = await extractContactPhoto(contact.icon);
            const addresses = (contact.address ?? []).map((address) => {
              const full =
                (address.addressLine ?? []).filter(Boolean).join(", ") ||
                address.streetAddress ||
                "";
              return {
                label: address.type ?? null,
                cep: address.postalCode ?? null,
                logradouro: address.streetAddress ?? (address.addressLine?.[0] ?? null),
                numero: null,
                complemento: null,
                bairro: address.dependentLocality ?? null,
                cidade: address.city ?? address.locality ?? null,
                estado: address.region ?? null,
                full: full || null,
              };
            });

            const candidate: ContactImportCandidate = {
              id: `contact-${Date.now()}-${index}`,
              name,
              phonePreview: phones[0] ?? null,
              emailPreview: emails[0] ?? null,
              selected: true,
              payload: {
                name,
                phones,
                emails,
                birthday: contact.birthday ?? null,
                addresses,
                organization: contact.organization?.[0] ?? null,
                note: contact.note?.[0] ?? null,
                photo,
                raw: {
                  name: contact.name,
                  tel: contact.tel,
                  email: contact.email,
                  address: contact.address,
                  birthday: contact.birthday,
                  organization: contact.organization,
                  note: contact.note,
                },
              },
            };

            return candidate;
          })
        )
      ).filter((item): item is ContactImportCandidate => item !== null);

      if (candidates.length === 0) {
        showToast("Nenhum contato valido encontrado.", "error");
        return;
      }

      setImportCandidates(candidates);
      setImportModalOpen(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        showToast("Importacao cancelada.", "info");
      } else if (
        error instanceof DOMException &&
        ["NotAllowedError", "NotSupportedError", "SecurityError"].includes(error.name)
      ) {
        showToast("Importacao disponivel apenas no app instalado ou navegador compativel.", "error");
      } else {
        showToast("Falha ao importar contatos.", "error");
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    const payload = importCandidates.filter((item) => item.selected).map((item) => item.payload);
    if (payload.length === 0) {
      showToast("Selecione ao menos um contato para importar.", "info");
      return;
    }

    setIsImporting(true);
    try {
      const result = await importClientsFromContacts(payload);
      if (!result.ok) {
        showToast(result.error.message ?? "Falha ao importar contatos.", "error");
        return;
      }

      const { created, skipped } = result.data;
      showToast(
        `Importados ${created} cliente(s)${skipped ? `, ${skipped} ignorado(s)` : ""}.`,
        "success"
      );
      closeImportModal();
      router.refresh();
    } catch {
      showToast("Falha ao importar contatos.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(buildFilterHref(filter, searchInput));
  };

  const safeDisplayName = (currentUserName ?? "").trim() || "Usuario";
  const userInitials = getInitials(safeDisplayName);

  return (
    <>
      <ModulePage
        className="-mx-4 -mt-4"
        contentClassName="flex-1 min-h-0"
        header={
          <header className={appointmentFormScreenHeaderClass}>
            <div className={`${appointmentFormScreenHeaderTopRowClass} justify-between`}>
              <div className="flex min-w-0 items-center gap-2.5">
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
                <div className="min-w-0">
                  <p className="wl-typo-card-name-sm truncate text-white">{safeDisplayName}</p>
                  <p className="text-[11px] text-white/80">Modulo de clientes</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className={appointmentFormHeaderIconButtonClass}
                  aria-label="Importar contatos"
                  onClick={() => void handleOpenImportModal()}
                  disabled={isImporting}
                >
                  <Upload className="h-4 w-4" />
                </button>
                <Link href="/clientes/novo" className={appointmentFormHeaderIconButtonClass} aria-label="Novo cliente">
                  <UserPlus className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className={appointmentFormScreenHeaderTabsClass}>
              <div className="flex items-center gap-2 pb-2">
                <form onSubmit={handleSearchSubmit} className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/75" />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Buscar cliente por nome..."
                    className="h-9 w-full rounded-xl border border-white/25 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/75 focus:border-white/45 focus:outline-none focus:ring-1 focus:ring-white/25"
                  />
                </form>

                <div ref={filtersRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((prev) => !prev)}
                    className={`${appointmentFormHeaderIconButtonClass} gap-1 px-2 text-[11px] font-bold`}
                    aria-label="Filtrar clientes"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeFilterLabel}
                  </button>

                  {filtersOpen ? (
                    <div className="absolute right-0 top-11 z-50 min-w-40 overflow-hidden rounded-xl border border-line wl-surface-card-body shadow-soft">
                      {[
                        { id: "all", label: "Todos" },
                        { id: "vip", label: "VIP" },
                        { id: "alert", label: "Atencao" },
                        { id: "new", label: "Novos" },
                      ].map((item) => (
                        <Link
                          key={item.id}
                          href={buildFilterHref(item.id)}
                          onClick={() => setFiltersOpen(false)}
                          className={`block border-b border-line px-3 py-2 text-xs font-bold last:border-b-0 ${
                            filter === item.id ? "bg-studio-green text-white" : "text-studio-text hover:bg-paper"
                          }`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>
        }
      >
        <div className="flex-1 overflow-y-auto pb-28 pt-3">
          {existingLetters.map((letter) => (
            <section key={letter} id={`clients-letter-${letter}`} className="px-4 pt-3 first:pt-2">
              <div className="sticky top-0 z-10 bg-studio-bg/95 py-2 backdrop-blur">
                <h3 className="pl-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-studio-green">
                  {letter}
                </h3>
              </div>

              <div className="space-y-2">
                {(grouped[letter] ?? []).map((client) => {
                  const lastVisit = lastVisits[client.id];
                  const lastVisitLabel = lastVisit
                    ? format(new Date(lastVisit), "dd MMM", { locale: ptBR })
                    : "Sem visitas";
                  const quickChannel = quickChannels[client.id] ?? {
                    primaryPhoneRaw: client.phone,
                    whatsappPhoneRaw: client.phone,
                    phoneCount: client.phone ? 1 : 0,
                  };

                  return (
                    <ClientListAccordionItem
                      key={client.id}
                      client={client}
                      expanded={expandedClientId === client.id}
                      lastVisitLabel={lastVisitLabel}
                      primaryPhoneRaw={quickChannel.primaryPhoneRaw}
                      whatsappPhoneRaw={quickChannel.whatsappPhoneRaw}
                      phoneCount={quickChannel.phoneCount}
                      onToggleAction={() =>
                        setExpandedClientId((current) => (current === client.id ? null : client.id))
                      }
                    />
                  );
                })}
              </div>
            </section>
          ))}

          {clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-70">
              <User className="mb-4 h-12 w-12 text-muted" />
              <p className="text-sm text-muted">Nenhum cliente encontrado.</p>
            </div>
          ) : null}
        </div>
      </ModulePage>

      {importModalOpen ? (
        <div className="fixed inset-0 z-80 flex items-end bg-black/40 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Fechar importacao"
            onClick={closeImportModal}
          />
          <div className="relative z-10 max-h-[90vh] w-full overflow-hidden rounded-t-3xl border border-line wl-surface-modal">
            <div className="wl-sheet-header-surface px-5 pb-3 pt-4">
              <div className="mb-1 flex items-start justify-between gap-3">
                <div>
                  <h3 className="wl-typo-card-name-md text-white">Importar contatos</h3>
                  <p className="text-xs text-white/80">
                    Marque os contatos que deseja trazer para o sistema.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeImportModal}
                  className={appointmentFormHeaderIconButtonClass}
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[58vh] overflow-y-auto px-4 py-4">
              <div className="wl-surface-card overflow-hidden">
                <div className="wl-surface-card-header flex h-10 items-center justify-between border-b border-line px-3">
                  <p className="wl-typo-card-name-sm text-studio-text">Contatos encontrados</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setImportCandidates((prev) => prev.map((item) => ({ ...item, selected: true })))
                      }
                      className="wl-header-icon-button-strong inline-flex h-8 w-8 items-center justify-center rounded-full"
                      aria-label="Selecionar todos"
                    >
                      <CheckSquare className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setImportCandidates((prev) => prev.map((item) => ({ ...item, selected: false })))
                      }
                      className="wl-header-icon-button-strong inline-flex h-8 w-8 items-center justify-center rounded-full"
                      aria-label="Limpar selecao"
                    >
                      <Square className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="wl-surface-card-body">
                  {importCandidates.map((candidate, index) => (
                    <label
                      key={candidate.id}
                      className={`flex cursor-pointer items-start gap-3 px-3 py-3 ${
                        index < importCandidates.length - 1 ? "border-b border-line" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={candidate.selected}
                        onChange={(event) =>
                          setImportCandidates((prev) =>
                            prev.map((item) =>
                              item.id === candidate.id ? { ...item, selected: event.target.checked } : item
                            )
                          )
                        }
                        className="mt-0.5 h-4 w-4 rounded border-line text-studio-green"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="wl-typo-card-name-sm block text-studio-text">{candidate.name}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {[candidate.phonePreview, candidate.emailPreview].filter(Boolean).join(" - ") ||
                            "Sem telefone/email"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="wl-surface-modal-body border-t border-line px-4 py-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={closeImportModal}
                  className={`${appointmentFormButtonSecondaryClass} h-11`}
                  disabled={isImporting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmImport()}
                  className={`${appointmentFormButtonPrimaryClass} h-11`}
                  disabled={isImporting || selectedCandidatesCount === 0}
                >
                  {isImporting ? "Importando..." : `Importar (${selectedCandidatesCount})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Toast toast={toast} />

      <FloatingActionMenu
        actions={[
          {
            label: "Novo Cliente",
            icon: <UserPlus className="h-5 w-5" />,
            onClick: () => router.push("/clientes/novo"),
            tone: "green",
          },
        ]}
      />
    </>
  );
}
