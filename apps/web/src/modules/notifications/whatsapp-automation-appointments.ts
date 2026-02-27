import { createServiceClient } from "../../../lib/supabase/service";
import type { Json } from "../../../lib/supabase/types";
import { buildAppointmentVoucherPath } from "../../shared/public-links";
import { resolveClientNames } from "../clients/name-profile";
import {
  WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_LANGUAGE,
  WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME,
  WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_LANGUAGE,
  WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME,
} from "./automation-config";
import {
  asJsonObject,
  formatAppointmentDateForTemplate,
  onlyDigits,
  resolveLocationLineFromAppointmentRecord,
  resolvePublicBaseUrlFromWebhookOrigin,
} from "./whatsapp-automation.helpers";
import {
  assertMetaCloudConfigBase,
  getMetaCloudTestRecipient,
  sendMetaCloudMessage,
  sendMetaCloudTextMessage,
} from "./whatsapp-meta-client";
import type { NotificationJobRow } from "./repository";

export interface DeliveryResult {
  providerMessageId: string | null;
  deliveredAt: string;
  deliveryMode: string;
  messagePreview: string;
  templateName?: string | null;
  templateLanguage?: string | null;
  recipient?: string | null;
  providerName?: string | null;
  providerResponse?: Record<string, unknown> | null;
}

interface AppointmentTemplateContext {
  clientName: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  locationLine: string;
}

export interface CustomerServiceWindowCheckResult {
  isOpen: boolean;
  reason: "open" | "no_inbound" | "expired";
  checkedAt: string;
  lastInboundAt: string | null;
  customerWaId: string | null;
}

async function loadAppointmentTemplateContext(job: NotificationJobRow): Promise<AppointmentTemplateContext> {
  if (!job.appointment_id) {
    throw new Error("Job sem appointment_id para montar template de agendamento.");
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, tenant_id, start_time, service_name, is_home_visit, address_logradouro, address_numero, address_bairro, address_cidade, address_estado, clients(name, endereco_completo, public_first_name, public_last_name, internal_reference)"
    )
    .eq("id", job.appointment_id)
    .eq("tenant_id", job.tenant_id)
    .maybeSingle();

  if (error) {
    throw new Error("Falha ao carregar dados do agendamento para template WhatsApp.");
  }
  if (!data) {
    throw new Error("Agendamento não encontrado para template WhatsApp.");
  }

  const record = data as unknown as Record<string, unknown>;
  const client = asJsonObject(record.clients as Json | undefined);
  const clientName = resolveClientNames({
    name: typeof client?.name === "string" ? client.name : null,
    publicFirstName: typeof client?.public_first_name === "string" ? client.public_first_name : null,
    publicLastName: typeof client?.public_last_name === "string" ? client.public_last_name : null,
    internalReference: typeof client?.internal_reference === "string" ? client.internal_reference : null,
  }).messagingFirstName;
  const serviceName =
    (typeof record.service_name === "string" && record.service_name.trim()) || "Seu atendimento";
  const startTimeIso =
    (typeof record.start_time === "string" && record.start_time) ||
    (typeof asJsonObject(job.payload).start_time === "string"
      ? (asJsonObject(job.payload).start_time as string)
      : "");
  const { dateLabel, timeLabel } = formatAppointmentDateForTemplate(startTimeIso);

  return {
    clientName,
    serviceName,
    dateLabel,
    timeLabel,
    locationLine: resolveLocationLineFromAppointmentRecord(record),
  };
}

