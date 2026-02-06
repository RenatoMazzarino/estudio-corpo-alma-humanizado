"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarPlus, ChevronLeft, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Database } from "../../../../lib/supabase/types";
import { Chip } from "../../../../components/ui/chip";
import { SurfaceCard } from "../../../../components/ui/surface-card";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ClientPhoneRow = Database["public"]["Tables"]["client_phones"]["Row"];
type ClientEmailRow = Database["public"]["Tables"]["client_emails"]["Row"];
type ClientAddressRow = Database["public"]["Tables"]["client_addresses"]["Row"];
type ClientHealthItemRow = Database["public"]["Tables"]["client_health_items"]["Row"];

interface ClientProfileProps {
  client: ClientRow;
  metrics: {
    visits: number;
    absences: number;
    lastVisitLabel: string;
  };
  phones: ClientPhoneRow[];
  emails: ClientEmailRow[];
  addresses: ClientAddressRow[];
  healthItems: ClientHealthItemRow[];
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "CA";
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function buildAddressLine(payload: {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
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

  return parts.length > 0 ? parts.join(", ") : null;
}

export function ClientProfile({ client, metrics, phones, emails, addresses, healthItems }: ClientProfileProps) {
  const [compactHeader, setCompactHeader] = useState(false);
  const initials = client.initials || getInitials(client.name);
  const createdAtLabel = client.created_at
    ? new Date(client.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
    : "";

  const primaryPhone = phones.find((phone) => phone.is_primary) ?? phones[0] ?? null;
  const whatsappPhone = phones.find((phone) => phone.is_whatsapp) ?? primaryPhone;
  const primaryAddress = addresses.find((address) => address.is_primary) ?? addresses[0] ?? null;

  const whatsappDigits = whatsappPhone?.number_raw ? onlyDigits(whatsappPhone.number_raw) : "";
  const phoneDigits = primaryPhone?.number_raw ? onlyDigits(primaryPhone.number_raw) : "";
  const whatsappLink = whatsappDigits ? `https://wa.me/55${whatsappDigits}` : null;
  const callLink = phoneDigits ? `tel:+55${phoneDigits}` : null;

  const addressLine = primaryAddress
    ? buildAddressLine({
        logradouro: primaryAddress.address_logradouro,
        numero: primaryAddress.address_numero,
        complemento: primaryAddress.address_complemento,
        bairro: primaryAddress.address_bairro,
        cidade: primaryAddress.address_cidade,
        estado: primaryAddress.address_estado,
        cep: primaryAddress.address_cep,
      })
    : null;
  const mapQuery = addressLine ? encodeURIComponent(addressLine) : null;
  const mapsLink = mapQuery ? `https://maps.google.com/?q=${mapQuery}` : null;

  const allergies = healthItems.filter((item) => item.type === "allergy");
  const conditions = healthItems.filter((item) => item.type === "condition");
  const quickTags = [...allergies, ...conditions].slice(0, 3);

  useEffect(() => {
    const container = document.querySelector("[data-shell-scroll]") as HTMLElement | null;
    if (!container) return;
    const handle = () => setCompactHeader(container.scrollTop > 120);
    handle();
    container.addEventListener("scroll", handle, { passive: true });
    return () => container.removeEventListener("scroll", handle);
  }, []);

  return (
    <div>
      <div
        className={`sticky top-0 z-40 safe-top px-6 pt-4 pb-3 bg-white/95 backdrop-blur border-b border-line transition ${
          compactHeader ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/clientes"
            className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center"
            aria-label="Voltar"
          >
            <ChevronLeft size={18} />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Cliente</p>
            <p className="text-sm font-extrabold text-studio-text truncate">{client.name}</p>
          </div>
        </div>
      </div>

      <section className="relative bg-white rounded-b-[2.5rem] shadow-soft overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-36 bg-linear-to-b from-studio-light to-white"></div>
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-studio-light/60 blur-2xl"></div>
          <div className="absolute -left-12 top-10 w-52 h-52 rounded-full bg-studio-light/40 blur-2xl"></div>
        </div>

        <div className="relative safe-top pt-20 px-6 pb-6 flex flex-col items-center text-center">
          <div className="relative w-24 h-24 rounded-full bg-white p-1 shadow-[0_10px_30px_rgba(0,0,0,0.08)] mb-3 overflow-hidden">
            {client.avatar_url ? (
              <Image
                src={client.avatar_url}
                alt={client.name}
                fill
                sizes="96px"
                className="object-cover rounded-full"
                unoptimized
              />
            ) : (
              <div className="w-full h-full rounded-full bg-studio-green text-white flex items-center justify-center text-3xl font-serif font-bold">
                {initials}
              </div>
            )}
          </div>

          <h1 className="text-2xl font-serif font-bold text-studio-text leading-tight">{client.name}</h1>
          <p className="text-sm text-muted font-semibold mt-1">Cliente desde {createdAtLabel || "-"}</p>

          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {client.is_vip && <Chip tone="success">VIP</Chip>}
            {client.needs_attention && <Chip tone="danger">Atenção</Chip>}
            {client.is_minor && <Chip tone="warning">Menor</Chip>}
            {quickTags.map((item) => (
              <Chip key={item.id} tone={item.type === "allergy" ? "danger" : "warning"}>
                {item.label}
              </Chip>
            ))}
          </div>

          <div className="mt-5 flex gap-5">
            {whatsappLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-line flex items-center justify-center group-active:scale-95 transition">
                  <MessageCircle className="w-5 h-5 text-studio-green" />
                </div>
                <span className="text-[10px] font-extrabold text-muted">Whats</span>
              </a>
            ) : (
              <div className="flex flex-col items-center gap-1 opacity-40">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-line flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-studio-green" />
                </div>
                <span className="text-[10px] font-extrabold text-muted">Whats</span>
              </div>
            )}

            {callLink ? (
              <a
                href={callLink}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-line flex items-center justify-center group-active:scale-95 transition">
                  <Phone className="w-5 h-5 text-studio-text" />
                </div>
                <span className="text-[10px] font-extrabold text-muted">Ligar</span>
              </a>
            ) : (
              <div className="flex flex-col items-center gap-1 opacity-40">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-line flex items-center justify-center">
                  <Phone className="w-5 h-5 text-studio-text" />
                </div>
                <span className="text-[10px] font-extrabold text-muted">Ligar</span>
              </div>
            )}

            {mapsLink ? (
              <a href={mapsLink} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 group">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-line flex items-center justify-center group-active:scale-95 transition">
                  <MapPin className="w-5 h-5 text-studio-text" />
                </div>
                <span className="text-[10px] font-extrabold text-muted">Mapa</span>
              </a>
            ) : (
              <div className="flex flex-col items-center gap-1 opacity-40">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-line flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-studio-text" />
                </div>
                <span className="text-[10px] font-extrabold text-muted">Mapa</span>
              </div>
            )}

            <Link href={`/?view=day&date=${new Date().toISOString().slice(0, 10)}`} className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 rounded-2xl bg-studio-green text-white shadow-soft flex items-center justify-center group-active:scale-95 transition">
                <CalendarPlus className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold text-muted">Agendar</span>
            </Link>
          </div>
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
            <div className="px-5 py-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-studio-light flex items-center justify-center text-studio-green">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Telefones</p>
                {phones.length > 0 ? (
                  <div className="space-y-1">
                    {phones.map((phone) => (
                      <p key={phone.id} className="text-sm font-extrabold text-studio-text truncate">
                        {phone.number_raw}
                        {phone.is_whatsapp && <span className="ml-2 text-[10px] text-studio-green">Whats</span>}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">Sem telefone cadastrado.</p>
                )}
              </div>
            </div>
            <div className="h-px bg-line mx-5"></div>
            <div className="px-5 py-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-paper border border-line flex items-center justify-center text-studio-text">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Emails</p>
                {emails.length > 0 ? (
                  <div className="space-y-1">
                    {emails.map((email) => (
                      <p key={email.id} className="text-sm font-extrabold text-studio-text truncate">
                        {email.email}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">Sem email cadastrado.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 pl-1">Endereços</h3>
          {addresses.length > 0 ? (
            <div className="space-y-3">
              {addresses.map((address) => (
                <div key={address.id} className="bg-white rounded-3xl border border-white shadow-sm p-5">
                  <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">
                    {address.label || "Endereço"}
                    {address.is_primary && <span className="ml-2 text-studio-green">Principal</span>}
                  </p>
                  <p className="text-sm font-extrabold text-studio-text mt-1">
                    {buildAddressLine({
                      logradouro: address.address_logradouro,
                      numero: address.address_numero,
                      complemento: address.address_complemento,
                      bairro: address.address_bairro,
                      cidade: address.address_cidade,
                      estado: address.address_estado,
                      cep: address.address_cep,
                    }) || "Endereço não informado"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <SurfaceCard className="text-center py-6 text-muted border border-dashed border-line bg-studio-light/40">
              <p>Nenhum endereço cadastrado.</p>
            </SurfaceCard>
          )}
        </div>

        <div>
          <h3 className="text-[11px] font-extrabold text-muted uppercase tracking-[0.22em] mb-2 pl-1">Saúde & Preferências</h3>
          <div className="bg-white rounded-3xl border border-white shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {allergies.map((item) => (
                <span
                  key={item.id}
                  className="px-3 py-1 rounded-xl bg-red-50 text-red-600 text-[11px] font-extrabold border border-red-100"
                >
                  {item.label}
                </span>
              ))}
              {conditions.map((item) => (
                <span
                  key={item.id}
                  className="px-3 py-1 rounded-xl bg-orange-50 text-orange-600 text-[11px] font-extrabold border border-orange-100"
                >
                  {item.label}
                </span>
              ))}
              {allergies.length === 0 && conditions.length === 0 && (
                <span className="text-xs text-muted">Sem tags de saúde cadastradas.</span>
              )}
            </div>

            {client.contraindications && (
              <div className="bg-paper rounded-2xl p-4 border border-line">
                <p className="text-xs text-studio-text font-semibold">Contraindicações</p>
                <p className="text-xs text-muted mt-1 whitespace-pre-wrap">{client.contraindications}</p>
              </div>
            )}

            {client.preferences_notes && (
              <div className="bg-paper rounded-2xl p-4 border border-line">
                <p className="text-xs text-studio-text font-semibold">Preferências</p>
                <p className="text-xs text-muted mt-1 whitespace-pre-wrap">{client.preferences_notes}</p>
              </div>
            )}

            {client.clinical_history && (
              <div className="bg-paper rounded-2xl p-4 border border-line">
                <p className="text-xs text-studio-text font-semibold">Histórico clínico</p>
                <p className="text-xs text-muted mt-1 whitespace-pre-wrap">{client.clinical_history}</p>
              </div>
            )}

            {client.anamnese_url && (
              <a
                href={client.anamnese_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-xs font-semibold text-studio-green underline"
              >
                Ver anamnese anexada
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
