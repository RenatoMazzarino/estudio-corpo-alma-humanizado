import { getWhatsAppTemplateFromLibrary } from "./whatsapp-template-library";

export type AppointmentConfirmationReplyLocation = "studio" | "home";
export type ConfirmationReplyTemplateStatus = "active" | "in_review" | "missing";
export type ConfirmationReplyTemplateStatusResolver = (
  templateName: string
) => ConfirmationReplyTemplateStatus;

export const APPOINTMENT_CONFIRMATION_REPLY_TEMPLATE_MATRIX: Record<
  AppointmentConfirmationReplyLocation,
  string
> = {
  studio: "resposta_confirmacao_estudio",
  home: "resposta_confirmacao_domicilio",
};

function resolveTemplateStatusFromLibrary(
  name: string
): ConfirmationReplyTemplateStatus {
  const template = getWhatsAppTemplateFromLibrary(name);
  if (!template) return "missing";
  return template.status;
}

export function resolveConfirmationReplyLocation(
  isHomeVisit: boolean | null | undefined
): AppointmentConfirmationReplyLocation {
  return isHomeVisit ? "home" : "studio";
}

export function resolveConfirmationReplyTemplateSelection(params: {
  isHomeVisit: boolean | null | undefined;
  resolveTemplateStatus?: ConfirmationReplyTemplateStatusResolver;
}) {
  const location = resolveConfirmationReplyLocation(params.isHomeVisit);
  const templateName = APPOINTMENT_CONFIRMATION_REPLY_TEMPLATE_MATRIX[location];
  const resolveTemplateStatus =
    params.resolveTemplateStatus ?? resolveTemplateStatusFromLibrary;
  const templateStatus = resolveTemplateStatus(templateName);

  if (templateStatus !== "active") {
    throw new Error(
      [
        "Nenhum template ativo disponível para resposta de confirmação.",
        `Cenário: ${location}.`,
        `Template: ${templateName} (${templateStatus}).`,
        "Aprovar o template na Meta antes de enviar esta resposta automática.",
      ].join(" ")
    );
  }

  return {
    templateName,
    location,
    templateStatus,
  };
}