export async function sendMetaCloudCreatedAppointmentTemplate(
  job: NotificationJobRow
): Promise<DeliveryResult> {
  assertMetaCloudConfigBase();
  if (!WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME) {
    throw new Error("WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME não configurado.");
  }

  const to = getMetaCloudTestRecipient();
  const context = await loadAppointmentTemplateContext(job);

  const requestBody = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME,
      language: {
        code: WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_LANGUAGE,
      },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: context.clientName },
            { type: "text", text: context.serviceName },
            { type: "text", text: context.dateLabel },
            { type: "text", text: context.timeLabel },
            { type: "text", text: context.locationLine },
          ],
        },
      ],
    },
  };

  const { payload, providerMessageId } = await sendMetaCloudMessage(requestBody);

  return {
    providerMessageId,
    deliveredAt: new Date().toISOString(),
    deliveryMode: "meta_cloud_template_created_appointment",
    messagePreview:
      `Meta template created (${WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME}) -> ${to} ` +
      `• ${context.clientName} • ${context.serviceName} • ${context.dateLabel} ${context.timeLabel}`,
    templateName: WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME,
    templateLanguage: WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_LANGUAGE,
    recipient: to,
    providerName: "meta_cloud",
    providerResponse: payload,
  };
}

export async function sendMetaCloudReminderAppointmentTemplate(
  job: NotificationJobRow
): Promise<DeliveryResult> {
  assertMetaCloudConfigBase();
  if (!WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME) {
    throw new Error("WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME não configurado.");
  }

  const to = getMetaCloudTestRecipient();
  const context = await loadAppointmentTemplateContext(job);

  const requestBody = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME,
      language: {
        code: WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_LANGUAGE,
      },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: context.clientName },
            { type: "text", text: context.serviceName },
            { type: "text", text: context.dateLabel },
            { type: "text", text: context.timeLabel },
            { type: "text", text: context.locationLine },
          ],
        },
      ],
    },
  };

  const { payload, providerMessageId } = await sendMetaCloudMessage(requestBody);

  return {
    providerMessageId,
    deliveredAt: new Date().toISOString(),
    deliveryMode: "meta_cloud_template_appointment_reminder",
    messagePreview:
      `Meta template reminder (${WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME}) -> ${to} ` +
      `• ${context.clientName} • ${context.serviceName} • ${context.dateLabel} ${context.timeLabel}`,
    templateName: WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME,
    templateLanguage: WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_LANGUAGE,
    recipient: to,
    providerName: "meta_cloud",
    providerResponse: payload,
  };
}

export async function buildAppointmentVoucherLink(params: {
  tenantId: string;
  appointmentId: string;
  webhookOrigin?: string;
}) {
  const base = resolvePublicBaseUrlFromWebhookOrigin(params.webhookOrigin);
  const supabase = createServiceClient();
  let attendanceCode: string | null = null;

  const { data, error } = await supabase
    .from("appointments")
    .select("attendance_code")
    .eq("id", params.appointmentId)
    .eq("tenant_id", params.tenantId)
    .maybeSingle();

  if (error) {
    console.warn("[whatsapp-automation] Falha ao buscar attendance_code para voucher:", error.message);
  } else if (data && typeof data.attendance_code === "string") {
    const normalizedCode = data.attendance_code.trim();
    attendanceCode = normalizedCode || null;
  }

  const voucherPath = buildAppointmentVoucherPath({
    appointmentId: params.appointmentId,
    attendanceCode,
  });
  return `${base}${voucherPath}`;
}

export function buildButtonReplyAutoMessage(params: {
  action: "confirm" | "reschedule" | "talk_to_jana";
  voucherLink: string;
}) {
  switch (params.action) {
    case "confirm":
      return (
        "Perfeito! Seu agendamento está confirmado ✅\n\n" +
        "Aqui está o seu voucher para facilitar:\n" +
        `${params.voucherLink}\n\n` +
        "Flora | Estúdio Corpo & Alma Humanizado"
      );
    case "reschedule":
      return (
        "Perfeito! Iniciando seu reagendamento ✅\n\n" +
        "Vou registrar sua solicitação e a Jana/estúdio dará sequência por aqui.\n\n" +
        "Flora | Estúdio Corpo & Alma Humanizado"
      );
    case "talk_to_jana":
      return (
        "Perfeito! Vou sinalizar que você quer falar com a Jana ✅\n\n" +
        "Ela (ou o estúdio) continua o atendimento por aqui.\n\n" +
        "Flora | Estúdio Corpo & Alma Humanizado"
      );
    default:
      return "Recebemos sua resposta. Obrigada! 🌿";
  }
}

