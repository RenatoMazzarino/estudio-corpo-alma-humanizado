"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Briefcase,
  Calendar,
  IdCard,
  Tags,
  Pencil,
  Copy,
  Trash2,
  Navigation,
  BadgeCheck,
  Baby,
  CalendarPlus,
} from "lucide-react";
import type { Database } from "../../../../lib/supabase/types";
import { deleteClient, updateClientProfile } from "./actions";
import { fetchAddressByCep, normalizeCep } from "../../../../src/shared/address/cep";
import { Chip } from "../../../../components/ui/chip";
import { SurfaceCard } from "../../../../components/ui/surface-card";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

interface ClientProfileProps {
  client: ClientRow;
  metrics: {
    visits: number;
    absences: number;
    lastVisitLabel: string;
  };
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function buildAddressLine(payload: {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  fallback?: string | null;
}) {
  const parts = [
    payload.logradouro,
    payload.numero,
    payload.complemento,
    payload.bairro,
    payload.cidade,
    payload.estado,
    payload.cep,
  ]
    .map((value) => (value ? value.trim() : ""))
    .filter((value) => value.length > 0);

  if (parts.length > 0) return parts.join(", ");
  return payload.fallback?.trim() || "Endereço não informado";
}

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "CA";
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function ClientProfile({ client, metrics }: ClientProfileProps) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [phone, setPhone] = useState(client.phone ?? "");
  const [cpf, setCpf] = useState(client.cpf ?? "");
  const [cep, setCep] = useState(client.address_cep ?? "");
  const [logradouro, setLogradouro] = useState(client.address_logradouro ?? "");
  const [numero, setNumero] = useState(client.address_numero ?? "");
  const [complemento, setComplemento] = useState(client.address_complemento ?? "");
  const [bairro, setBairro] = useState(client.address_bairro ?? "");
  const [cidade, setCidade] = useState(client.address_cidade ?? "");
  const [estado, setEstado] = useState(client.address_estado ?? "");
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [isVip, setIsVip] = useState(client.is_vip ?? false);
  const [needsAttention, setNeedsAttention] = useState(client.needs_attention ?? false);
  const [marketingOptIn, setMarketingOptIn] = useState(client.marketing_opt_in ?? false);
  const [isMinor, setIsMinor] = useState(client.is_minor ?? false);

