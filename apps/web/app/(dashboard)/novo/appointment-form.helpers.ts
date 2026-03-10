import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { normalizeReferenceLabel } from "../../../src/modules/clients/name-profile";
import { META_TEMPLATE_PUBLIC_SAMPLE_CODE } from "../../../src/shared/meta-template-demo";
import {
  APPOINTMENT_NOTICE_TEMPLATE_MATRIX,
  type AppointmentNoticeLocation,
  type AppointmentNoticePaymentScenario,
} from "../../../src/modules/notifications/whatsapp-created-template-rules";
import { renderWhatsAppTemplateAsText } from "../../../src/modules/notifications/whatsapp-template-renderer";
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
  isHomeVisit: boolean;
  totalAmount?: number;
  displacementFee?: number;
  paidAmount?: number;
  paymentStatus?: string | null;
  receiptPublicId?: string | null;
  paymentLinkPublicId?: string | null;
  locationLine?: string;
  template?: string;
}) {
  void params.template;
  const dateTime = params.date && params.time ? `${params.date}T${params.time}:00` : params.date;
  const startDate = dateTime ? parseISO(dateTime) : new Date();
  const dayOfWeek = format(startDate, "EEEE", { locale: ptBR });
  const dayOfWeekLabel = dayOfWeek ? `${dayOfWeek[0]?.toUpperCase() ?? ""}${dayOfWeek.slice(1)}` : "";
  const day = params.date ? format(parseISO(params.date), "dd", { locale: ptBR }) : format(startDate, "dd", { locale: ptBR });
  const month = params.date ? format(parseISO(params.date), "MMMM", { locale: ptBR }) : format(startDate, "MMMM", { locale: ptBR });
  const timeLabel = params.time || format(startDate, "HH:mm", { locale: ptBR });
  const dateLabel = [dayOfWeekLabel, `dia ${day} de ${month}`].filter(Boolean).join(", ");

  const totalAmount = Number.isFinite(Number(params.totalAmount)) ? Number(params.totalAmount) : 0;
  const displacementFee = Number.isFinite(Number(params.displacementFee)) ? Number(params.displacementFee) : 0;
  const paidAmount = Number.isFinite(Number(params.paidAmount)) ? Number(params.paidAmount) : 0;
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);
  const careAmount = Math.max(totalAmount - displacementFee, 0);
  const paymentStatus = (params.paymentStatus ?? "").trim().toLowerCase();
  const location: AppointmentNoticeLocation = params.isHomeVisit ? "home" : "studio";

  const paymentScenario: AppointmentNoticePaymentScenario =
    paymentStatus === "paid" || paidAmount >= totalAmount
      ? "paid_integral"
      : paidAmount > 0
        ? "signal_paid"
        : "pay_at_attendance";
  const templateName = APPOINTMENT_NOTICE_TEMPLATE_MATRIX[location][paymentScenario].sem_oi_flora;
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      Math.max(0, value)
    );
  };

  const variableMap = {
    client_name: params.clientName.trim() || "Cliente",
    service_name: params.serviceName.trim() || "Seu cuidado",
    date_label: dateLabel,
    time_label: timeLabel,
    home_address_line: params.locationLine?.trim() || "Endereço informado no agendamento",
    total_amount: formatMoney(totalAmount),
    signal_paid_amount: formatMoney(Math.min(paidAmount, totalAmount)),
    remaining_amount: formatMoney(remainingAmount),
    care_amount: formatMoney(careAmount),
    displacement_fee: formatMoney(displacementFee),
    paid_amount: formatMoney(paidAmount),
    total_due: formatMoney(remainingAmount > 0 ? remainingAmount : totalAmount),
    receipt_payment_public_id: (params.receiptPublicId ?? "").trim() || META_TEMPLATE_PUBLIC_SAMPLE_CODE,
    payment_link_public_id: (params.paymentLinkPublicId ?? "").trim() || META_TEMPLATE_PUBLIC_SAMPLE_CODE,
  };

  return renderWhatsAppTemplateAsText({
    templateName,
    variableMap,
  });
}

export function buildGoogleMapsSearchHref(query: string | null | undefined) {
  const normalized = (query ?? "").trim();
  if (!normalized) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalized)}`;
}
