import type { Json } from "../../../lib/supabase/types";
import { asJsonObject } from "./whatsapp-automation.helpers";
import { getWhatsAppTemplateFromLibrary } from "./whatsapp-template-library";

export type AppointmentNoticeLocation = "studio" | "home";
export type AppointmentNoticePaymentScenario = "signal_paid" | "paid_integral" | "pay_at_attendance";
export type AppointmentNoticeIntroVariant = "com_flora" | "sem_oi_flora";
export const DEFAULT_FLORA_REINTRO_AFTER_DAYS = 180;

export type TemplateStatus = "active" | "in_review" | "missing";
export type TemplateStatusResolver = (templateName: string) => TemplateStatus;

export const APPOINTMENT_NOTICE_TEMPLATE_MATRIX: Record<
  AppointmentNoticeLocation,
  Record<AppointmentNoticePaymentScenario, Record<AppointmentNoticeIntroVariant, string>>
> = {
  studio: {
    signal_paid: {
      com_flora: "aviso_agendamento_no_estudio_com_sinal_pago_com_flora",
      sem_oi_flora: "aviso_agendamento_no_estudio_com_sinal_pago_sem_oi_flora",
    },
    paid_integral: {
      com_flora: "aviso_agendamento_no_estudio_pago_integral_com_flora",
      sem_oi_flora: "aviso_agendamento_no_estudio_pago_integral_sem_oi_flora",
    },
    pay_at_attendance: {
      com_flora: "aviso_agendamento_estudio_pagamento_no_atendimento_com_flora",
      sem_oi_flora: "aviso_agendamento_estudio_pagamento_no_atendimento_sem_oi_flora",
    },
  },
  home: {
    signal_paid: {
      com_flora: "aviso_agendamento_domicilio_sinal_pago_com_flora",
      sem_oi_flora: "aviso_agendamento_domicilio_sinal_pago_sem_oi_flora",
    },
    paid_integral: {
      com_flora: "aviso_agendamento_domicilio_pago_integral_com_flora",
      sem_oi_flora: "aviso_agendamento_domicilio_pago_integral_sem_oi_flora",
    },
    pay_at_attendance: {
      com_flora: "aviso_agendamento_domicilio_pagamento_no_atendimento_com_flora",
      sem_oi_flora: "aviso_agendamento_domicilio_pagamento_no_atendimento_sem_oi_flora",
    },
  },
};

export type CreatedAppointmentTemplateSelection = {
  templateName: string;
  location: AppointmentNoticeLocation;
  paymentScenario: AppointmentNoticePaymentScenario;
  requestedIntroVariant: AppointmentNoticeIntroVariant;
  selectedIntroVariant: AppointmentNoticeIntroVariant;
  fallbackApplied: boolean;
};

const parseMoney = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
};

function normalizeIntroVariant(value: unknown): AppointmentNoticeIntroVariant | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (
    normalized === "com_flora" ||
    normalized === "flora" ||
    normalized === "with_flora" ||
    normalized === "com flora"
  ) {
    return "com_flora";
  }
  if (
    normalized === "sem_oi_flora" ||
    normalized === "sem_flora" ||
    normalized === "without_flora" ||
    normalized === "sem oi flora"
  ) {
    return "sem_oi_flora";
  }
  return null;
}

export function resolveNoticeIntroVariantFromPayload(
  jobPayload: Json | null | undefined
): AppointmentNoticeIntroVariant | null {
  const root = asJsonObject(jobPayload);
  const automation = asJsonObject(root.automation as Json | undefined);
  return (
    normalizeIntroVariant(automation.template_intro_variant) ??
    normalizeIntroVariant(automation.flora_intro_variant) ??
    normalizeIntroVariant(automation.template_variant)
  );
}

function inferIntroVariantFromTemplateName(templateName: string | null | undefined) {
  if (typeof templateName !== "string") return null;
  const normalized = templateName.trim();
  if (!normalized) return null;
  if (normalized.endsWith("_com_flora")) return "com_flora" as const;
  if (normalized.endsWith("_sem_oi_flora")) return "sem_oi_flora" as const;
  return null;
}

export function resolvePreferredNoticeIntroVariant(params: {
  jobPayload: Json | null | undefined;
  tenantCreatedTemplateName: string | null | undefined;
}): AppointmentNoticeIntroVariant {
  const fromPayload = resolveNoticeIntroVariantFromPayload(params.jobPayload);
  if (fromPayload) return fromPayload;

  const fromTenantTemplate = inferIntroVariantFromTemplateName(params.tenantCreatedTemplateName);
  if (fromTenantTemplate) return fromTenantTemplate;

  return "sem_oi_flora";
}

