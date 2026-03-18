import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarPlus,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { Chip } from "../../../../components/ui/chip";
import { SurfaceCard } from "../../../../components/ui/surface-card";
import { formatBrazilPhone } from "../../../../src/shared/phone";
import {
  buildClientPhoneHref,
  buildClientWhatsAppHref,
  buildNewAppointmentHref,
} from "../../../../src/modules/clients/contact-links";
import type { ClientDetailSnapshot } from "../../../../src/modules/clients/profile-data";
import { NotesSection } from "./notes-section";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "CA";
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? "CA";
  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

function formatCpf(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 11);
  if (digits.length !== 11) return value ?? "-";
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
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

function HealthTone({ type }: { type: string | null }) {
  if (type === "allergy") return <Chip tone="danger">Alergia</Chip>;
  if (type === "condition") return <Chip tone="warning">Condição</Chip>;
  return <Chip>Saúde</Chip>;
}

function QuickAction({
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
  const className = `inline-flex h-11 min-w-11 items-center justify-center rounded-2xl border px-3 transition active:scale-95 ${
    tone === "green"
      ? "border-studio-green/15 bg-white text-studio-green hover:bg-studio-green hover:text-white"
      : "border-line bg-white text-studio-text hover:bg-paper"
  }`;

  if (!href) {
    return (
      <span className={`${className} cursor-not-allowed opacity-40`} aria-label={`${label} indisponível`}>
        {icon}
      </span>
    );
  }

  const external = !href.startsWith("/");
  if (!external) {
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

function DataField({ label, value }: { label: string; value: ReactNode }) {
  const hasValue =
    value !== null && value !== undefined && !(typeof value === "string" && value.trim().length === 0);

  return (
    <div className="rounded-2xl border border-line bg-paper/70 p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">{label}</p>
      <div className="mt-1 text-sm font-semibold text-studio-text">{hasValue ? value : "-"}</div>
    </div>
  );
}

export function ClientProfile({ snapshot }: { snapshot: ClientDetailSnapshot }) {
  const { client, phones, emails, addresses, healthItems, history, finance, anamnesis } = snapshot;
  const initials = client.initials || getInitials(client.name);
  const primaryPhone = phones.find((phone) => phone.is_primary) ?? phones[0] ?? null;
  const whatsappPhone = phones.find((phone) => phone.is_whatsapp) ?? primaryPhone;
  const callHref = buildClientPhoneHref(primaryPhone?.number_raw ?? client.phone);
  const whatsappHref = buildClientWhatsAppHref(whatsappPhone?.number_raw ?? client.phone);
  const scheduleHref = buildNewAppointmentHref(client.id, `/clientes/${client.id}`);
  const prontuarioHref = `/clientes/${client.id}/prontuario`;
  const publicName = [client.public_first_name, client.public_last_name].filter(Boolean).join(" ") || "-";
  const birthDate = client.birth_date ?? client.data_nascimento ?? null;
  const legacyAddress = getLegacyAddress(snapshot);
  const paymentMethods = finance.paymentMethods;
  const recentHistory = history.slice(0, 8);

  return (
    <div className="space-y-5 px-4 pb-10 pt-4">
      <SurfaceCard className="overflow-hidden border-white bg-white/95 p-0">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-studio-light via-white to-paper px-5 pb-5 pt-5">
          <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-studio-green/10 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="relative flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-full bg-studio-green text-xl font-serif font-bold text-white shadow-soft">
              {client.avatar_url ? (
                <Image src={client.avatar_url} alt={client.name} fill sizes="72px" className="object-cover" unoptimized />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-2xl font-serif text-studio-text">{client.name}</h2>
                {client.is_vip && <Chip tone="success">VIP</Chip>}
                {client.needs_attention && <Chip tone="danger">Atenção</Chip>}
                {client.is_minor && <Chip tone="warning">Menor</Chip>}
              </div>
              <p className="mt-1 text-sm font-semibold text-muted">Cliente desde {formatDate(client.created_at)}</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <QuickAction href={callHref} label="Ligar" icon={<Phone className="h-4 w-4" />} />
                <QuickAction
                  href={whatsappHref}
                  label="Abrir WhatsApp"
                  icon={<MessageCircle className="h-4 w-4" />}
                  tone="green"
                />
                <QuickAction
                  href={scheduleHref}
                  label="Agendar para este cliente"
                  icon={<CalendarPlus className="h-4 w-4" />}
                  tone="green"
                />
                <QuickAction
                  href={prontuarioHref}
                  label="Abrir prontuário"
                  icon={<FileText className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <DataField label="Sessões" value={finance.completedSessionsCount} />
            <DataField
              label="Última visita"
              value={finance.daysSinceLastVisit === null ? "-" : `${finance.daysSinceLastVisit} dia(s)`}
            />
            <DataField label="Fidelidade" value={formatStars(finance.fidelityStars)} />
          </div>
        </div>
      </SurfaceCard>

      <section className="space-y-2">
        <p className="pl-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">Identificação</p>
        <SurfaceCard className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DataField label="Nome público" value={publicName} />
            <DataField label="Referência interna" value={client.internal_reference || "-"} />
            <DataField label="CPF" value={formatCpf(client.cpf)} />
            <DataField label="Nascimento" value={formatDate(birthDate)} />
            <DataField label="Profissão" value={client.profissao || "-"} />
            <DataField label="Como conheceu" value={client.como_conheceu || "-"} />
            <DataField
              label="Marketing"
              value={client.marketing_opt_in ? "Aceitou receber comunicações" : "Não autorizado"}
            />
            <DataField
              label="Anamnese anexada"
              value={
                anamnesis.anamneseUrl ? (
                  <a
                    className="inline-flex items-center gap-1 text-studio-green underline"
                    href={anamnesis.anamneseUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir link <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  "-"
                )
              }
            />
          </div>
          {(client.guardian_name || client.guardian_phone || client.guardian_cpf) && (
            <div className="rounded-3xl border border-line bg-paper/80 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-studio-green" />
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Responsável legal</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DataField label="Nome" value={client.guardian_name || "-"} />
                <DataField
                  label="Telefone"
                  value={client.guardian_phone ? formatBrazilPhone(client.guardian_phone) : "-"}
                />
                <DataField label="CPF" value={formatCpf(client.guardian_cpf)} />
              </div>
            </div>
          )}
        </SurfaceCard>
      </section>

      <section className="space-y-2">
        <p className="pl-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">Contato</p>
        <SurfaceCard className="space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Phone className="h-4 w-4 text-studio-green" />
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Telefones</p>
            </div>
            <div className="space-y-2">
              {phones.length > 0 ? (
                phones.map((phone) => (
                  <div key={phone.id} className="rounded-2xl border border-line bg-paper/80 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-studio-text">
                        {formatBrazilPhone(phone.number_raw)}
                      </span>
                      {phone.is_primary && <Chip>Principal</Chip>}
                      {phone.is_whatsapp && <Chip tone="success">WhatsApp</Chip>}
                      {phone.label && <Chip>{phone.label}</Chip>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-line bg-paper/50 p-4 text-sm text-muted">
                  Nenhum telefone cadastrado.
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4 text-studio-green" />
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Emails</p>
            </div>
            <div className="space-y-2">
              {emails.length > 0 ? (
                emails.map((email) => (
                  <div key={email.id} className="rounded-2xl border border-line bg-paper/80 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-studio-text">{email.email}</span>
                      {email.is_primary && <Chip>Principal</Chip>}
                      {email.label && <Chip>{email.label}</Chip>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-line bg-paper/50 p-4 text-sm text-muted">
                  Nenhum email cadastrado.
                </div>
              )}
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="space-y-2">
        <p className="pl-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">Endereços</p>
        <SurfaceCard className="space-y-3">
          {addresses.length > 0 ? (
            addresses.map((address) => {
              const addressLine = buildAddressLine([
                address.address_logradouro,
                address.address_numero,
                address.address_complemento,
                address.address_bairro,
                address.address_cidade,
                address.address_estado,
                address.address_cep,
              ]);
              return (
                <div key={address.id} className="rounded-3xl border border-line bg-paper/75 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-studio-green" />
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
                      {address.label || "Endereço"}
                    </p>
                    {address.is_primary && <Chip>Principal</Chip>}
                  </div>
                  <p className="text-sm font-semibold text-studio-text">{addressLine || "Endereço não informado"}</p>
                  {address.referencia && (
                    <p className="mt-2 text-xs text-muted">Referência: {address.referencia}</p>
                  )}
                </div>
              );
            })
          ) : legacyAddress ? (
            <div className="rounded-3xl border border-line bg-paper/75 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Endereço legado</p>
              <p className="mt-2 text-sm font-semibold text-studio-text">{legacyAddress}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-paper/50 p-4 text-sm text-muted">
              Nenhum endereço cadastrado.
            </div>
          )}
        </SurfaceCard>
      </section>

      <section className="space-y-2">
        <p className="pl-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">Saúde e preferências</p>
        <SurfaceCard className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {anamnesis.healthTags.map((tag) => (
              <Chip key={tag}>{tag}</Chip>
            ))}
            {healthItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 text-[11px] font-semibold text-studio-text"
              >
                <HealthTone type={item.type} />
                <span>{item.label}</span>
              </span>
            ))}
            {anamnesis.healthTags.length === 0 && healthItems.length === 0 && (
              <span className="text-sm text-muted">Nenhuma informação estruturada de saúde cadastrada.</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            <DataField label="Contraindicações" value={client.contraindications || "-"} />
            <DataField label="Preferências" value={client.preferences_notes || "-"} />
            <DataField label="Histórico clínico" value={client.clinical_history || "-"} />
            <DataField label="Observações gerais" value={client.observacoes_gerais || "-"} />
            <DataField label="Notas legadas" value={client.notes || "-"} />
          </div>
        </SurfaceCard>
      </section>

      <section className="space-y-2">
        <p className="pl-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">Resumo financeiro</p>
        <SurfaceCard className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DataField label="Total gasto (lifetime)" value={currencyFormatter.format(finance.totalSpentLifetime)} />
            <DataField label="Ticket médio por sessão" value={currencyFormatter.format(finance.averageTicket)} />
            <DataField label="Pacotes adquiridos" value={`${finance.packagesAcquired} pacote(s)`} />
            <DataField label="Descontos concedidos" value={`- ${currencyFormatter.format(finance.discountsGranted)}`} />
            <DataField label="LTV estimado (12 meses)" value={currencyFormatter.format(finance.estimatedLtv12Months)} />
            <DataField label="Sessões concluídas" value={finance.completedSessionsCount} />
          </div>

          <div className="rounded-3xl border border-line bg-paper/75 p-4">
            <div className="mb-3 flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-studio-green" />
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Métodos de pagamento</p>
            </div>
            {paymentMethods.length > 0 ? (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div key={method.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm font-semibold text-studio-text">
                      <span>{method.label}</span>
                      <span>{method.percentage}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white">
                      <div
                        className="h-2 rounded-full bg-studio-green transition-all"
                        style={{ width: `${Math.max(method.percentage, method.percentage > 0 ? 12 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Nenhum pagamento consolidado ainda.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DataField
              label="Intervalo médio entre sessões"
              value={finance.averageIntervalDays === null ? "-" : `${finance.averageIntervalDays} dias`}
            />
            <DataField
              label="Dias sem aparecer"
              value={finance.daysSinceLastVisit === null ? "-" : `${finance.daysSinceLastVisit} dias`}
            />
            <DataField label="Fidelidade" value={formatStars(finance.fidelityStars)} />
            <DataField label="Indicações feitas" value={`${finance.referralsCount} cliente(s)`} />
          </div>
        </SurfaceCard>
      </section>

      <section className="space-y-2">
        <p className="pl-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">Prontuário</p>
        <SurfaceCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-studio-green" />
              <p className="text-sm font-extrabold text-studio-text">Prontuário clínico organizado</p>
            </div>
            <p className="mt-2 text-sm text-muted">
              {snapshot.prontuarioEntries.length} registro(s) de sessão disponíveis, incluindo anamnese base e evoluções de atendimento.
            </p>
          </div>
          <Link
            href={prontuarioHref}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-studio-green px-4 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-studio-green-dark"
          >
            Abrir prontuário
            <FileText className="h-4 w-4" />
          </Link>
        </SurfaceCard>
      </section>

      <NotesSection clientId={client.id} initialNotes={anamnesis.observations} />

      <section className="space-y-2">
        <p className="pl-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">Histórico recente</p>
        <div className="space-y-3">
          {recentHistory.length > 0 ? (
            recentHistory.map((appointment) => (
              <SurfaceCard key={appointment.id} className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-studio-text">{appointment.service_name}</p>
                    <p className="text-xs text-muted">
                      {formatDate(appointment.start_time)} • {appointment.is_home_visit ? "Domicílio" : "Estúdio"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Chip tone={appointment.status === "completed" ? "success" : "dom"}>
                      {appointment.status === "completed" ? "Concluído" : appointment.status || "Agendado"}
                    </Chip>
                    {appointment.payment_status && <Chip>{appointment.payment_status}</Chip>}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DataField label="Código" value={appointment.attendance_code || "-"} />
                  <DataField
                    label="Valor previsto"
                    value={currencyFormatter.format((appointment.price_override ?? appointment.price ?? 0) + (appointment.displacement_fee ?? 0))}
                  />
                </div>
              </SurfaceCard>
            ))
          ) : (
            <SurfaceCard className="border border-dashed border-line bg-paper/50 text-sm text-muted">
              Nenhum atendimento encontrado para este cliente.
            </SurfaceCard>
          )}
        </div>
      </section>
    </div>
  );
}