function buildCanceledAppointmentSessionMessage(context: AppointmentTemplateContext) {
  return (
    `Olá, ${context.clientName}! Tudo bem?\n\n` +
    "Aqui é a Flora, assistente virtual do Estúdio Corpo & Alma Humanizado. 🌿\n\n" +
    "⚠️ Estou passando para avisar que o horário abaixo foi cancelado:\n\n" +
    `✨ *Seu cuidado:* ${context.serviceName}\n` +
    `🗓️ *Horário cancelado:* ${context.dateLabel}, às ${context.timeLabel}\n` +
    `📍 *Nosso ponto de encontro:* ${context.locationLine}\n\n` +
    "Se precisar, responda por aqui que ajudamos com um novo horário.\n\n" +
    "Flora | Estúdio Corpo & Alma Humanizado"
  );
}

export async function sendMetaCloudCanceledAppointmentSessionMessage(
  job: NotificationJobRow
): Promise<DeliveryResult> {
  assertMetaCloudConfigBase();
  const payload = asJsonObject(job.payload ?? null);
  const automation = asJsonObject((payload.automation as Json | undefined) ?? undefined);
  const customerWaId =
    typeof automation.customer_wa_id === "string" ? onlyDigits(automation.customer_wa_id) : "";
  if (!customerWaId) {
    throw new Error("Janela de conversa de 24h não está aberta para este agendamento.");
  }

  const context = await loadAppointmentTemplateContext(job);
  const messageText = buildCanceledAppointmentSessionMessage(context);
  const outbound = await sendMetaCloudTextMessage({ to: customerWaId, text: messageText });

  return {
    providerMessageId: outbound.providerMessageId,
    deliveredAt: outbound.deliveredAt,
    deliveryMode: "meta_cloud_session_appointment_canceled",
    messagePreview:
      `Meta session cancel -> ${customerWaId} • ${context.clientName} • ${context.serviceName} • ` +
      `${context.dateLabel} ${context.timeLabel}`,
    templateName: null,
    templateLanguage: null,
    recipient: customerWaId,
    providerName: "meta_cloud",
    providerResponse: outbound.payload ?? null,
  };
}

export async function hasOpenCustomerServiceWindowForAppointment(
  tenantId: string,
  appointmentId: string,
  now = new Date()
): Promise<CustomerServiceWindowCheckResult> {
  const supabase = createServiceClient();
  const checkedAt = now.toISOString();
  const { data, error } = await supabase
    .from("appointment_messages")
    .select("created_at, payload")
    .eq("tenant_id", tenantId)
    .eq("appointment_id", appointmentId)
    .eq("type", "auto_appointment_reply_inbound")
    .eq("status", "received_auto_reply")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[whatsapp-automation] Falha ao verificar janela 24h:", error);
    return {
      isOpen: false,
      reason: "no_inbound",
      checkedAt,
      lastInboundAt: null,
      customerWaId: null,
    };
  }

  const payload = asJsonObject((data?.payload ?? null) as Json | null | undefined);
  const lastInboundAt = typeof data?.created_at === "string" ? data.created_at : null;
  const customerWaId = typeof payload.from === "string" ? onlyDigits(payload.from) : null;
  if (!lastInboundAt || !customerWaId) {
    return {
      isOpen: false,
      reason: "no_inbound",
      checkedAt,
      lastInboundAt: lastInboundAt ?? null,
      customerWaId: customerWaId ?? null,
    };
  }

  const lastInboundDate = new Date(lastInboundAt);
  if (Number.isNaN(lastInboundDate.getTime())) {
    return {
      isOpen: false,
      reason: "no_inbound",
      checkedAt,
      lastInboundAt,
      customerWaId,
    };
  }

  const diffMs = now.getTime() - lastInboundDate.getTime();
  const within24h = diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
  return {
    isOpen: within24h,
    reason: within24h ? "open" : "expired",
    checkedAt,
    lastInboundAt,
    customerWaId,
  };
}