export function resolveFloraIntroVariantByHistory(params: {
  hasPresentedFloraBefore: boolean;
  lastSuccessfulAutomationSentAt: string | null;
  now?: Date;
  reintroAfterDays?: number;
}): AppointmentNoticeIntroVariant {
  if (!params.hasPresentedFloraBefore) {
    return "com_flora";
  }

  const reintroAfterDays = Math.max(1, Math.trunc(params.reintroAfterDays ?? DEFAULT_FLORA_REINTRO_AFTER_DAYS));
  const lastSentAt = params.lastSuccessfulAutomationSentAt
    ? new Date(params.lastSuccessfulAutomationSentAt)
    : null;
  if (!lastSentAt || Number.isNaN(lastSentAt.getTime())) {
    return "sem_oi_flora";
  }

  const now = params.now ?? new Date();
  const elapsedMs = now.getTime() - lastSentAt.getTime();
  const thresholdMs = reintroAfterDays * 24 * 60 * 60 * 1000;
  return elapsedMs >= thresholdMs ? "com_flora" : "sem_oi_flora";
}

export function resolveNoticeLocation(isHomeVisit: boolean | null | undefined): AppointmentNoticeLocation {
  return isHomeVisit ? "home" : "studio";
}

export function resolveNoticePaymentScenario(params: {
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string | null | undefined;
}): AppointmentNoticePaymentScenario {
  const total = parseMoney(params.totalAmount);
  const paid = parseMoney(params.paidAmount);
  const paymentStatus = (params.paymentStatus ?? "").trim().toLowerCase();

  if (paymentStatus === "paid" || total <= 0 || paid + 0.009 >= total) {
    return "paid_integral";
  }
  if (paid > 0.009) {
    return "signal_paid";
  }
  return "pay_at_attendance";
}

function resolveTemplateStatusFromLibrary(name: string): TemplateStatus {
  const template = getWhatsAppTemplateFromLibrary(name);
  if (!template) return "missing";
  return template.status;
}

function oppositeVariant(variant: AppointmentNoticeIntroVariant): AppointmentNoticeIntroVariant {
  return variant === "com_flora" ? "sem_oi_flora" : "com_flora";
}

export function resolveCreatedAppointmentTemplateSelection(params: {
  isHomeVisit: boolean | null | undefined;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string | null | undefined;
  preferredIntroVariant: AppointmentNoticeIntroVariant;
  resolveTemplateStatus?: TemplateStatusResolver;
}): CreatedAppointmentTemplateSelection {
  const location = resolveNoticeLocation(params.isHomeVisit);
  const paymentScenario = resolveNoticePaymentScenario({
    totalAmount: params.totalAmount,
    paidAmount: params.paidAmount,
    paymentStatus: params.paymentStatus,
  });

  const requestedIntroVariant = params.preferredIntroVariant;
  const selectedIntroVariant = requestedIntroVariant;
  const requestedTemplateName =
    APPOINTMENT_NOTICE_TEMPLATE_MATRIX[location][paymentScenario][selectedIntroVariant];
  const resolveTemplateStatus = params.resolveTemplateStatus ?? resolveTemplateStatusFromLibrary;
  const requestedStatus = resolveTemplateStatus(requestedTemplateName);

  if (requestedStatus === "active") {
    return {
      templateName: requestedTemplateName,
      location,
      paymentScenario,
      requestedIntroVariant,
      selectedIntroVariant,
      fallbackApplied: false,
    };
  }

  const fallbackVariant = oppositeVariant(requestedIntroVariant);
  const fallbackTemplateName = APPOINTMENT_NOTICE_TEMPLATE_MATRIX[location][paymentScenario][fallbackVariant];
  const fallbackStatus = resolveTemplateStatus(fallbackTemplateName);

  if (fallbackStatus === "active") {
    return {
      templateName: fallbackTemplateName,
      location,
      paymentScenario,
      requestedIntroVariant,
      selectedIntroVariant: fallbackVariant,
      fallbackApplied: true,
    };
  }

  throw new Error(
    [
      "Nenhum template ativo disponível para este cenário de agendamento.",
      `Cenário: ${location}/${paymentScenario}.`,
      `Preferência: ${requestedIntroVariant}.`,
      `Template preferido: ${requestedTemplateName} (${requestedStatus}).`,
      `Template fallback: ${fallbackTemplateName} (${fallbackStatus}).`,
      "Aprovar ao menos um dos templates na Meta antes de enviar automação deste cenário.",
    ].join(" ")
  );
}
