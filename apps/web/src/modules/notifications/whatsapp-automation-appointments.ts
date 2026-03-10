import { createServiceClient } from "../../../lib/supabase/service";
import type { Json } from "../../../lib/supabase/types";
import { buildAppointmentVoucherPath } from "../../shared/public-links";
import { resolveClientNames } from "../clients/name-profile";
import {
  asJsonObject,
  formatAppointmentDateForTemplate,
  onlyDigits,
  resolveLocationLineFromAppointmentRecord,
  resolvePublicBaseUrlFromWebhookOrigin,
} from "./whatsapp-automation.helpers";
import {
  APPOINTMENT_NOTICE_TEMPLATE_MATRIX,
  DEFAULT_FLORA_REINTRO_AFTER_DAYS,
  type AppointmentNoticeIntroVariant,
  resolveFloraIntroVariantByHistory,
  resolveNoticeIntroVariantFromPayload,
  resolveCreatedAppointmentTemplateSelection,
} from "./whatsapp-created-template-rules";
import {
  assertMetaCloudConfigBase,
  getMetaCloudTestRecipient,
  sendMetaCloudMessage,
  sendMetaCloudTextMessage,
} from "./whatsapp-meta-client";
import type { NotificationJobRow } from "./repository";
import { getTenantWhatsAppSettings } from "./tenant-whatsapp-settings";
import { getWhatsAppTemplateFromLibrary } from "./whatsapp-template-library";
import { WHATSAPP_AUTOMATION_FLORA_HISTORY_SINCE } from "./automation-config";

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
  clientId: string | null;
  clientName: string;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  locationLine: string;
  isHomeVisit: boolean;
  homeAddressLine: string;
  paymentStatus: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  signalPaidAmount: number;
  displacementFee: number;
  careAmount: number;
  latestPaidPaymentPublicId: string | null;
  paymentLinkPublicId: string;
}

export interface CustomerServiceWindowCheckResult {
  isOpen: boolean;
  reason: "open" | "no_inbound" | "expired";
  checkedAt: string;
  lastInboundAt: string | null;
  customerWaId: string | null;
}

async function loadAppointmentTemplateContext(
  job: NotificationJobRow,
  options?: { studioLocationLine?: string | null }
): Promise<AppointmentTemplateContext> {
  if (!job.appointment_id) {
    throw new Error("Job sem appointment_id para montar template de agendamento.");
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, tenant_id, client_id, attendance_code, start_time, service_name, is_home_visit, payment_status, price, displacement_fee, signal_paid_amount, address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado, clients(name, endereco_completo, public_first_name, public_last_name, internal_reference)"
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
  const appointmentId = typeof record.id === "string" ? record.id : job.appointment_id;
  const clientId = typeof record.client_id === "string" ? record.client_id : null;
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
  const toMoney = (value: unknown) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.round((parsed + Number.EPSILON) * 100) / 100;
  };

  const [checkoutResult, paymentsResult] = await Promise.all([
    supabase
      .from("appointment_checkout")
      .select("total")
      .eq("appointment_id", appointmentId)
      .eq("tenant_id", job.tenant_id)
      .maybeSingle(),
    supabase
      .from("appointment_payments")
      .select("id, provider_ref, amount, status, created_at")
      .eq("appointment_id", appointmentId)
      .eq("tenant_id", job.tenant_id)
      .order("created_at", { ascending: true }),
  ]);

  if (checkoutResult.error) {
    throw new Error("Falha ao carregar checkout do agendamento para template WhatsApp.");
  }
  if (paymentsResult.error) {
    throw new Error("Falha ao carregar pagamentos do agendamento para template WhatsApp.");
  }

  const checkoutData = checkoutResult.data;
  const paymentsData = paymentsResult.data;

  const totalAmount = toMoney(checkoutData?.total ?? record.price ?? 0);
  const paidPayments = Array.isArray(paymentsData)
    ? paymentsData.filter((payment) => payment.status === "paid")
    : [];
  const paidAmount = toMoney(
    paidPayments.reduce((acc, payment) => acc + toMoney(payment.amount), 0)
  );
  const remainingAmount = toMoney(Math.max(totalAmount - paidAmount, 0));
  const displacementFee = toMoney(record.displacement_fee ?? 0);
  const careAmount = toMoney(Math.max(totalAmount - displacementFee, 0));
  const signalPaidFromAppointment = toMoney(record.signal_paid_amount ?? 0);
  const signalPaidAmount =
    signalPaidFromAppointment > 0
      ? toMoney(Math.min(signalPaidFromAppointment, paidAmount > 0 ? paidAmount : signalPaidFromAppointment))
      : paidAmount;
  const latestPaidPayment = paidPayments[paidPayments.length - 1];
  const latestPaidPaymentPublicId =
    (typeof latestPaidPayment?.provider_ref === "string" && latestPaidPayment.provider_ref.trim()) ||
    (typeof latestPaidPayment?.id === "string" && latestPaidPayment.id.trim()) ||
    null;
  const attendanceCode =
    typeof record.attendance_code === "string" && record.attendance_code.trim()
      ? record.attendance_code.trim()
      : null;
  const paymentLinkPublicId = attendanceCode || appointmentId;
  const homeAddressLine =
    (typeof client?.endereco_completo === "string" && client.endereco_completo.trim()) ||
    [
      record.address_logradouro,
      record.address_numero,
      record.address_complemento,
      record.address_bairro,
      record.address_cidade,
      record.address_estado,
      record.address_cep,
    ]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean)
      .join(", ") ||
    "Endereço informado no agendamento";
  const isHomeVisit = Boolean(record.is_home_visit);
  const paymentStatus =
    typeof record.payment_status === "string" && record.payment_status.trim()
      ? record.payment_status.trim().toLowerCase()
      : null;

  return {
    clientId,
    clientName,
    serviceName,
    dateLabel,
    timeLabel,
    locationLine: resolveLocationLineFromAppointmentRecord(record, options?.studioLocationLine),
    isHomeVisit,
    homeAddressLine,
    paymentStatus,
    totalAmount,
    paidAmount,
    remainingAmount,
    signalPaidAmount,
    displacementFee,
    careAmount,
    latestPaidPaymentPublicId,
    paymentLinkPublicId,
  };
}

