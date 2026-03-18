"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, SlidersHorizontal, Upload, User, UserPlus } from "lucide-react";

import { ModuleHeader } from "../../../components/ui/module-header";
import { ModulePage } from "../../../components/ui/module-page";
import { FloatingActionMenu } from "../../../components/ui/floating-action-menu";
import { Toast, useToast } from "../../../components/ui/toast";
import { importClientsFromContacts } from "../../../src/modules/clients/actions";
import { ClientListAccordionItem } from "./components/client-list-accordion-item";
import { ClientsAlphaRail } from "./components/clients-alpha-rail";

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
}

const alphabet = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));

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

export function ClientsView({
  clients,
  lastVisits,
  quickChannels,
  query,
  filter,
}: ClientsViewProps) {
  const { toast, showToast } = useToast();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [isAlphabetRailVisible, setIsAlphabetRailVisible] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const hideAlphabetRailTimeoutRef = useRef<number | null>(null);
  const router = useRouter();

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
  const existingLettersSet = useMemo(() => new Set(existingLetters), [existingLetters]);

  useEffect(() => {
    setActiveLetter(existingLetters[0] ?? null);
  }, [existingLetters]);

  useEffect(() => {
    const container = document.querySelector("[data-shell-scroll]") as HTMLElement | null;
    if (!container) return;

    const resolveActiveLetter = () => {
      let currentLetter = existingLetters[0] ?? null;
      for (const letter of existingLetters) {
        const section = document.getElementById(`clients-letter-${letter}`);
        if (!section) continue;
        if (container.scrollTop + 84 >= section.offsetTop) {
          currentLetter = letter;
        }
      }
      return currentLetter;
    };

    const handleScroll = () => {
      const top = container.scrollTop;
      const currentLetter = resolveActiveLetter();
      if (currentLetter) setActiveLetter(currentLetter);

      if (top <= 18 || existingLetters.length === 0) {
        setIsAlphabetRailVisible(false);
        if (hideAlphabetRailTimeoutRef.current) {
          window.clearTimeout(hideAlphabetRailTimeoutRef.current);
          hideAlphabetRailTimeoutRef.current = null;
        }
        return;
      }

      setIsAlphabetRailVisible(true);
      if (hideAlphabetRailTimeoutRef.current) {
        window.clearTimeout(hideAlphabetRailTimeoutRef.current);
      }
      hideAlphabetRailTimeoutRef.current = window.setTimeout(() => {
        setIsAlphabetRailVisible(false);
        hideAlphabetRailTimeoutRef.current = null;
      }, 900);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (hideAlphabetRailTimeoutRef.current) {
        window.clearTimeout(hideAlphabetRailTimeoutRef.current);
        hideAlphabetRailTimeoutRef.current = null;
      }
    };
  }, [existingLetters]);

  const buildFilterHref = (nextFilter: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (nextFilter !== "all") params.set("filter", nextFilter);
    const qs = params.toString();
    return qs ? `/clientes?${qs}` : "/clientes";
  };

  const handleLetterClick = (letter: string) => {
    const container = document.querySelector("[data-shell-scroll]") as HTMLElement | null;
    const section = document.getElementById(`clients-letter-${letter}`);
    if (!container || !section) {
      showToast(`Sem clientes na letra ${letter}`, "info");
      return;
    }

    setIsAlphabetRailVisible(true);
    setActiveLetter(letter);
    container.scrollTo({ top: Math.max(section.offsetTop - 8, 0), behavior: "smooth" });
  };

  const handleImportClients = async () => {
    const navigatorWithContacts = navigator as NavigatorWithContacts;
    if (!navigatorWithContacts.contacts?.select) {
      showToast("Importação disponível apenas no app instalado ou navegador compatível.", "error");
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

      const payload = (
        await Promise.all(
          selected.map(async (contact) => {
            const name = contact.name?.[0]?.trim() ?? "";
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

            return {
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
            };
          })
        )
      ).filter((contact) => contact.name.length > 0);

      if (payload.length === 0) {
        showToast("Nenhum contato válido encontrado.", "error");
        return;
      }

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
      router.refresh();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        showToast("Importação cancelada.", "info");
      } else if (
        error instanceof DOMException &&
        ["NotAllowedError", "NotSupportedError", "SecurityError"].includes(error.name)
      ) {
        showToast("Importação disponível apenas no app instalado ou navegador compatível.", "error");
      } else {
        showToast("Falha ao importar contatos.", "error");
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <ModulePage
        header={
          <ModuleHeader
            kicker="Clientes"
            title="Meus clientes"
            subtitle="Busque, abra ações rápidas e entre no perfil completo sem sair do fluxo do app."
            bottomSlot={
              <div className="space-y-3">
                <form method="GET" className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    name="q"
                    defaultValue={query}
                    placeholder="Buscar por nome..."
                    className="w-full rounded-2xl border border-transparent bg-paper py-3 pl-11 pr-4 text-sm font-semibold text-studio-text transition focus:border-studio-green/30 focus:ring-2 focus:ring-studio-green/15"
                  />
                  {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
                </form>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setFiltersOpen((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-xl bg-studio-light px-3 py-2 text-xs font-extrabold text-studio-green"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Filtros
                    </button>
                    {filtersOpen && (
                      <div className="absolute left-0 z-40 mt-2 w-44 rounded-2xl border border-line bg-white p-2 shadow-float">
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
                            className={`block rounded-xl px-3 py-2 text-xs font-extrabold ${
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

                  <button
                    type="button"
                    onClick={handleImportClients}
                    disabled={isImporting}
                    className="inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-studio-text transition hover:bg-white disabled:opacity-60"
                  >
                    <Upload className="h-4 w-4" />
                    {isImporting ? "Importando..." : "Importar contatos"}
                  </button>
                </div>
              </div>
            }
            className="min-h-42"
          />
        }
        contentClassName="relative flex-1"
      >
        <div className="relative flex-1 pb-8">
          <div className="pointer-events-none absolute inset-y-0 right-2 z-20 flex items-center">
            <div className="pointer-events-auto sticky top-1/2 -translate-y-1/2">
              <ClientsAlphaRail
                letters={alphabet}
                existingLetters={existingLettersSet}
                activeLetter={activeLetter}
                visible={isAlphabetRailVisible}
                onSelectLetterAction={handleLetterClick}
              />
            </div>
          </div>

          {existingLetters.map((letter) => (
            <section key={letter} id={`clients-letter-${letter}`} className="px-4 pt-4 first:pt-3">
              <div className="sticky top-0 z-10 bg-studio-bg/95 py-2 backdrop-blur">
                <h3 className="pl-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-studio-green">
                  {letter}
                </h3>
              </div>

              <div className="overflow-hidden rounded-[32px] border border-white bg-white shadow-soft">
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
                    <div key={client.id} className="border-b border-line last:border-b-0">
                      <ClientListAccordionItem
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
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {clients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-70">
              <User className="mb-4 h-12 w-12 text-muted" />
              <p className="text-sm text-muted">Nenhum cliente encontrado.</p>
            </div>
          )}
        </div>
      </ModulePage>

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
