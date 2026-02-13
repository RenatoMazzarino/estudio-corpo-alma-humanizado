import { AppError } from "../errors/AppError";

export type FeedbackTone = "success" | "error" | "info" | "warning";
export type FeedbackKind = "toast" | "banner";

export type UserFeedback = {
  id?: string;
  title?: string;
  message: string;
  tone: FeedbackTone;
  kind?: FeedbackKind;
  durationMs?: number;
};

export type FeedbackContext =
  | "payment_card"
  | "payment_pix"
  | "public_booking"
  | "agenda"
  | "attendance"
  | "address"
  | "whatsapp"
  | "generic";

export type FeedbackId =
  | "generic_unavailable"
  | "generic_try_again"
  | "generic_saved"
  | "validation_required_fields"
  | "validation_invalid_data"
  | "not_found"
  | "whatsapp_missing_phone"
  | "address_search_failed"
  | "address_details_failed"
  | "address_cep_invalid"
  | "address_cep_not_found"
  | "address_cep_found"
  | "displacement_calc_failed"
  | "contact_whatsapp_unavailable"
  | "booking_created"
  | "booking_create_failed"
  | "payment_pix_generated"
  | "payment_pix_copy_success"
  | "payment_pix_copy_unavailable"
  | "payment_pix_expired_regenerating"
  | "payment_pix_failed"
  | "payment_card_processing"
  | "payment_card_declined"
  | "payment_card_high_risk"
  | "payment_invalid_amount"
  | "payment_payer_validation"
  | "payment_service_unavailable"
  | "payment_credentials_invalid"
  | "payment_pending"
  | "payment_recorded"
  | "message_recorded"
  | "reminder_recorded"
  | "appointment_cancelled"
  | "appointment_deleted"
  | "client_confirmed"
  | "agenda_stage_locked"
  | "agenda_details_load_failed"
  | "voucher_generation_failed";

const feedbackCatalog: Record<FeedbackId, UserFeedback> = {
  generic_unavailable: {
    message: "Não conseguimos concluir agora. Tente novamente em instantes.",
    tone: "error",
  },
  generic_try_again: {
    message: "Algo saiu do esperado. Tente novamente.",
    tone: "warning",
  },
  generic_saved: {
    message: "Informação salva com sucesso.",
    tone: "success",
  },
  validation_required_fields: {
    message: "Preencha os campos obrigatórios para continuar.",
    tone: "warning",
    kind: "banner",
    durationMs: 2600,
  },
  validation_invalid_data: {
    message: "Alguns dados estão inválidos. Revise e tente novamente.",
    tone: "warning",
  },
  not_found: {
    message: "Registro não encontrado.",
    tone: "error",
  },
  whatsapp_missing_phone: {
    message: "Este cliente ainda não tem WhatsApp cadastrado.",
    tone: "warning",
  },
  address_search_failed: {
    message: "Não conseguimos buscar endereços agora. Tente novamente.",
    tone: "error",
  },
  address_details_failed: {
    message: "Não foi possível carregar os detalhes desse endereço.",
    tone: "error",
  },
  address_cep_invalid: {
    message: "Informe um CEP válido para buscar o endereço.",
    tone: "warning",
  },
  address_cep_not_found: {
    message: "CEP não encontrado. Confira os números e tente novamente.",
    tone: "warning",
  },
  address_cep_found: {
    message: "Endereço encontrado.",
    tone: "success",
    durationMs: 1600,
  },
  displacement_calc_failed: {
    message: "Não conseguimos calcular a taxa de deslocamento agora.",
    tone: "warning",
    kind: "banner",
    durationMs: 3000,
  },
  contact_whatsapp_unavailable: {
    message: "WhatsApp ainda não configurado pelo estúdio.",
    tone: "warning",
  },
  booking_created: {
    message: "Agendamento criado com sucesso.",
    tone: "success",
  },
  booking_create_failed: {
    message: "Não foi possível concluir o agendamento.",
    tone: "error",
  },
  payment_pix_generated: {
    message: "Pix gerado. Faça o pagamento para confirmar seu horário.",
    tone: "info",
  },
  payment_pix_copy_success: {
    message: "Chave Pix copiada.",
    tone: "success",
  },
  payment_pix_copy_unavailable: {
    message: "Não foi possível copiar agora. Tente novamente.",
    tone: "warning",
  },
  payment_pix_expired_regenerating: {
    message: "QR Code expirou. Estamos gerando um novo Pix.",
    tone: "warning",
    kind: "banner",
    durationMs: 3200,
  },
  payment_pix_failed: {
    message: "O Pix não foi aprovado. Gere um novo para continuar.",
    tone: "error",
  },
  payment_card_processing: {
    message: "Pagamento em análise. Aguarde a confirmação.",
    tone: "info",
    kind: "banner",
    durationMs: 2800,
  },
  payment_card_declined: {
    message: "Cartão não aprovado. Tente outro cartão ou Pix.",
    tone: "error",
  },
  payment_card_high_risk: {
    message: "Cartão recusado por segurança. Tente outro cartão ou Pix.",
    tone: "error",
  },
  payment_invalid_amount: {
    message: "Valor de pagamento inválido para processamento.",
    tone: "warning",
  },
  payment_payer_validation: {
    message: "Não foi possível validar os dados do pagador. Confira e tente novamente.",
    tone: "warning",
  },
  payment_service_unavailable: {
    message: "Pagamento indisponível no momento. Tente novamente em instantes.",
    tone: "error",
  },
  payment_credentials_invalid: {
    message: "Serviço de pagamento indisponível. Tente novamente mais tarde.",
    tone: "error",
  },
  payment_pending: {
    message: "Pagamento em processamento. Você receberá a confirmação em breve.",
    tone: "info",
    kind: "banner",
    durationMs: 3000,
  },
  payment_recorded: {
    message: "Pagamento registrado com sucesso.",
    tone: "success",
  },
  message_recorded: {
    message: "Mensagem registrada.",
    tone: "success",
  },
  reminder_recorded: {
    message: "Lembrete registrado.",
    tone: "success",
  },
  appointment_cancelled: {
    message: "Agendamento cancelado.",
    tone: "success",
  },
  appointment_deleted: {
    message: "Agendamento excluído.",
    tone: "success",
  },
  client_confirmed: {
    message: "Cliente confirmado.",
    tone: "success",
  },
  agenda_stage_locked: {
    message: "Etapa bloqueada. Conclua a anterior para liberar.",
    tone: "warning",
    kind: "banner",
    durationMs: 2600,
  },
  agenda_details_load_failed: {
    message: "Não foi possível carregar os detalhes agora.",
    tone: "error",
  },
  voucher_generation_failed: {
    message: "Não foi possível gerar a imagem do voucher agora.",
    tone: "error",
  },
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const asString = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (typeof value === "object" && "message" in value && typeof value.message === "string") {
    return value.message;
  }
  return String(value);
};