const SUCCESSFUL_AUTOMATION_MESSAGE_STATUSES = [
  "sent_auto",
  "sent_auto_dry_run",
  "provider_sent",
  "provider_delivered",
  "provider_read",
];

async function loadClientAutomationHistory(params: { tenantId: string; clientId: string | null }) {
  if (!params.clientId) {
    return {
      lastSuccessfulAutomationSentAt: null as string | null,
      hasPresentedFloraBefore: false,
    };
  }

  const supabase = createServiceClient();
  const floraHistorySinceDate = WHATSAPP_AUTOMATION_FLORA_HISTORY_SINCE
    ? new Date(WHATSAPP_AUTOMATION_FLORA_HISTORY_SINCE)
    : null;
  const floraHistorySince =
    floraHistorySinceDate && !Number.isNaN(floraHistorySinceDate.getTime())
      ? floraHistorySinceDate.toISOString()
      : null;
  let lastAutomationQuery = supabase
      .from("appointment_messages")
      .select("sent_at, created_at, appointments!inner(client_id)")
      .eq("tenant_id", params.tenantId)
      .eq("appointments.client_id", params.clientId)
      .like("type", "auto_%")
      .in("status", SUCCESSFUL_AUTOMATION_MESSAGE_STATUSES)
      .order("sent_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1);
  if (floraHistorySince) {
    lastAutomationQuery = lastAutomationQuery.gte("created_at", floraHistorySince);
  }

  let floraPresentedQuery = supabase
      .from("appointment_messages")
      .select("id, appointments!inner(client_id)")
      .eq("tenant_id", params.tenantId)
      .eq("appointments.client_id", params.clientId)
      .eq("type", "auto_appointment_created")
      .in("status", SUCCESSFUL_AUTOMATION_MESSAGE_STATUSES)
      .like("payload->automation->>template_name", "%_com_flora")
      .limit(1);
  if (floraHistorySince) {
    floraPresentedQuery = floraPresentedQuery.gte("created_at", floraHistorySince);
  }

  const [lastAutomationResult, floraPresentedResult] = await Promise.all([
    lastAutomationQuery.maybeSingle(),
    floraPresentedQuery.maybeSingle(),
  ]);

  if (lastAutomationResult.error) {
    throw new Error("Falha ao carregar histórico de automação da cliente (último envio).");
  }
  if (floraPresentedResult.error) {
    throw new Error("Falha ao carregar histórico de apresentação da Flora.");
  }

  const lastSuccessfulAutomationSentAt =
    (typeof lastAutomationResult.data?.sent_at === "string" && lastAutomationResult.data.sent_at) ||
    (typeof lastAutomationResult.data?.created_at === "string" && lastAutomationResult.data.created_at) ||
    null;

  return {
    lastSuccessfulAutomationSentAt,
    hasPresentedFloraBefore: Boolean(floraPresentedResult.data?.id),
  };
}

const templateAmountFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoneyForTemplate(value: number) {
  return templateAmountFormatter.format(Math.max(0, value));
}

function buildCreatedAppointmentTemplateVariableMap(context: AppointmentTemplateContext) {
  return {
    client_name: context.clientName || "Cliente",
    service_name: context.serviceName || "Seu cuidado",
    date_label: context.dateLabel || "--",
    time_label: context.timeLabel || "--:--",
    home_address_line: context.homeAddressLine || "Endereço informado no agendamento",
    total_amount: formatMoneyForTemplate(context.totalAmount),
    signal_paid_amount: formatMoneyForTemplate(context.signalPaidAmount),
    remaining_amount: formatMoneyForTemplate(context.remainingAmount),
    care_amount: formatMoneyForTemplate(context.careAmount),
    displacement_fee: formatMoneyForTemplate(context.displacementFee),
    paid_amount: formatMoneyForTemplate(context.paidAmount),
    total_due: formatMoneyForTemplate(context.remainingAmount > 0 ? context.remainingAmount : context.totalAmount),
    receipt_payment_public_id: context.latestPaidPaymentPublicId ?? "",
    payment_link_public_id: context.paymentLinkPublicId,
  } as const;
}

function buildCreatedAppointmentTemplateComponents(
  templateName: string,
  variableMap: Record<string, string>
) {
  const template = getWhatsAppTemplateFromLibrary(templateName);
  if (!template) {
    throw new Error(`Template de aviso de agendamento '${templateName}' não existe na biblioteca local.`);
  }

  let bodyVariables = template.variables;
  if (template.button.type === "url_dynamic") {
    const buttonVariableName = template.button.variableName;
    bodyVariables = template.variables.filter((variable) => variable.key !== buttonVariableName);
  }

  const bodyParameters = [...bodyVariables]
    .sort((a, b) => a.index - b.index)
    .map((variable) => {
      const value = variableMap[variable.key] ?? "";
      if (!value.trim()) {
        throw new Error(
          `Template '${template.name}' está sem variável obrigatória: ${variable.key} (índice ${variable.index}).`
        );
      }
      return { type: "text", text: value };
    });

  const components: Array<Record<string, unknown>> = [
    {
      type: "body",
      parameters: bodyParameters,
    },
  ];

  if (template.button.type === "url_dynamic") {
    const buttonValue = variableMap[template.button.variableName] ?? "";
    if (!buttonValue.trim()) {
      throw new Error(
        `Template '${template.name}' está sem variável obrigatória do botão: ${template.button.variableName}.`
      );
    }

    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: buttonValue }],
    });
  }

  return components;
}

