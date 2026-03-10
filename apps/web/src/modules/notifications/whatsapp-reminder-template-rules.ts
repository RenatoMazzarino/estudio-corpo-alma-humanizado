import { getWhatsAppTemplateFromLibrary } from "./whatsapp-template-library";

export type AppointmentReminderLocation = "studio" | "home";
export type AppointmentReminderPaymentScenario = "paid_integral" | "saldo_pendente";
export type ReminderTemplateStatus = "active" | "in_review" | "missing";
export type ReminderTemplateStatusResolver = (templateName: string) => ReminderTemplateStatus;

export const APPOINTMENT_REMINDER_TEMPLATE_MATRIX: Record<
  AppointmentReminderLocation,
  Record<AppointmentReminderPaymentScenario, string>
> = {
  studio: {
    paid_integral: "lembrete_confirmacao_24h_estudio_pago_integral",
    saldo_pendente: "lembrete_confirmacao_24h_estudio_saldo_pendente",
  },
  home: {
    paid_integral: "lembrete_confirmacao_24h_domicilio_pago_integral",
    saldo_pendente: "lembrete_confirmacao_24h_domicilio_saldo_pendente",
  },
};

const parseMoney = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
};

export function resolveReminderLocation(isHomeVisit: boolean | null | undefined): AppointmentReminderLocation {
  return isHomeVisit ? "home" : "studio";
}

export function resolveReminderPaymentScenario(params: {
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string | null | undefined;
}): AppointmentReminderPaymentScenario {
  const total = parseMoney(params.totalAmount);
  const paid = parseMoney(params.paidAmount);
  const paymentStatus = (params.paymentStatus ?? "").trim().toLowerCase();

  if (paymentStatus === "paid" || total <= 0 || paid + 0.009 >= total) {
    return "paid_integral";
  }
  return "saldo_pendente";
}

function resolveTemplateStatusFromLibrary(name: string): ReminderTemplateStatus {
  const template = getWhatsAppTemplateFromLibrary(name);
  if (!template) return "missing";
  return template.status;
}

export function resolveReminderTemplateSelection(params: {
  isHomeVisit: boolean | null | undefined;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string | null | undefined;
  resolveTemplateStatus?: ReminderTemplateStatusResolver;
}) {
  const location = resolveReminderLocation(params.isHomeVisit);
  const paymentScenario = resolveReminderPaymentScenario({
    totalAmount: params.totalAmount,
    paidAmount: params.paidAmount,
    paymentStatus: params.paymentStatus,
  });
  const templateName = APPOINTMENT_REMINDER_TEMPLATE_MATRIX[location][paymentScenario];
  const resolveTemplateStatus = params.resolveTemplateStatus ?? resolveTemplateStatusFromLibrary;
  const templateStatus = resolveTemplateStatus(templateName);

  if (templateStatus !== "active") {
    throw new Error(
      [
        "Nenhum template ativo disponível para lembrete 24h neste cenário.",
        `Cenário: ${location}/${paymentScenario}.`,
        `Template: ${templateName} (${templateStatus}).`,
        "Aprovar o template na Meta antes de enviar este lembrete.",
      ].join(" ")
    );
  }

  return {
    templateName,
    location,
    paymentScenario,
    templateStatus,
  };
}

