import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { applyAutoMessageTemplate } from "../../../src/shared/auto-messages.utils";
import { normalizeReferenceLabel } from "../../../src/modules/clients/name-profile";
import type { ClientAddress } from "./appointment-form.types";

export function normalizePhoneSearchDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(0, 13);
}

export function isValidEmailAddress(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function splitSeedName(value: string) {
  const cleaned = value.trim();
  if (!cleaned) {
    return { firstName: "", lastName: "", reference: "" };
  }
  const match = cleaned.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  const base = (match?.[1] ?? cleaned).trim();
  const reference = normalizeReferenceLabel(match?.[2] ?? "");
  const [firstName, ...rest] = base.split(/\s+/).filter(Boolean);
  return {
    firstName: firstName ?? "",
    lastName: rest.join(" "),
    reference,
  };
}

export function buildDraftItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildAddressQuery(payload: {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}) {
  const parts = [
    payload.logradouro,
    payload.numero,
    payload.complemento,
    payload.bairro,
    payload.cidade,
    payload.estado,
    payload.cep,
  ].filter((value) => value && value.trim().length > 0);
  return parts.join(", ");
}

export function formatClientAddress(address: ClientAddress) {
  const parts = [
    address.address_logradouro,
    address.address_numero,
    address.address_complemento,
    address.address_bairro,
    address.address_cidade,
    address.address_estado,
    address.address_cep,
  ].filter((value) => value && value.trim().length > 0);
  return parts.join(", ");
}

export function buildCreatedMessage(params: {
  clientName: string;
  date: string;
  time: string;
  serviceName: string;
  locationLine?: string;
  template: string;
}) {
  const name = params.clientName.trim();
  const greeting = name ? `Olá, ${name}!` : "Olá!";
  const dateTime = params.date && params.time ? `${params.date}T${params.time}:00` : params.date;
  const startDate = dateTime ? parseISO(dateTime) : new Date();
  const dayOfWeek = format(startDate, "EEEE", { locale: ptBR });
  const dayOfWeekLabel = dayOfWeek ? `${dayOfWeek[0]?.toUpperCase() ?? ""}${dayOfWeek.slice(1)}` : "";
  const dateLabel = params.date
    ? format(parseISO(params.date), "dd/MM", { locale: ptBR })
    : format(startDate, "dd/MM", { locale: ptBR });
  const timeLabel = params.time || format(startDate, "HH:mm", { locale: ptBR });
  const dateLine = [dayOfWeekLabel, dateLabel].filter(Boolean).join(", ");
  const serviceSegment = params.serviceName ? ` 💆‍♀️ Serviço: ${params.serviceName}` : "";

  return applyAutoMessageTemplate(params.template, {
    greeting,
    date_line: dateLine,
    time: timeLabel,
    service_name: params.serviceName,
    location_line: params.locationLine || "No estúdio",
    service_segment: serviceSegment,
  }).trim();
}

export function buildGoogleMapsSearchHref(query: string | null | undefined) {
  const normalized = (query ?? "").trim();
  if (!normalized) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalized)}`;
}