function oppositeIntroVariant(variant: AppointmentNoticeIntroVariant): AppointmentNoticeIntroVariant {
  return variant === "com_flora" ? "sem_oi_flora" : "com_flora";
}

function isMetaTemplateTranslationMissingError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const normalized = message.toLowerCase();
  return normalized.includes("132001") && normalized.includes("template name") && normalized.includes("translation");
}

export async function sendMetaCloudCreatedAppointmentTemplate(
  job: NotificationJobRow
): Promise<DeliveryResult> {
  assertMetaCloudConfigBase();

  const tenantSettings = await getTenantWhatsAppSettings(job.tenant_id);
  const templateLanguage = tenantSettings.createdTemplateLanguage;

  const to = getMetaCloudTestRecipient();
  const context = await loadAppointmentTemplateContext(job, {
    studioLocationLine: tenantSettings.studioLocationLine,
  });

  const explicitIntroVariant = resolveNoticeIntroVariantFromPayload(job.payload ?? null);
  const history = await loadClientAutomationHistory({
    tenantId: job.tenant_id,
    clientId: context.clientId,
  });
  const preferredIntroVariant =
    explicitIntroVariant ??
    resolveFloraIntroVariantByHistory({
      hasPresentedFloraBefore: history.hasPresentedFloraBefore,
      lastSuccessfulAutomationSentAt: history.lastSuccessfulAutomationSentAt,
      reintroAfterDays: DEFAULT_FLORA_REINTRO_AFTER_DAYS,
    });

  const selection = resolveCreatedAppointmentTemplateSelection({
    isHomeVisit: context.isHomeVisit,
    totalAmount: context.totalAmount,
    paidAmount: context.paidAmount,
    paymentStatus: context.paymentStatus,
    preferredIntroVariant,
  });
  const variableMap = buildCreatedAppointmentTemplateVariableMap(context);

  const providerFallbackVariant = oppositeIntroVariant(selection.selectedIntroVariant);
  const providerFallbackTemplate =
    APPOINTMENT_NOTICE_TEMPLATE_MATRIX[selection.location][selection.paymentScenario][providerFallbackVariant];

  const templateAttempts = [selection.templateName];
  if (providerFallbackTemplate !== selection.templateName) {
    templateAttempts.push(providerFallbackTemplate);
  }

  let lastError: Error | null = null;
  for (let index = 0; index < templateAttempts.length; index += 1) {
    const templateName = templateAttempts[index];
    if (!templateName) continue;
    const components = buildCreatedAppointmentTemplateComponents(templateName, variableMap);

    const requestBody = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: templateLanguage,
        },
        components,
      },
    };

    try {
      const { payload, providerMessageId } = await sendMetaCloudMessage(requestBody);
      const providerFallbackApplied = templateName !== selection.templateName;

      return {
        providerMessageId,
        deliveredAt: new Date().toISOString(),
        deliveryMode: "meta_cloud_template_created_appointment",
        messagePreview:
          `Meta template created (${templateName}) -> ${to} ` +
          `• ${context.clientName} • ${context.serviceName} • ${context.dateLabel} ${context.timeLabel}` +
          ` • ${selection.location}/${selection.paymentScenario}` +
          ` • intro=${selection.selectedIntroVariant}` +
          (selection.fallbackApplied
            ? ` • fallback ${selection.requestedIntroVariant}->${selection.selectedIntroVariant}`
            : explicitIntroVariant
              ? " • override_payload"
              : history.hasPresentedFloraBefore
                ? " • history_known"
                : " • first_intro") +
          (providerFallbackApplied
            ? ` • provider_fallback ${selection.templateName}->${templateName}`
            : ""),
        templateName,
        templateLanguage,
        recipient: to,
        providerName: "meta_cloud",
        providerResponse: payload,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Falha desconhecida ao enviar template da Meta.");
      const canTryProviderFallback =
        index < templateAttempts.length - 1 && isMetaTemplateTranslationMissingError(lastError);
      if (!canTryProviderFallback) {
        break;
      }
    }
  }

  const attempted = templateAttempts.join(", ");
  const reason = lastError?.message ?? "Erro desconhecido ao enviar template de agendamento.";
  throw new Error(`Falha ao enviar template de agendamento. Tentativas: ${attempted}. Motivo: ${reason}`);
}

export async function sendMetaCloudReminderAppointmentTemplate(
  job: NotificationJobRow
): Promise<DeliveryResult> {
  assertMetaCloudConfigBase();

  const tenantSettings = await getTenantWhatsAppSettings(job.tenant_id);
  const templateName = tenantSettings.reminderTemplateName;
  const templateLanguage = tenantSettings.reminderTemplateLanguage;

  if (!templateName) {
    throw new Error("Template de lembrete não configurado nas settings do tenant.");
  }

  const to = getMetaCloudTestRecipient();
  const context = await loadAppointmentTemplateContext(job, {
    studioLocationLine: tenantSettings.studioLocationLine,
  });

  const requestBody = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: templateLanguage,
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
      `Meta template reminder (${templateName}) -> ${to} ` +
      `• ${context.clientName} • ${context.serviceName} • ${context.dateLabel} ${context.timeLabel}`,
    templateName,
    templateLanguage,
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

  const tenantSettings = await getTenantWhatsAppSettings(job.tenant_id);
  const context = await loadAppointmentTemplateContext(job, {
    studioLocationLine: tenantSettings.studioLocationLine,
  });
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
