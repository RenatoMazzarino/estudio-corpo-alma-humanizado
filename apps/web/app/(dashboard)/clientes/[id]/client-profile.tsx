"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { differenceInYears } from "date-fns";
import {
  ArrowLeft,
  Briefcase,
  CalendarPlus,
  CircleDollarSign,
  Copy,
  EllipsisVertical,
  ExternalLink,
  FileText,
  HeartPulse,
  Mail,
  MapPin,
  MessageCircle,
  PencilLine,
  Phone,
  Share2,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { Chip } from "../../../../components/ui/chip";
import { Toast, useToast } from "../../../../components/ui/toast";
import { WhatsAppIcon } from "../../../../components/ui/whatsapp-icon";
import { formatBrazilPhone } from "../../../../src/shared/phone";
import {
  buildClientPhoneHref,
  buildClientWhatsAppHref,
  buildNewAppointmentHref,
} from "../../../../src/modules/clients/contact-links";
import {
  appointmentFormButtonDangerClass,
  appointmentFormButtonSecondaryClass,
  appointmentFormHeaderIconButtonClass,
  appointmentFormScreenHeaderTopRowClass,
} from "../../novo/appointment-form.styles";
import type {
  ClientDetailSnapshot,
  ClientPaymentMethodSummary,
  ClientProntuarioEntry,
} from "../../../../src/modules/clients/profile-data";
import { deleteClient } from "./actions";
import { NotesSection } from "./notes-section";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "CA";
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? "CA";
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

function formatCpf(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 11);
  if (digits.length !== 11) return value ?? "-";
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return shortDateFormatter.format(date);
}

function formatBirthDateWithAge(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const age = differenceInYears(new Date(), date);
  return longDateFormatter.format(date) + " (" + age + " anos)";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateTimeFormatter.format(date);
}

function formatAnamneseStatus(value: "nao_enviado" | "enviado" | "respondido") {
  if (value === "respondido") return "Respondido";
  if (value === "enviado") return "Enviado";
  return "Nao enviado";
}

function buildAddressLine(parts: Array<string | null | undefined>) {
  const filtered = parts.map((value) => value?.trim()).filter(Boolean);
  return filtered.length > 0 ? filtered.join(", ") : null;
}

function getLegacyAddress(snapshot: ClientDetailSnapshot) {
  const client = snapshot.client;
  return (
    buildAddressLine([
      client.address_logradouro,
      client.address_numero,
      client.address_complemento,
      client.address_bairro,
      client.address_cidade,
      client.address_estado,
      client.address_cep,
    ]) ?? client.endereco_completo ?? null
  );
}

function formatStars(value: number) {
  const normalized = Math.max(0, Math.min(5, value));
  return `${normalized}/5`;
}

function formatChannelLabel(value: string | null | undefined) {
  if (!value) return "Outro";
  const trimmed = value.trim();
  if (!trimmed) return "Outro";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function formatClinicalSeverity(value: string | null | undefined) {
  if (value === "alta") return "Alta";
  if (value === "moderada") return "Moderada";
  if (value === "leve") return "Leve";
  return "Nao definida";
}

function ActionIconLink({
  href,
  label,
  icon,
  tone = "default",
}: {
  href: string | null;
  label: string;
  icon: ReactNode;
  tone?: "default" | "green";
}) {
  const className =
    "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition active:scale-95 " +
    (tone === "green"
      ? "border-white/30 bg-white/20 text-white hover:bg-white/30"
      : "border-white/25 bg-white/10 text-white hover:bg-white/20");

  if (!href) {
    return (
      <span className={className + " cursor-not-allowed opacity-45"} aria-label={label + " indisponivel"}>
        {icon}
        {label}
      </span>
    );
  }

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className} aria-label={label} title={label} prefetch={false}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <a href={href} className={className} aria-label={label} title={label} target="_blank" rel="noreferrer">
      {icon}
      {label}
    </a>
  );
}

function SectionCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="wl-surface-card overflow-hidden">
      <div className="wl-surface-card-header flex h-10 items-center justify-between border-b border-line px-3">
        <div className="flex items-center gap-2 text-studio-green">
          {icon}
          <p className="wl-typo-card-name-sm text-studio-text">{title}</p>
        </div>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SectionRow({
  icon,
  label,
  value,
  meta,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="flex gap-3 border-t border-line px-4 py-3.5 first:border-t-0">
      <div className="mt-0.5 text-studio-green">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">{label}</p>
        <div className="mt-1 text-sm font-semibold text-studio-text">{value}</div>
        {meta ? <div className="mt-1">{meta}</div> : null}
      </div>
    </div>
  );
}

function HeaderMetricInline({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex h-[76px] flex-col items-center justify-center px-3 py-2 text-center">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">{label}</p>
      <div className="mt-1 text-sm font-semibold text-studio-text">{value}</div>
    </div>
  );
}

function MetricsStripCard({
  sessions,
  lastVisit,
  loyalty,
}: {
  sessions: ReactNode;
  lastVisit: ReactNode;
  loyalty: ReactNode;
}) {
  return (
    <div className="wl-surface-card overflow-hidden rounded-none border-x-0 border-t-0">
      <div className="grid grid-cols-3 divide-x divide-line">
        <HeaderMetricInline label="Sessoes" value={sessions} />
        <HeaderMetricInline label="Ultima visita" value={lastVisit} />
        <HeaderMetricInline label="Fidelidade" value={loyalty} />
      </div>
    </div>
  );
}

function NameMetaField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-studio-text">{value}</p>
    </div>
  );
}

function PaymentMethodBar({ method }: { method: ClientPaymentMethodSummary }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-studio-text">
        <span>{method.label}</span>
        <span>{method.percentage}%</span>
      </div>
      <div className="h-2 rounded-full bg-white">
        <div
          className="h-2 rounded-full bg-studio-green transition-all"
          style={{ width: Math.max(method.percentage, method.percentage > 0 ? 12 : 0) + "%" }}
        />
      </div>
    </div>
  );
}

function FinancialListRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className={accent ? "text-base font-bold text-studio-text" : "text-sm font-semibold text-studio-text"}>{value}</div>
    </div>
  );
}