const mapMessagePattern = (message: string): FeedbackId | null => {
  const text = normalizeText(message);
  if (!text) return null;

  if (text.includes("high_risk")) return "payment_card_high_risk";
  if (text.includes("invalid_users_involved")) return "payment_payer_validation";
  if (text.includes("invalid_transaction_amount")) return "payment_invalid_amount";
  if (text.includes("invalid_credentials")) return "payment_credentials_invalid";
  if (text.includes("unsupported_properties")) return "payment_service_unavailable";
  if (text.includes("cartao nao aprovado") || text.includes("pagamento recusado")) {
    return "payment_card_declined";
  }
  if (text.includes("pix nao foi aprovado")) return "payment_pix_failed";
  if (text.includes("nao foi possivel buscar enderecos")) return "address_search_failed";
  if (text.includes("nao foi possivel carregar o endereco")) return "address_details_failed";
  if (text.includes("nao foi possivel calcular a taxa de deslocamento")) return "displacement_calc_failed";
  if (text.includes("sem telefone de whatsapp")) return "whatsapp_missing_phone";
  if (text.includes("etapa bloqueada")) return "agenda_stage_locked";
  if (text.includes("nao foi possivel gerar a imagem do voucher")) return "voucher_generation_failed";

  return null;
};

const mapCodeFallback = (errorCode: string | undefined, context: FeedbackContext): FeedbackId => {
  if (context === "payment_card" || context === "payment_pix") {
    if (errorCode === "VALIDATION_ERROR") return "payment_invalid_amount";
    if (errorCode === "CONFIG_ERROR" || errorCode === "UNAUTHORIZED") return "payment_credentials_invalid";
    if (errorCode === "SUPABASE_ERROR") return "payment_service_unavailable";
  }

  if (context === "address") {
    if (errorCode === "VALIDATION_ERROR") return "validation_invalid_data";
    return "address_search_failed";
  }

  if (errorCode === "VALIDATION_ERROR") return "validation_invalid_data";
  if (errorCode === "NOT_FOUND") return "not_found";
  if (errorCode === "CONFLICT") return "generic_try_again";
  if (errorCode === "SUPABASE_ERROR") return "generic_unavailable";
  if (errorCode === "CONFIG_ERROR" || errorCode === "UNAUTHORIZED") return "generic_unavailable";

  return "generic_unavailable";
};

export const feedbackById = (id: FeedbackId, overrides?: Partial<UserFeedback>): UserFeedback => {
  const base = feedbackCatalog[id];
  return {
    ...base,
    ...overrides,
    id: overrides?.id ?? id,
  };
};

export const feedbackFromError = (
  error: unknown,
  context: FeedbackContext = "generic"
): UserFeedback => {
  const message = asString(error);
  const patternId = mapMessagePattern(message);
  if (patternId) return feedbackById(patternId);

  const appErrorCode =
    error instanceof AppError
      ? error.code
      : typeof error === "object" && error && "code" in error && typeof error.code === "string"
        ? error.code
        : undefined;

  const mapped = mapCodeFallback(appErrorCode, context);
  return feedbackById(mapped);
};
