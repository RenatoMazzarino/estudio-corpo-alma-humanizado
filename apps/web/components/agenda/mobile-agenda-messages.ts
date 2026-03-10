import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AttendanceOverview, MessageType } from "../../lib/attendance/attendance-types";
import { buildAppointmentPaymentPath, buildAppointmentReceiptPath } from "../../src/shared/public-links";
import { renderWhatsAppTemplateAsText } from "../../src/modules/notifications/whatsapp-template-renderer";
import { resolveReminderTemplateSelection } from "../../src/modules/notifications/whatsapp-reminder-template-rules";

export function toWhatsappLink(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

export function resolvePublicBaseUrl(publicBaseUrl: string) {
  const raw = publicBaseUrl.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return "";
}

export function buildAgendaMessage(
  type: MessageType,
  appointment: AttendanceOverview["appointment"],
  publicBaseUrl: string,
  options?: {
    paymentId?: string | null;
    chargeAmount?: number | null;
    checkoutTotal?: number | null;
    paidAmount?: number | null;
  }
) {
  const name = appointment.clients?.name?.trim() ?? "";
  const greeting = name ? `Olá, ${name}!` : "Olá!";
  const startDate = new Date(appointment.start_time);
  const dayOfWeek = format(startDate, "EEEE", { locale: ptBR });
  const dayOfWeekLabel = dayOfWeek ? `${dayOfWeek[0]?.toUpperCase() ?? ""}${dayOfWeek.slice(1)}` : "";
  const dateLabel = format(startDate, "dd/MM", { locale: ptBR });
  const timeLabel = format(startDate, "HH:mm", { locale: ptBR });
  const serviceName = (appointment.service_name ?? "").trim() || "Seu atendimento";
  const dateLine = [dayOfWeekLabel, dateLabel].filter(Boolean).join(", ");
  const serviceSegment = serviceName ? ` 💆‍♀️ Serviço: ${serviceName}` : "";
  const clientAddress =
    appointment.is_home_visit && appointment.address_logradouro
      ? `${appointment.address_logradouro}, ${appointment.address_numero ?? "s/n"}`
      : null;
  const locationLine = appointment.is_home_visit
    ? `🏡 Local: Domicílio${clientAddress ? ` (${clientAddress})` : ""}`
    : "📍 Local: Estúdio Corpo & Alma";
  const serviceLine = serviceName ? `para o seu ${serviceName} às ${timeLabel}.` : `para o seu horário às ${timeLabel}.`;

  if (type === "created_confirmation") {
    return [
      `${greeting}`,
      "",
      `Seu agendamento foi confirmado ${serviceLine}`,
      `📅 Data: ${dateLine}`,
      locationLine,
      serviceSegment,
      "",
      "Se precisar de algo, estou por aqui.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (type === "reminder_24h") {
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        Math.max(0, value)
      );
    const totalAmount =
      typeof options?.checkoutTotal === "number" && Number.isFinite(options.checkoutTotal)
        ? options.checkoutTotal
        : Number(appointment.price ?? 0);
    const paidAmount =
      typeof options?.paidAmount === "number" && Number.isFinite(options.paidAmount) ? options.paidAmount : 0;
    const selection = resolveReminderTemplateSelection({
      isHomeVisit: appointment.is_home_visit,
      totalAmount,
      paidAmount,
      paymentStatus: appointment.payment_status ?? null,
    });
    return renderWhatsAppTemplateAsText({
      templateName: selection.templateName,
      variableMap: {
        client_name: name || "Cliente",
        service_name: serviceName,
        time_label: timeLabel,
        home_address_line:
          clientAddress ||
          appointment.clients?.endereco_completo?.trim() ||
          "Endereço informado no agendamento",
        total_due: formatCurrency(Math.max(totalAmount - paidAmount, 0)),
      },
    });
  }

  if (type === "post_survey") {
    return [
      `${greeting}`,
      "",
      "Obrigada por confiar no Estúdio Corpo & Alma 🤍",
      "Se puder, me conte em uma nota de 0 a 10 como foi sua experiência hoje.",
    ].join("\n");
  }

  if (type === "payment_charge") {
    const base = resolvePublicBaseUrl(publicBaseUrl);
    const paymentPath = buildAppointmentPaymentPath({
      appointmentId: appointment.id,
      attendanceCode: appointment.attendance_code ?? null,
    });
    const paymentLink = base && paymentPath ? `${base}${paymentPath}` : "";
    const chargeAmount = options?.chargeAmount ?? null;
    const chargeLabel =
      typeof chargeAmount === "number" && Number.isFinite(chargeAmount) && chargeAmount > 0
        ? `💰 Valor pendente: R$ ${chargeAmount.toFixed(2).replace(".", ",")}`
        : null;
    const paymentLinkBlock = paymentLink ? `🔗 Link para pagamento: ${paymentLink}` : null;
    return [
      `${greeting}`,
      "",
      "Identificamos saldo pendente do seu atendimento.",
      chargeLabel,
      paymentLinkBlock,
      "",
      "Se preferir, responda esta mensagem e combinamos a melhor forma de pagamento.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (type === "payment_receipt") {
    const base = resolvePublicBaseUrl(publicBaseUrl);
    const receiptPath = buildAppointmentReceiptPath({
      appointmentId: appointment.id,
      attendanceCode: appointment.attendance_code ?? null,
    });
    const receiptLink = base && receiptPath ? `${base}${receiptPath}` : "";
    const receiptBlock = receiptLink ? `📄 Recibo: ${receiptLink}` : null;
    return [
      `${greeting}`,
      "",
      "Pagamento registrado com sucesso ✅",
      receiptBlock,
      "",
      "Obrigada! Qualquer dúvida, é só chamar.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return "";
}