function ClinicalItemsList({
  emptyText,
  toneClass,
  items,
}: {
  emptyText: string;
  toneClass: string;
  items: Array<{ id: string; label: string; notes: string | null; severity: string | null; is_active: boolean | null }>;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className={`rounded-xl border p-3 ${toneClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-studio-text">{item.label}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${
                  item.is_active === false
                    ? "bg-studio-light text-muted"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {item.is_active === false ? "Inativo" : "Ativo"}
              </span>
              <span className="inline-flex rounded-md bg-white/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-studio-text">
                {formatClinicalSeverity(item.severity)}
              </span>
            </div>
          </div>
          {item.notes ? (
            <div className="mt-2 border-t border-line/70 pt-2">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">Observacoes</p>
              <p className="mt-1 text-sm text-muted">{item.notes}</p>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}


function DeleteClientDialog({
  open,
  deleting,
  clientName,
  onCloseAction,
  onConfirmAction,
}: {
  open: boolean;
  deleting: boolean;
  clientName: string;
  onCloseAction: () => void;
  onConfirmAction: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/35 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label="Fechar exclusao" onClick={onCloseAction} />
      <div className="relative z-10 mx-6 w-full max-w-sm overflow-hidden rounded-2xl wl-surface-modal shadow-float">
        <div className="wl-sheet-header-surface px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="wl-typo-card-name-md text-white">Excluir cliente?</h3>
            <button
              type="button"
              onClick={onCloseAction}
              className={appointmentFormHeaderIconButtonClass}
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="wl-surface-modal-body px-4 py-4">
          <p className="text-sm text-muted">
            {clientName} sera removido(a) do cadastro. Use esta acao apenas quando tiver certeza.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={onCloseAction} className={appointmentFormButtonSecondaryClass}>
              Manter
            </button>
            <button
              type="button"
              onClick={onConfirmAction}
              disabled={deleting}
              className={appointmentFormButtonDangerClass}
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryItem({ entry }: { entry: ClientProntuarioEntry }) {
  return (
    <div className="rounded-2xl border border-line bg-paper/70 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-studio-text">{entry.serviceName}</p>
          <p className="text-xs text-muted">
            {formatShortDate(entry.startTime)} - {entry.isHomeVisit ? "Domicilio" : "Estudio"}
          </p>
        </div>
        <Chip tone={entry.status === "completed" ? "success" : "dom"}>
          {entry.status === "completed" ? "Concluido" : entry.status || "Registrado"}
        </Chip>
      </div>
      {entry.evolutionText ? (
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-studio-text">{entry.evolutionText}</p>
      ) : entry.internalNotes ? (
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-studio-text">{entry.internalNotes}</p>
      ) : (
        <p className="mt-2 text-sm text-muted">Sem evolucao textual registrada nesta sessao.</p>
      )}
    </div>
  );
}

export function ClientProfile({ snapshot }: { snapshot: ClientDetailSnapshot }) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const { client, phones, emails, addresses, healthItems, history, finance, anamnesis, prontuarioEntries } = snapshot;
  const initials = client.initials || getInitials(client.name);
  const primaryPhone = phones.find((phone) => phone.is_primary) ?? phones[0] ?? null;
  const whatsappPhone = phones.find((phone) => phone.is_whatsapp) ?? primaryPhone;
  const callHref = buildClientPhoneHref(primaryPhone?.number_raw ?? client.phone);
  const whatsappHref = buildClientWhatsAppHref(whatsappPhone?.number_raw ?? client.phone);
  const scheduleHref = buildNewAppointmentHref(client.id, "/clientes/" + client.id);
  const prontuarioHref = "/clientes/" + client.id + "/prontuario";
  const editHref = "/clientes/" + client.id + "/editar";
  const firstName = client.public_first_name?.trim() || "-";
  const lastName = client.public_last_name?.trim() || "-";
  const publicName =
    client.public_name?.trim() || [client.public_first_name, client.public_last_name].filter(Boolean).join(" ") || null;
  const internalName = client.system_name?.trim() || client.name?.trim() || "-";
  const shortName = client.short_name?.trim() || firstName;
  const clientCode = client.client_code?.trim() || "-";
  const internalReference = client.internal_reference?.trim() || "-";
  const birthDate = client.birth_date ?? client.data_nascimento ?? null;
  const legacyAddress = getLegacyAddress(snapshot);
  const paymentMethods = finance.paymentMethods;
  const recentHistory = history.slice(0, 6);
  const healthTags = [...anamnesis.healthTags];
  const allergyItems = healthItems.filter((item) => item.type === "allergy");
  const conditionItems = healthItems.filter((item) => item.type === "condition" || item.type === "tag");
  const contraindicationItems = healthItems.filter((item) => item.type === "contraindication");
  const lastVisitLabel = recentHistory[0] ? formatShortDate(recentHistory[0].start_time) : "-";

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  const handleShare = async () => {
    setMenuOpen(false);
    const url = typeof window !== "undefined" ? window.location.href : "/clientes/" + client.id;

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: "Cliente - " + client.name,
          text: "Perfil interno de " + client.name,
          url,
        });
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      showToast("Link do perfil pronto para compartilhar.", "success");
    } catch {
      showToast("Nao foi possivel compartilhar agora.", "error");
    }
  };

  const handleCopyPhone = async () => {
    setMenuOpen(false);
    const phone = primaryPhone?.number_raw ?? client.phone ?? "";
    if (!phone || !navigator.clipboard?.writeText) {
      showToast("Telefone principal indisponivel para copia.", "info");
      return;
    }

    try {
      await navigator.clipboard.writeText(phone);
      showToast("Telefone principal copiado.", "success");
    } catch {
      showToast("Nao foi possivel copiar o telefone.", "error");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteClient(client.id);
      if (!result.ok) {
        showToast(result.error.message ?? "Falha ao excluir cliente.", "error");
        return;
      }
      showToast("Cliente excluido com sucesso.", "success");
      router.push("/clientes");
      router.refresh();
    } catch {
      showToast("Falha ao excluir cliente.", "error");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <>
      <div className="pb-10">
        <header className="sticky top-0 z-30 -mx-4 -mt-4 min-h-27 bg-studio-green text-white safe-top safe-top-4 px-5 pb-0 pt-4">
          <div className={`${appointmentFormScreenHeaderTopRowClass} items-start justify-between`}>
            <div className="flex min-w-0 items-start gap-2.5">
              <button
                type="button"
                onClick={() => router.push("/clientes")}
                className={`${appointmentFormHeaderIconButtonClass} mt-0.5 shrink-0`}
                aria-label="Voltar para clientes"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/35 bg-studio-green-dark text-base font-serif font-bold text-white">
                {client.avatar_url ? (
                  <Image src={client.avatar_url} alt={client.name} fill sizes="48px" className="object-cover" unoptimized />
                ) : (
                  initials
                )}
              </div>

              <div className="min-w-0">
                <h1 className="truncate wl-typo-card-name-lg text-white">{client.name}</h1>
                <p className="mt-0.5 text-sm font-semibold text-white/90">
                  Cliente desde {formatShortDate(client.created_at)}
                </p>
              </div>
            </div>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className={appointmentFormHeaderIconButtonClass}
                aria-label="Abrir ações do cliente"
              >
                <EllipsisVertical className="h-4 w-4" />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-10 z-20 min-w-52 overflow-hidden rounded-xl border border-line wl-surface-card-body shadow-soft">
                  <Link
                    href={editHref}
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 border-b border-line px-3 py-2.5 text-left text-[13px] font-bold text-studio-text transition hover:bg-paper"
                  >
                    <PencilLine className="h-4 w-4" />
                    Editar cadastro
                  </Link>
                  <button type="button" onClick={handleShare} className="flex w-full items-center gap-2 border-b border-line px-3 py-2.5 text-left text-[13px] font-bold text-studio-text transition hover:bg-paper">
                    <Share2 className="h-4 w-4" />
                    Compartilhar perfil
                  </button>
                  <Link href={prontuarioHref} className="flex w-full items-center gap-2 border-b border-line px-3 py-2.5 text-left text-[13px] font-bold text-studio-text transition hover:bg-paper" onClick={() => setMenuOpen(false)}>
                    <FileText className="h-4 w-4" />
                    Abrir prontuário
                  </Link>
                  <button type="button" onClick={handleCopyPhone} className="flex w-full items-center gap-2 border-b border-line px-3 py-2.5 text-left text-[13px] font-bold text-studio-text transition hover:bg-paper">
                    <Copy className="h-4 w-4" />
                    Copiar telefone
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-bold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir cliente
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-2 pb-3">
            <ActionIconLink href={callHref} label="Ligar" icon={<Phone className="h-4 w-4" />} />
            <ActionIconLink href={whatsappHref} label="Mensagem" icon={<MessageCircle className="h-4 w-4" />} tone="green" />
            <ActionIconLink href={scheduleHref} label="Agendar" icon={<CalendarPlus className="h-4 w-4" />} tone="green" />
            <ActionIconLink href={prontuarioHref} label="Prontuario" icon={<FileText className="h-4 w-4" />} />
          </div>
        </header>

        <section className="-mx-4 px-0 pb-2 pt-2">
          <MetricsStripCard
            sessions={finance.completedSessionsCount}
            lastVisit={lastVisitLabel}
            loyalty={formatStars(finance.fidelityStars)}
          />
        </section>

        <div className="space-y-4 px-4 pt-4">
        <SectionCard title="Perfil e identificacao" icon={<UserRound className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4">
            <NameMetaField label="Codigo interno" value={clientCode} />
            <NameMetaField label="Nome curto" value={shortName} />
            <NameMetaField label="Primeiro nome" value={firstName} />
            <NameMetaField label="Sobrenome" value={lastName} />
            <NameMetaField label="Nome publico" value={publicName || "-"} />
            <NameMetaField label="Nome no sistema" value={internalName} />
            <NameMetaField label="Referencia interna" value={internalReference} />
            <NameMetaField label="Cliente desde" value={formatShortDate(client.created_at)} />
          </div>
          <div className="border-t border-line">
            <SectionRow icon={<UserRound className="h-4 w-4" />} label="Nascimento" value={formatBirthDateWithAge(birthDate)} />
            <SectionRow icon={<ShieldAlert className="h-4 w-4" />} label="CPF" value={formatCpf(client.cpf)} />
          </div>
        </SectionCard>

        <SectionCard title="Contato" icon={<Phone className="h-4 w-4" />}>
          {phones.length > 0 ? (
            phones.map((phone, index) => (
              <SectionRow
                key={phone.id}
                icon={<Phone className="h-4 w-4" />}
                label={
                  phone.is_primary
                    ? "Telefone principal"
                    : formatChannelLabel(phone.label) || `Telefone ${index + 1}`
                }
                value={
                  <span className="inline-flex items-center gap-2">
                    <span>{formatBrazilPhone(phone.number_raw)}</span>
                    {phone.is_whatsapp ? <WhatsAppIcon className="h-4 w-4 text-[#25D366]" /> : null}
                  </span>
                }
                meta={phone.is_primary ? <Chip>Principal</Chip> : null}
              />
            ))
          ) : (
            <SectionRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={client.phone || "Nao informado"} />
          )}

          {emails.length > 0 ? (
            emails.map((email, index) => (
              <SectionRow
                key={email.id}
                icon={<Mail className="h-4 w-4" />}
                label={
                  email.is_primary
                    ? "E-mail principal"
                    : formatChannelLabel(email.label) || `E-mail ${index + 1}`
                }
                value={email.email}
                meta={email.is_primary ? <Chip>Principal</Chip> : null}
              />
            ))
          ) : (
            <SectionRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={client.email || "Nao informado"} />
          )}
        </SectionCard>

        <SectionCard title="Enderecos" icon={<MapPin className="h-4 w-4" />}>
          {addresses.length > 0 ? (
            addresses.map((address) => {
              const addressLine =
                buildAddressLine([
                  address.address_logradouro,
                  address.address_numero,
                  address.address_complemento,
                  address.address_bairro,
                  address.address_cidade,
                  address.address_estado,
                  address.address_cep,
                ]) || "Endereco nao informado";

              return (
                <SectionRow
                  key={address.id}
                  icon={<MapPin className="h-4 w-4" />}
                  label={formatChannelLabel(address.label) || "Endereco"}
                  value={addressLine}
                  meta={
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      {address.is_primary ? <Chip>Principal</Chip> : null}
                      {address.referencia ? <span>Referencia: {address.referencia}</span> : null}
                    </div>
                  }
                />
              );
            })
          ) : (
            <SectionRow icon={<MapPin className="h-4 w-4" />} label="Principal" value={legacyAddress || "Nenhum endereco cadastrado"} />
          )}
        </SectionCard>

        <SectionCard title="Saude e cuidados" icon={<HeartPulse className="h-4 w-4" />}>
          <SectionRow icon={<HeartPulse className="h-4 w-4" />} label="Preferencias de atendimento" value={client.preferences_notes || "Nao informadas"} />
          <SectionRow icon={<FileText className="h-4 w-4" />} label="Historico clinico" value={client.clinical_history || "Nao informado"} />
          <div className="border-t border-line px-4 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">Alergias</p>
            <div className="mt-2">
              <ClinicalItemsList
                items={allergyItems}
                toneClass="border-red-200 bg-red-50/40"
                emptyText="Nenhuma alergia cadastrada."
              />
            </div>
          </div>
          <div className="border-t border-line px-4 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">Condicoes e atencoes</p>
            <div className="mt-2">
              <ClinicalItemsList
                items={conditionItems}
                toneClass="border-orange-200 bg-orange-50/40"
                emptyText="Nenhuma condicao cadastrada."
              />
            </div>
          </div>
          <div className="border-t border-line px-4 py-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">Contraindicacoes</p>
            <div className="mt-2">
              <ClinicalItemsList
                items={contraindicationItems}
                toneClass="border-amber-200 bg-amber-50/40"
                emptyText={client.contraindications || "Nenhuma contraindicacao cadastrada."}
              />
            </div>
          </div>
          {healthTags.length > 0 ? (
            <SectionRow
              icon={<Sparkles className="h-4 w-4" />}
              label="Tags de saude (legado)"
              value={
                <div className="flex flex-wrap gap-2">
                  {healthTags.map((tag) => (
                    <Chip key={tag}>{tag}</Chip>
                  ))}
                </div>
              }
            />
          ) : null}
          <SectionRow
            icon={<ExternalLink className="h-4 w-4" />}
            label="Formulario inicial"
            value={
              anamnesis.anamneseUrl ? (
                <a className="inline-flex items-center gap-1 text-studio-green underline" href={anamnesis.anamneseUrl} target="_blank" rel="noreferrer">
                  Abrir link <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                "Sem link cadastrado"
              )
            }
          />
          <SectionRow
            icon={<FileText className="h-4 w-4" />}
            label="Status do formulario"
            value={formatAnamneseStatus(anamnesis.initialFormStatus)}
            meta={
              <div className="text-xs text-muted">
                Enviado: {formatDateTime(anamnesis.initialFormSentAt)} | Respondido: {formatDateTime(anamnesis.initialFormAnsweredAt)}
              </div>
            }
          />
        </SectionCard>

        <SectionCard title="Comercial e relacionamento" icon={<Sparkles className="h-4 w-4" />}>
          <SectionRow icon={<Sparkles className="h-4 w-4" />} label="Cliente VIP" value={client.is_vip ? "Sim" : "Nao"} />
          <SectionRow icon={<ShieldAlert className="h-4 w-4" />} label="Marcar atencao" value={client.needs_attention ? "Sim" : "Nao"} />
          <SectionRow
            icon={<Share2 className="h-4 w-4" />}
            label="Aceita novidades"
            value={client.marketing_opt_in ? "Sim, aceita receber novidades" : "Nao"}
          />
          <SectionRow icon={<Share2 className="h-4 w-4" />} label="Indicacoes feitas" value={finance.referralsCount + " cliente(s)"} />
        </SectionCard>

        <SectionCard title="Responsavel legal" icon={<ShieldAlert className="h-4 w-4" />}>
          <SectionRow icon={<ShieldAlert className="h-4 w-4" />} label="Menor de idade" value={client.is_minor ? "Sim" : "Nao"} />
          <SectionRow
            icon={<ShieldAlert className="h-4 w-4" />}
            label="Modo de definicao"
            value={client.is_minor_override === null ? "Automatico pela data de nascimento" : "Override manual aplicado"}
          />
          <SectionRow icon={<UserRound className="h-4 w-4" />} label="Responsavel" value={client.guardian_name || "Nao informado"} />
          <SectionRow icon={<Phone className="h-4 w-4" />} label="Telefone do responsavel" value={client.guardian_phone || "Nao informado"} />
          <SectionRow icon={<ShieldAlert className="h-4 w-4" />} label="CPF do responsavel" value={formatCpf(client.guardian_cpf)} />
          <SectionRow icon={<UserRound className="h-4 w-4" />} label="Relacao" value={client.guardian_relationship || "Nao informada"} />
        </SectionCard>

        <SectionCard title="Dados adicionais" icon={<Briefcase className="h-4 w-4" />}>
          <SectionRow icon={<Briefcase className="h-4 w-4" />} label="Profissao" value={client.profissao || "Nao informada"} />
          <SectionRow icon={<Sparkles className="h-4 w-4" />} label="Como conheceu" value={client.como_conheceu || "Nao informado"} />
        </SectionCard>

        <NotesSection clientId={client.id} initialNotes={anamnesis.observations} />

        <SectionCard title="Resumo financeiro" icon={<CircleDollarSign className="h-4 w-4" />}>
          <div className="divide-y divide-line">
            <FinancialListRow label="Total gasto (lifetime)" value={currencyFormatter.format(finance.totalSpentLifetime)} accent />
            <FinancialListRow label="Ticket medio por sessao" value={currencyFormatter.format(finance.averageTicket)} />
            <FinancialListRow label="Pacotes adquiridos" value={finance.packagesAcquired + " pacote(s)"} />
            <FinancialListRow label="Descontos concedidos" value={"- " + currencyFormatter.format(finance.discountsGranted)} />
            <FinancialListRow label="LTV estimado (12 meses)" value={currencyFormatter.format(finance.estimatedLtv12Months)} />
            <FinancialListRow label="Fidelidade" value={formatStars(finance.fidelityStars)} />

            <div className="px-4 py-3.5">
              <div className="mb-3 flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-studio-green" />
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">Metodos de pagamento</p>
              </div>
              {paymentMethods.length > 0 ? (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <PaymentMethodBar key={method.key} method={method} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">Nenhum pagamento consolidado ainda.</p>
              )}
            </div>

            <FinancialListRow
              label="Intervalo medio entre sessoes"
              value={finance.averageIntervalDays === null ? "-" : finance.averageIntervalDays + " dias"}
            />
            <FinancialListRow
              label="Dias sem aparecer"
              value={finance.daysSinceLastVisit === null ? "-" : finance.daysSinceLastVisit + " dias"}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Prontuario"
          icon={<FileText className="h-4 w-4" />}
          action={
            <Link href={prontuarioHref} className="inline-flex items-center gap-1 text-xs font-extrabold text-studio-green hover:underline">
              Abrir <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="space-y-3 px-4 py-4">
            <p className="text-sm text-studio-text">
              {prontuarioEntries.length} registro(s) de sessao disponiveis, incluindo anamnese base e evolucoes ja feitas nos atendimentos.
            </p>
            <Link href={prontuarioHref} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-studio-green px-4 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-studio-green-dark">
              Abrir prontuario completo
              <FileText className="h-4 w-4" />
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Historico recente" icon={<CalendarPlus className="h-4 w-4" />}>
          <div className="space-y-3 px-4 py-4">
            {recentHistory.length > 0 ? (
              recentHistory.map((appointment) => (
                <div key={appointment.id} className="rounded-2xl border border-line bg-paper/70 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-studio-text">{appointment.service_name}</p>
                      <p className="text-xs text-muted">
                        {formatShortDate(appointment.start_time)} - {appointment.is_home_visit ? "Domicilio" : "Estudio"}
                      </p>
                    </div>
                    <Chip tone={appointment.status === "completed" ? "success" : "dom"}>
                      {appointment.status === "completed" ? "Concluido" : appointment.status || "Agendado"}
                    </Chip>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">Nenhum atendimento encontrado para este cliente.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Evolucoes recentes" icon={<Sparkles className="h-4 w-4" />}>
          <div className="space-y-3 px-4 py-4">
            {prontuarioEntries.length > 0 ? (
              prontuarioEntries.slice(0, 4).map((entry) => <HistoryItem key={entry.appointmentId} entry={entry} />)
            ) : (
              <p className="text-sm text-muted">Nenhuma evolucao registrada ainda.</p>
            )}
          </div>
        </SectionCard>
        </div>
      </div>

      <DeleteClientDialog
        open={deleteOpen}
        deleting={deleting}
        clientName={client.name}
        onCloseAction={() => setDeleteOpen(false)}
        onConfirmAction={handleDelete}
      />

      <Toast toast={toast} />
    </>
  );
}



