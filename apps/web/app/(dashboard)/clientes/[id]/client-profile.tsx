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
import { SurfaceCard } from "../../../../components/ui/surface-card";
import { Toast, useToast } from "../../../../components/ui/toast";
import { formatBrazilPhone } from "../../../../src/shared/phone";
import {
  buildClientPhoneHref,
  buildClientWhatsAppHref,
  buildNewAppointmentHref,
} from "../../../../src/modules/clients/contact-links";
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
  return "⭐".repeat(Math.max(1, Math.min(5, value)));
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
    "inline-flex h-12 min-w-12 items-center justify-center rounded-2xl border px-3 transition active:scale-95 " +
    (tone === "green"
      ? "border-studio-green/15 bg-white text-studio-green hover:bg-studio-green hover:text-white"
      : "border-line bg-white text-studio-text hover:bg-paper");

  if (!href) {
    return (
      <span className={className + " cursor-not-allowed opacity-35"} aria-label={label + " indisponível"}>
        {icon}
      </span>
    );
  }

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className} aria-label={label} title={label} prefetch={false}>
        {icon}
      </Link>
    );
  }

  return (
    <a href={href} className={className} aria-label={label} title={label} target="_blank" rel="noreferrer">
      {icon}
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
    <SurfaceCard className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2 text-studio-green">
          {icon}
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">{title}</p>
        </div>
        {action}
      </div>
      <div>{children}</div>
    </SurfaceCard>
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

function MetricCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-paper/70 p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">{label}</p>
      <div className="mt-1 text-sm font-semibold text-studio-text">{value}</div>
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
      <button type="button" className="absolute inset-0" aria-label="Fechar exclusão" onClick={onCloseAction} />
      <div className="relative z-10 mx-6 w-full max-w-sm rounded-[28px] bg-white p-5 shadow-float">
        <button
          type="button"
          onClick={onCloseAction}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-extrabold text-studio-text">Excluir cliente?</h3>
        <p className="mt-2 text-sm text-muted">
          {clientName} será removido(a) do cadastro. Use esta ação apenas quando tiver certeza.
        </p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onCloseAction} className="flex-1 rounded-full border border-line px-3 py-2 text-[11px] font-extrabold text-studio-text">
            Manter
          </button>
          <button type="button" onClick={onConfirmAction} disabled={deleting} className="flex-1 rounded-full bg-red-600 px-3 py-2 text-[11px] font-extrabold text-white transition disabled:opacity-60">
            {deleting ? "Excluindo..." : "Excluir"}
          </button>
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
            {formatShortDate(entry.startTime)} • {entry.isHomeVisit ? "Domicílio" : "Estúdio"}
          </p>
        </div>
        <Chip tone={entry.status === "completed" ? "success" : "dom"}>
          {entry.status === "completed" ? "Concluído" : entry.status || "Registrado"}
        </Chip>
      </div>
      {entry.evolutionText ? (
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-studio-text">{entry.evolutionText}</p>
      ) : entry.internalNotes ? (
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-studio-text">{entry.internalNotes}</p>
      ) : (
        <p className="mt-2 text-sm text-muted">Sem evolução textual registrada nesta sessão.</p>
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
  const publicName = [client.public_first_name, client.public_last_name].filter(Boolean).join(" ") || null;
  const birthDate = client.birth_date ?? client.data_nascimento ?? null;
  const legacyAddress = getLegacyAddress(snapshot);
  const paymentMethods = finance.paymentMethods;
  const recentHistory = history.slice(0, 6);
  const healthTags = [...anamnesis.healthTags];

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
          title: "Cliente • " + client.name,
          text: "Perfil interno de " + client.name,
          url,
        });
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      showToast("Link do perfil pronto para compartilhar.", "success");
    } catch {
      showToast("Não foi possível compartilhar agora.", "error");
    }
  };

  const handleCopyPhone = async () => {
    setMenuOpen(false);
    const phone = primaryPhone?.number_raw ?? client.phone ?? "";
    if (!phone || !navigator.clipboard?.writeText) {
      showToast("Telefone principal indisponível para cópia.", "info");
      return;
    }

    try {
      await navigator.clipboard.writeText(phone);
      showToast("Telefone principal copiado.", "success");
    } catch {
      showToast("Não foi possível copiar o telefone.", "error");
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
      showToast("Cliente excluído com sucesso.", "success");
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
        <header className="relative overflow-hidden border-b border-line/80 bg-gradient-to-br from-studio-light via-white to-paper">
          <div className="absolute -right-12 top-0 h-44 w-44 rounded-full bg-studio-green/10 blur-3xl" />
          <div className="absolute left-0 top-0 h-px w-full bg-white/70" />

          <div className="relative px-4 pb-6 pt-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push("/clientes")}
                className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-line bg-white/90 px-3 text-studio-text transition hover:bg-white"
                aria-label="Voltar para clientes"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((current) => !current)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/90 text-studio-text transition hover:bg-white"
                  aria-label="Abrir ações do cliente"
                >
                  <EllipsisVertical className="h-4 w-4" />
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 top-12 z-20 w-52 rounded-2xl border border-line bg-white p-2 shadow-float">
                    <Link
                      href={editHref}
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-extrabold text-studio-text transition hover:bg-paper"
                    >
                      <PencilLine className="h-4 w-4" />
                      Editar cadastro
                    </Link>
                    <button type="button" onClick={handleShare} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-extrabold text-studio-text transition hover:bg-paper">
                      <Share2 className="h-4 w-4" />
                      Compartilhar perfil
                    </button>
                    <Link href={prontuarioHref} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-extrabold text-studio-text transition hover:bg-paper" onClick={() => setMenuOpen(false)}>
                      <FileText className="h-4 w-4" />
                      Abrir prontuário
                    </Link>
                    <button type="button" onClick={handleCopyPhone} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-extrabold text-studio-text transition hover:bg-paper">
                      <Copy className="h-4 w-4" />
                      Copiar telefone
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setDeleteOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-extrabold text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir cliente
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex items-start gap-4">
              <div className="relative flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-full bg-studio-green text-xl font-serif font-bold text-white shadow-soft ring-4 ring-white/80">
                {client.avatar_url ? (
                  <Image src={client.avatar_url} alt={client.name} fill sizes="72px" className="object-cover" unoptimized />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-serif text-studio-text">{client.name}</h1>
                  {client.is_vip && <Chip tone="success">VIP</Chip>}
                  {client.needs_attention && <Chip tone="danger">Atenção</Chip>}
                  {client.is_minor && <Chip tone="warning">Menor</Chip>}
                </div>
                <p className="mt-1 text-sm font-semibold text-muted">Cliente desde {formatShortDate(client.created_at)}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                  {publicName ? <span className="rounded-full border border-line/60 bg-white/85 px-2.5 py-1 font-semibold">Nome público: {publicName}</span> : null}
                  {client.profissao ? <span className="rounded-full border border-line/60 bg-white/85 px-2.5 py-1 font-semibold">{client.profissao}</span> : null}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <ActionIconLink href={callHref} label="Ligar" icon={<Phone className="h-4 w-4" />} />
              <ActionIconLink href={whatsappHref} label="WhatsApp" icon={<MessageCircle className="h-4 w-4" />} tone="green" />
              <ActionIconLink href={scheduleHref} label="Agendar" icon={<CalendarPlus className="h-4 w-4" />} tone="green" />
              <ActionIconLink href={prontuarioHref} label="Prontuário" icon={<FileText className="h-4 w-4" />} />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <MetricCard label="Sessões" value={finance.completedSessionsCount} />
              <MetricCard label="Última visita" value={finance.daysSinceLastVisit === null ? "-" : finance.daysSinceLastVisit + " dia(s)"} />
              <MetricCard label="Fidelidade" value={formatStars(finance.fidelityStars)} />
            </div>
          </div>
        </header>

        <div className="space-y-4 px-4 pt-4">

        <SectionCard title="Contato" icon={<Phone className="h-4 w-4" />}>
          {primaryPhone ? (
            <SectionRow
              icon={<Phone className="h-4 w-4" />}
              label="Telefone principal"
              value={<span>{formatBrazilPhone(primaryPhone.number_raw)}</span>}
              meta={
                <div className="flex flex-wrap items-center gap-2">
                  {primaryPhone.is_whatsapp ? <Chip tone="success">WhatsApp</Chip> : null}
                  {phones.length > 1 ? <Chip>{phones.length} números</Chip> : null}
                </div>
              }
            />
          ) : null}

          {phones.filter((phone) => !phone.is_primary).map((phone) => (
            <SectionRow
              key={phone.id}
              icon={<Phone className="h-4 w-4" />}
              label={phone.label || "Telefone adicional"}
              value={<span>{formatBrazilPhone(phone.number_raw)}</span>}
              meta={phone.is_whatsapp ? <Chip tone="success">WhatsApp</Chip> : null}
            />
          ))}

          {emails.length > 0 ? (
            emails.map((email) => (
              <SectionRow
                key={email.id}
                icon={<Mail className="h-4 w-4" />}
                label={email.label || (email.is_primary ? "E-mail principal" : "E-mail")}
                value={email.email}
                meta={email.is_primary ? <Chip>Principal</Chip> : null}
              />
            ))
          ) : (
            <SectionRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={client.email || "Não informado"} />
          )}
          <SectionRow icon={<UserRound className="h-4 w-4" />} label="Nascimento" value={formatBirthDateWithAge(birthDate)} />
          <SectionRow icon={<ShieldAlert className="h-4 w-4" />} label="CPF" value={formatCpf(client.cpf)} />
          <SectionRow icon={<Briefcase className="h-4 w-4" />} label="Profissão" value={client.profissao || "Não informada"} />
          <SectionRow
            icon={<Share2 className="h-4 w-4" />}
            label="Aceita novidades"
            value={client.marketing_opt_in ? "Sim, aceita receber novidades" : "Não configurado / sem aceite"}
          />
        </SectionCard>

        <SectionCard title="Endereços" icon={<MapPin className="h-4 w-4" />}>
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
                ]) || "Endereço não informado";

              return (
                <SectionRow
                  key={address.id}
                  icon={<MapPin className="h-4 w-4" />}
                  label={address.label || "Endereço"}
                  value={addressLine}
                  meta={
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      {address.is_primary ? <Chip>Principal</Chip> : null}
                      {address.referencia ? <span>Referência: {address.referencia}</span> : null}
                    </div>
                  }
                />
              );
            })
          ) : (
            <SectionRow icon={<MapPin className="h-4 w-4" />} label="Principal" value={legacyAddress || "Nenhum endereço cadastrado"} />
          )}
        </SectionCard>

        <SectionCard title="Origem & indicação" icon={<Sparkles className="h-4 w-4" />}>
          <SectionRow icon={<UserRound className="h-4 w-4" />} label="Nome público" value={publicName || "Não informado"} />
          <SectionRow icon={<Sparkles className="h-4 w-4" />} label="Como conheceu" value={client.como_conheceu || "Não informado"} />
          <SectionRow icon={<UserRound className="h-4 w-4" />} label="Referência interna" value={client.internal_reference || "Não informada"} />
          <SectionRow icon={<Share2 className="h-4 w-4" />} label="Indicações feitas" value={finance.referralsCount + " cliente(s)"} />
        </SectionCard>

        <SectionCard title="Preferências & cuidados" icon={<HeartPulse className="h-4 w-4" />}>
          <SectionRow icon={<HeartPulse className="h-4 w-4" />} label="Preferências de atendimento" value={client.preferences_notes || "Não informadas"} />
          <SectionRow icon={<ShieldAlert className="h-4 w-4" />} label="Contraindicações" value={client.contraindications || "Nenhuma registrada"} />
          <SectionRow icon={<FileText className="h-4 w-4" />} label="Histórico clínico" value={client.clinical_history || "Não informado"} />
          <SectionRow
            icon={<Sparkles className="h-4 w-4" />}
            label="Tags de saúde"
            value={
              healthTags.length > 0 || healthItems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {healthTags.map((tag) => (
                    <Chip key={tag}>{tag}</Chip>
                  ))}
                  {healthItems.map((item) => (
                    <Chip key={item.id} tone={item.type === "allergy" ? "danger" : item.type === "condition" ? "warning" : "default"}>
                      {item.label}
                    </Chip>
                  ))}
                </div>
              ) : (
                "Nenhuma informação estruturada"
              )
            }
          />
          <SectionRow
            icon={<ExternalLink className="h-4 w-4" />}
            label="Anamnese anexada"
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
          {client.is_minor ? (
            <>
              <SectionRow icon={<ShieldAlert className="h-4 w-4" />} label="Menor de idade" value="Sim" />
              <SectionRow icon={<UserRound className="h-4 w-4" />} label="Responsável" value={client.guardian_name || "Não informado"} />
              <SectionRow icon={<Phone className="h-4 w-4" />} label="Telefone do responsável" value={client.guardian_phone || "Não informado"} />
              <SectionRow icon={<ShieldAlert className="h-4 w-4" />} label="CPF do responsável" value={formatCpf(client.guardian_cpf)} />
            </>
          ) : (
            <SectionRow icon={<ShieldAlert className="h-4 w-4" />} label="Menor de idade" value="Não" />
          )}
        </SectionCard>

        <NotesSection clientId={client.id} initialNotes={anamnesis.observations} />

        <SectionCard title="Resumo financeiro" icon={<CircleDollarSign className="h-4 w-4" />}>
          <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2">
            <MetricCard label="Total gasto (lifetime)" value={currencyFormatter.format(finance.totalSpentLifetime)} />
            <MetricCard label="Ticket médio por sessão" value={currencyFormatter.format(finance.averageTicket)} />
            <MetricCard label="Pacotes adquiridos" value={finance.packagesAcquired + " pacote(s)"} />
            <MetricCard label="Descontos concedidos" value={"- " + currencyFormatter.format(finance.discountsGranted)} />
            <MetricCard label="LTV estimado (12 meses)" value={currencyFormatter.format(finance.estimatedLtv12Months)} />
            <MetricCard label="Fidelidade" value={formatStars(finance.fidelityStars)} />
          </div>

          <div className="border-t border-line px-4 py-4">
            <div className="mb-3 flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-studio-green" />
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">Métodos de pagamento</p>
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

          <div className="grid grid-cols-1 gap-3 border-t border-line px-4 py-4 sm:grid-cols-2">
            <MetricCard label="Intervalo médio entre sessões" value={finance.averageIntervalDays === null ? "-" : finance.averageIntervalDays + " dias"} />
            <MetricCard label="Dias sem aparecer" value={finance.daysSinceLastVisit === null ? "-" : finance.daysSinceLastVisit + " dias"} />
          </div>
        </SectionCard>

        <SectionCard
          title="Prontuário"
          icon={<FileText className="h-4 w-4" />}
          action={
            <Link href={prontuarioHref} className="inline-flex items-center gap-1 text-xs font-extrabold text-studio-green hover:underline">
              Abrir <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="space-y-3 px-4 py-4">
            <p className="text-sm text-studio-text">
              {prontuarioEntries.length} registro(s) de sessão disponíveis, incluindo anamnese base e evoluções já feitas nos atendimentos.
            </p>
            <Link href={prontuarioHref} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-studio-green px-4 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-studio-green-dark">
              Abrir prontuário completo
              <FileText className="h-4 w-4" />
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Histórico recente" icon={<CalendarPlus className="h-4 w-4" />}>
          <div className="space-y-3 px-4 py-4">
            {recentHistory.length > 0 ? (
              recentHistory.map((appointment) => (
                <div key={appointment.id} className="rounded-2xl border border-line bg-paper/70 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-studio-text">{appointment.service_name}</p>
                      <p className="text-xs text-muted">
                        {formatShortDate(appointment.start_time)} • {appointment.is_home_visit ? "Domicílio" : "Estúdio"}
                      </p>
                    </div>
                    <Chip tone={appointment.status === "completed" ? "success" : "dom"}>
                      {appointment.status === "completed" ? "Concluído" : appointment.status || "Agendado"}
                    </Chip>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">Nenhum atendimento encontrado para este cliente.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Evoluções recentes" icon={<Sparkles className="h-4 w-4" />}>
          <div className="space-y-3 px-4 py-4">
            {prontuarioEntries.length > 0 ? (
              prontuarioEntries.slice(0, 4).map((entry) => <HistoryItem key={entry.appointmentId} entry={entry} />)
            ) : (
              <p className="text-sm text-muted">Nenhuma evolução registrada ainda.</p>
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