  const phoneDigits = client.phone ? onlyDigits(client.phone) : "";
  const whatsappLink = phoneDigits ? `https://wa.me/55${phoneDigits}` : null;
  const callLink = phoneDigits ? `tel:+55${phoneDigits}` : null;
  const phoneError = useMemo(() => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    return digits.length === 10 || digits.length === 11 ? "" : "Telefone inválido (com DDD).";
  }, [phone]);
  const cpfError = useMemo(() => {
    if (!cpf) return "";
    const digits = cpf.replace(/\D/g, "");
    return digits.length === 11 ? "" : "CPF inválido.";
  }, [cpf]);

  const addressLine = buildAddressLine({
    logradouro: client.address_logradouro,
    numero: client.address_numero,
    complemento: client.address_complemento,
    bairro: client.address_bairro,
    cidade: client.address_cidade,
    estado: client.address_estado,
    cep: client.address_cep,
    fallback: client.endereco_completo,
  });

  const mapsQuery = buildAddressLine({
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
  });
  const hasMapsQuery = mapsQuery && mapsQuery !== "Endereço não informado";

  const handleCopy = async (value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setMessage({ type: "success", text: "Copiado para a área de transferência." });
    } catch {
      setMessage({ type: "error", text: "Não foi possível copiar agora." });
    }
  };

  const handleCepLookup = async () => {
    const normalized = normalizeCep(cep);
    if (normalized.length !== 8) {
      setCepStatus("error");
      return;
    }
    setCepStatus("loading");
    const result = await fetchAddressByCep(normalized);
    if (!result) {
      setCepStatus("error");
      return;
    }
    setLogradouro(result.logradouro);
    setBairro(result.bairro);
    setCidade(result.cidade);
    setEstado(result.estado);
    setCepStatus("success");
  };

  const initials = client.initials || getInitials(client.name);
  const createdAtLabel = client.created_at
    ? new Date(client.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
    : "";

  return (
    <div>
      <section className="relative bg-white rounded-b-[2.5rem] shadow-soft overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-36 bg-gradient-to-b from-studio-light to-white"></div>
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-studio-light/60 blur-2xl"></div>
          <div className="absolute -left-12 top-10 w-52 h-52 rounded-full bg-studio-light/40 blur-2xl"></div>
        </div>

        <div className="relative safe-top pt-20 px-6 pb-6 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-white p-1 shadow-[0_10px_30px_rgba(0,0,0,0.08)] mb-3">
            <div className="w-full h-full rounded-full bg-studio-green text-white flex items-center justify-center text-3xl font-serif font-bold">
              {initials}
            </div>
          </div>

          <h1 className="text-2xl font-serif font-bold text-studio-text leading-tight">{client.name}</h1>
          <p className="text-sm text-muted font-semibold mt-1">
            Cliente desde {createdAtLabel || "-"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {client.is_vip && <Chip tone="success">VIP</Chip>}
            {client.needs_attention && <Chip tone="danger">Atenção</Chip>}
            {client.is_minor && <Chip tone="warning">Menor</Chip>}
          </div>

          <div className="mt-5 flex gap-5">
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-1 group"
                title="WhatsApp"
              >
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-line flex items-center justify-center group-active:scale-95 transition">
                  <MessageCircle className="w-5 h-5 text-studio-green" />
                </div>
                <span className="text-[10px] font-extrabold text-muted">Whats</span>
              </a>
            )}
            {callLink && (
              <a
                href={callLink}
                className="flex flex-col items-center gap-1 group"
                title="Ligar"
              >
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-line flex items-center justify-center group-active:scale-95 transition">
                  <Phone className="w-5 h-5 text-studio-text" />
                </div>
                <span className="text-[10px] font-extrabold text-muted">Ligar</span>
              </a>
            )}
            {addressLine && addressLine !== "Endereço não informado" && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-1 group"
                title="Mapa"
              >
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-line flex items-center justify-center group-active:scale-95 transition">
                  <MapPin className="w-5 h-5 text-studio-text" />
                </div>
                <span className="text-[10px] font-extrabold text-muted">Mapa</span>
              </a>
            )}
            <Link href="/novo" className="flex flex-col items-center gap-1 group" title="Novo agendamento">
              <div className="w-12 h-12 rounded-2xl bg-studio-green text-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] flex items-center justify-center group-active:scale-95 transition">
                <CalendarPlus className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold text-muted">Agendar</span>
            </Link>
          </div>

          <button
            onClick={() => setEditing((prev) => !prev)}
            className="mt-4 px-4 py-2 rounded-full bg-white border border-line text-xs font-extrabold text-studio-green hover:bg-studio-light transition"
          >
            <Pencil size={14} className="inline-block mr-1" />
            {editing ? "Fechar edição" : "Editar cliente"}
          </button>
        </div>
      </section>

      <section className="px-6 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm border border-white px-4 py-3 flex justify-around">
          <div className="text-center">
            <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Visitas</p>
            <p className="text-lg font-black text-studio-green tabular-nums">{metrics.visits}</p>
          </div>
          <div className="w-px bg-line"></div>
          <div className="text-center">
            <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Faltas</p>
            <p className="text-lg font-black text-muted tabular-nums">{metrics.absences}</p>
          </div>
          <div className="w-px bg-line"></div>
          <div className="text-center">
            <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Última</p>
            <p className="text-lg font-black text-studio-text tabular-nums">{metrics.lastVisitLabel}</p>
          </div>
        </div>
      </section>

      <section className="px-6 pt-5 pb-4 space-y-5">
        <div>
          <h3 className="text-[11px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 pl-1">Contato</h3>
          <div className="bg-white rounded-3xl border border-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-studio-light flex items-center justify-center text-studio-green">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Telefone</p>
                <p className="text-sm font-extrabold text-studio-text truncate">
                  {client.phone || "Telefone não informado"}
                </p>
              </div>
              {client.phone && (
                <button
                  type="button"
                  onClick={() => handleCopy(client.phone)}
                  className="ml-auto text-muted hover:text-studio-text"
                  aria-label="Copiar telefone"
                >
                  <Copy size={14} />
                </button>
              )}
            </div>
            <div className="h-px bg-line mx-5"></div>
            <div className="px-5 py-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-paper border border-line flex items-center justify-center text-studio-text">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Email</p>
                <p className="text-sm font-extrabold text-studio-text truncate">
                  {client.email || "Email não informado"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 pl-1">Endereço</h3>
          <div className="bg-white rounded-3xl border border-white shadow-sm p-5">
            <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Principal</p>
            <p className="text-sm font-extrabold text-studio-text mt-1">{addressLine}</p>
            <p className="text-xs text-muted font-semibold mt-1">
              {client.address_complemento ? `${client.address_complemento} • ` : ""}
              {client.address_bairro || ""}
            </p>

            {addressLine && addressLine !== "Endereço não informado" && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 w-full py-3 rounded-2xl bg-paper border border-line text-studio-text font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-white transition"
              >
                <Navigation className="w-4 h-4" />
                Abrir no mapa
              </a>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 pl-1">Saúde & Preferências</h3>
          <div className="bg-white rounded-3xl border border-white shadow-sm p-5">
            <div className="flex flex-wrap gap-2">
              {(client.health_tags ?? []).length > 0 ? (
                client.health_tags?.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-xl bg-studio-light text-studio-green text-[11px] font-extrabold border border-studio-green/10"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted">Sem tags de saúde</span>
              )}
            </div>
            <div className="mt-4 bg-paper rounded-2xl p-4 border border-line">
              <p className="text-xs text-muted italic leading-relaxed">
                {client.contraindications || client.preferences_notes || "Sem observações clínicas registradas."}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 pl-1">Dados adicionais</h3>
          <div className="bg-white rounded-3xl border border-white shadow-sm p-5 space-y-2 text-sm text-muted">
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              <span>{client.data_nascimento || "Nascimento não informado"}</span>
            </div>
            <div className="flex items-center gap-2">
              <IdCard size={14} />
              <span>{client.cpf || "CPF não informado"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase size={14} />
              <span>{client.profissao || "Profissão não informada"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tags size={14} />
              <span>{client.como_conheceu || "Origem não informada"}</span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck size={14} />
              <span>{client.marketing_opt_in ? "Aceita receber novidades" : "Sem consentimento marketing"}</span>
            </div>
            {client.is_minor && (
              <div className="flex flex-col gap-1 text-xs text-muted">
                <div className="flex items-center gap-2">
                  <Baby size={14} />
                  <span>{client.guardian_name || "Responsável não informado"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} />
                  <span>{client.guardian_phone || "Telefone não informado"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IdCard size={14} />
                  <span>{client.guardian_cpf || "CPF não informado"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {editing && (
          <SurfaceCard className="space-y-4 border border-line">
            <form
              action={async (formData) => {
                setMessage(null);
                const result = await updateClientProfile(formData);
                if (!result.ok) {
                  setMessage({ type: "error", text: result.error.message });
                  return;
                }
                setMessage({ type: "success", text: "Cliente atualizado com sucesso." });
                setEditing(false);
              }}
              className="space-y-4"
            >
              <input type="hidden" name="clientId" value={client.id} />

              <div className="space-y-2">
                <label className="text-xs font-extrabold text-muted uppercase ml-1">Nome Completo</label>
                <input
                  name="name"
                  defaultValue={client.name}
                  className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <input
                  name="phone"
                  value={phone}
                  placeholder="Telefone / WhatsApp"
                  inputMode="numeric"
                  aria-invalid={phoneError ? "true" : "false"}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className={`w-full bg-white border rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 ${
                    phoneError
                      ? "border-red-200 focus:ring-red-200"
                      : "border-line focus:ring-studio-green/20"
                  }`}
                />
                {phoneError && <p className="text-[11px] text-danger">{phoneError}</p>}
                <input
                  name="email"
                  defaultValue={client.email ?? ""}
                  placeholder="Email"
                  className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
                <input
                  name="data_nascimento"
                  type="date"
                  defaultValue={client.data_nascimento ?? ""}
                  className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
                <input
                  name="cpf"
                  value={cpf}
                  placeholder="CPF"
                  inputMode="numeric"
                  aria-invalid={cpfError ? "true" : "false"}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  className={`w-full bg-white border rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 ${
                    cpfError
                      ? "border-red-200 focus:ring-red-200"
                      : "border-line focus:ring-studio-green/20"
                  }`}
                />
                {cpfError && <p className="text-[11px] text-danger">{cpfError}</p>}
                <input
                  name="profissao"
                  defaultValue={client.profissao ?? ""}
                  placeholder="Profissão"
                  className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
                <input
                  name="como_conheceu"
                  defaultValue={client.como_conheceu ?? ""}
                  placeholder="Como conheceu"
                  className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
                <input
                  name="health_tags"
                  defaultValue={(client.health_tags ?? []).join(", ")}
                  placeholder="Tags de saúde (separe por vírgula)"
                  className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
                <textarea
                  name="preferences_notes"
                  defaultValue={client.preferences_notes ?? ""}
                  placeholder="Preferências"
                  rows={3}
                  className="w-full bg-white border border-line rounded-2xl py-3 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
                />
                <textarea
                  name="contraindications"
                  defaultValue={client.contraindications ?? ""}
                  placeholder="Contraindicações"
                  rows={3}
                  className="w-full bg-white border border-line rounded-2xl py-3 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <label className="text-xs font-extrabold text-muted uppercase">Endereço</label>
                <div className="flex gap-2">
                  <input
                    name="address_cep"
                    value={cep}
                    placeholder="CEP"
                    inputMode="numeric"
                    aria-invalid={cepStatus === "error" ? "true" : "false"}
                    onChange={(e) => {
                      setCep(formatCep(e.target.value));
                      setCepStatus("idle");
                    }}
                    className={`w-full bg-white border rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 ${
                      cepStatus === "error"
                        ? "border-red-200 focus:ring-red-200"
                        : "border-line focus:ring-studio-green/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleCepLookup}
                    className="px-4 py-3.5 rounded-2xl bg-studio-light text-studio-text text-xs font-extrabold hover:bg-studio-green hover:text-white transition"
                  >
                    {cepStatus === "loading" ? "Buscando..." : "Buscar CEP"}
                  </button>
                </div>
                {cepStatus === "error" && <p className="text-[11px] text-danger">CEP inválido.</p>}
                <input
                  name="address_logradouro"
                  value={logradouro}
                  placeholder="Logradouro"
                  onChange={(e) => setLogradouro(e.target.value)}
                  className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="address_numero"
                    value={numero}
                    placeholder="Número"
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  />
                  <input
                    name="address_complemento"
                    value={complemento}
                    placeholder="Complemento"
                    onChange={(e) => setComplemento(e.target.value)}
                    className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="address_bairro"
                    value={bairro}
                    placeholder="Bairro"
                    onChange={(e) => setBairro(e.target.value)}
                    className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  />
                  <input
                    name="address_cidade"
                    value={cidade}
                    placeholder="Cidade"
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  />
                </div>
                <input
                  name="address_estado"
                  value={estado}
                  placeholder="Estado (UF)"
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                  maxLength={2}
                  className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20 uppercase"
                />
                {hasMapsQuery && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-studio-green hover:underline"
                  >
                    Ver endereço no Maps
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-xs font-extrabold text-muted">
                  <input
                    type="checkbox"
                    name="is_vip"
                    checked={isVip}
                    onChange={(event) => setIsVip(event.target.checked)}
                    className="accent-studio-green"
                  />
                  VIP
                </label>
                <label className="flex items-center gap-2 text-xs font-extrabold text-muted">
                  <input
                    type="checkbox"
                    name="needs_attention"
                    checked={needsAttention}
                    onChange={(event) => setNeedsAttention(event.target.checked)}
                    className="accent-studio-green"
                  />
                  Atenção
                </label>
                <label className="flex items-center gap-2 text-xs font-extrabold text-muted">
                  <input
                    type="checkbox"
                    name="marketing_opt_in"
                    checked={marketingOptIn}
                    onChange={(event) => setMarketingOptIn(event.target.checked)}
                    className="accent-studio-green"
                  />
                  Aceita marketing
                </label>
                <label className="flex items-center gap-2 text-xs font-extrabold text-muted">
                  <input
                    type="checkbox"
                    name="is_minor"
                    checked={isMinor}
                    onChange={(event) => setIsMinor(event.target.checked)}
                    className="accent-studio-green"
                  />
                  Menor de idade
                </label>
              </div>

              {isMinor && (
                <div className="grid grid-cols-1 gap-3">
                  <label className="text-xs font-extrabold text-muted uppercase">Responsável</label>
                  <input
                    name="guardian_name"
                    defaultValue={client.guardian_name ?? ""}
                    placeholder="Nome do responsável"
                    className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  />
                  <input
                    name="guardian_phone"
                    defaultValue={client.guardian_phone ?? ""}
                    placeholder="Telefone do responsável"
                    className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  />
                  <input
                    name="guardian_cpf"
                    defaultValue={client.guardian_cpf ?? ""}
                    placeholder="CPF do responsável"
                    className="w-full bg-white border border-line rounded-2xl py-3.5 px-4 text-studio-text font-semibold focus:outline-none focus:ring-2 focus:ring-studio-green/20"
                  />
                </div>
              )}

              {message && (
                <div
                  className={`text-xs font-extrabold px-3 py-2 rounded-xl ${
                    message.type === "success" ? "bg-emerald-50 text-ok" : "bg-red-50 text-danger"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={Boolean(phoneError || cpfError)}
                className="w-full bg-studio-green text-white font-extrabold py-3 rounded-2xl shadow-soft hover:bg-studio-green-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Salvar alterações
              </button>
            </form>

            <button
              onClick={async () => {
                if (!confirm("Tem certeza? Isso apagará este cliente.")) return;
                const result = await deleteClient(client.id);
                if (!result.ok) {
                  setMessage({ type: "error", text: result.error.message });
                  return;
                }
                window.location.href = "/clientes";
              }}
              className="flex items-center justify-center gap-2 text-xs font-extrabold text-danger bg-red-50 px-3 py-2 rounded-full hover:bg-red-100 transition"
            >
              <Trash2 size={14} /> Apagar cliente
            </button>
          </SurfaceCard>
        )}
      </section>
    </div>
  );
}
