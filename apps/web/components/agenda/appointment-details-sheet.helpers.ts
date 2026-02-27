import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AppointmentMessage, MessageType } from "../../lib/attendance/attendance-types";

export const messageByType = (messages: AppointmentMessage[], type: MessageType) =>
  messages.find((message) => message.type === type) ?? null;

export const messageByRawType = (messages: AppointmentMessage[], type: string) =>
  messages.find((message) => (message.type as unknown as string) === type) ?? null;

export const isMessageSent = (status?: string | null) =>
  status === "sent_manual" || status === "sent_auto" || status === "delivered";

export const formatSentLabel = (sentAt?: string | null) => {
  if (!sentAt) return "Pendente de envio";
  const sentDate = new Date(sentAt);
  if (isToday(sentDate)) {
    return `Enviada hoje às ${format(sentDate, "HH:mm", { locale: ptBR })}`;
  }
  if (isYesterday(sentDate)) {
    return `Enviada ontem às ${format(sentDate, "HH:mm", { locale: ptBR })}`;
  }
  return `Enviada em ${format(sentDate, "dd MMM 'às' HH:mm", { locale: ptBR })}`;
};

export const formatStatusMoment = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (isToday(date)) return `hoje às ${format(date, "HH:mm", { locale: ptBR })}`;
  if (isYesterday(date)) return `ontem às ${format(date, "HH:mm", { locale: ptBR })}`;
  return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
};

export const getAutomationStatusLabel = (message: AppointmentMessage | null) => {
  if (!message) return "Automação: pendente / sem envio";
  const status = (message.status as unknown as string) ?? "";
  const at = formatStatusMoment(message.sent_at ?? message.created_at ?? null);
  switch (status) {
    case "queued_auto":
      return "Automação: em fila";
    case "retry_scheduled_auto":
      return "Automação: reenvio agendado";
    case "sent_auto":
      return at ? `Automação: enviada (${at})` : "Automação: enviada";
    case "sent_auto_dry_run":
      return at ? `Automação: simulada (${at})` : "Automação: simulada";
    case "provider_sent":
      return at ? `Automação: enviada e aguardando entrega (${at})` : "Automação: enviada e aguardando entrega";
    case "provider_delivered":
      return at ? `Automação: entregue (${at})` : "Automação: entregue";
    case "provider_read":
      return at ? `Automação: lida pelo cliente (${at})` : "Automação: lida pelo cliente";
    case "provider_failed":
    case "failed_auto":
      return "Automação: falhou";
    default:
      return `Automação: ${status || "pendente"}`;
  }
};

export const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
};

export const getStatusInfo = (status?: string | null) => {
  switch (status) {
    case "confirmed":
      return { label: "Confirmado", className: "bg-studio-green/10 text-studio-green", dotClass: "bg-studio-green" };
    case "in_progress":
      return { label: "Em andamento", className: "bg-amber-100 text-amber-700", dotClass: "bg-sky-500" };
    case "completed":
      return { label: "Concluído", className: "bg-emerald-100 text-emerald-700", dotClass: "bg-emerald-500" };
    case "canceled_by_client":
      return { label: "Cancelado (cliente)", className: "bg-red-100 text-red-600", dotClass: "bg-red-500" };
    case "canceled_by_studio":
      return { label: "Cancelado", className: "bg-red-100 text-red-600", dotClass: "bg-red-500" };
    case "no_show":
      return { label: "Não compareceu", className: "bg-gray-100 text-gray-500", dotClass: "bg-gray-400" };
    default:
      return { label: "Agendado", className: "bg-orange-50 text-orange-600", dotClass: "bg-amber-400" };
  }
};

export const paymentStatusMap = {
  paid: { label: "PAGO", className: "bg-emerald-50 text-emerald-700", textClass: "text-emerald-600" },
  partial: { label: "PARCIAL", className: "bg-amber-50 text-amber-700", textClass: "text-amber-600" },
  pending: { label: "A RECEBER", className: "bg-gray-100 text-gray-500", textClass: "text-gray-500" },
  waived: { label: "LIBERADO", className: "bg-sky-50 text-sky-700", textClass: "text-sky-600" },
  refunded: { label: "ESTORNADO", className: "bg-slate-100 text-slate-700", textClass: "text-slate-600" },
} as const;

export type PaymentStatus = keyof typeof paymentStatusMap;
