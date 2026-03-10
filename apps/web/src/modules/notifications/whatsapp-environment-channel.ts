import { createServiceClient } from "../../../lib/supabase/service";
import {
  getWhatsAppRuntimeEnvironment,
  WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID,
  WHATSAPP_AUTOMATION_META_TEST_RECIPIENT,
  WHATSAPP_AUTOMATION_MODE,
  WHATSAPP_AUTOMATION_PROVIDER,
  WHATSAPP_PROFILE,
  type WhatsAppAutomationProfile,
  type WhatsAppAutomationRecipientMode,
  type WhatsAppRuntimeEnvironment,
} from "./automation-config";
import { onlyDigits } from "./whatsapp-automation.helpers";
import { WHATSAPP_TEMPLATE_LIBRARY_APPOINTMENT_NOTICE_VARIATIONS } from "./whatsapp-template-library";

type RawWhatsAppEnvironmentChannelRow = {
  id: string;
  tenant_id: string;
  environment: string;
  profile: string;
  provider: string;
  enabled: boolean;
  sender_phone_number_id: string | null;
  sender_display_phone: string | null;
  force_test_recipient: boolean;
  test_recipient_e164: string | null;
  default_language_code: string;
  allowed_created_template_names: string[] | null;
  allowed_reminder_template_names: string[] | null;
};

export type WhatsAppDispatchPolicy = {
  tenantId: string;
  environment: WhatsAppRuntimeEnvironment;
  profile: WhatsAppAutomationProfile;
  provider: "meta_cloud";
  enabled: boolean;
  senderPhoneNumberId: string | null;
  senderDisplayPhone: string | null;
  recipientMode: WhatsAppAutomationRecipientMode;
  testRecipient: string | null;
  defaultLanguageCode: string;
  allowedCreatedTemplateNames: string[];
  allowedReminderTemplateNames: string[];
};

export type WhatsAppDispatchPolicyStatus = {
  policy: WhatsAppDispatchPolicy | null;
  issues: string[];
};

const DEFAULT_REMINDER_TEMPLATE_NAMES = ["confirmacao_de_agendamento_24h"];
const DEFAULT_CREATED_TEMPLATE_NAMES = WHATSAPP_TEMPLATE_LIBRARY_APPOINTMENT_NOTICE_VARIATIONS.map(
  (template) => template.name
);
const POLICY_CACHE_TTL_MS = 30_000;
const policyCache = new Map<string, { expiresAt: number; value: WhatsAppDispatchPolicyStatus }>();

const normalizeOptionalText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeRequiredText = (value: unknown, fallback: string) => {
  const optional = normalizeOptionalText(value);
  return optional ?? fallback;
};

const normalizeTemplateList = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) return [...fallback];
  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is string => item.length > 0);
  const unique = Array.from(new Set(normalized));
  return unique.length > 0 ? unique : [...fallback];
};

const normalizeE164 = (value: unknown) => {
  const optional = normalizeOptionalText(value);
  if (!optional) return null;
  const digits = onlyDigits(optional);
  return digits.length >= 12 ? digits : null;
};

const normalizeRuntimeEnvironment = (value: unknown): WhatsAppRuntimeEnvironment | null => {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  if (normalized === "development" || normalized === "preview" || normalized === "production") {
    return normalized;
  }
  return null;
};

const normalizeProfile = (value: unknown): WhatsAppAutomationProfile | null => {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  if (!normalized) return null;
  if (normalized === "dev_sandbox") return "dev_sandbox";
  if (normalized === "preview_real_test") return "preview_real_test";
  if (normalized === "prod_real") return "prod_real";
  return null;
};

const mapRowToPolicy = (row: RawWhatsAppEnvironmentChannelRow): WhatsAppDispatchPolicy | null => {
  const environment = normalizeRuntimeEnvironment(row.environment);
  const profile = normalizeProfile(row.profile);
  if (!environment || !profile) {
    return null;
  }

  return {
    tenantId: row.tenant_id,
    environment,
    profile,
    provider: "meta_cloud",
    enabled: Boolean(row.enabled),
    senderPhoneNumberId: normalizeOptionalText(row.sender_phone_number_id),
    senderDisplayPhone: normalizeOptionalText(row.sender_display_phone),
    recipientMode: row.force_test_recipient ? "test_recipient" : "customer",
    testRecipient: normalizeE164(row.test_recipient_e164) ?? normalizeE164(WHATSAPP_AUTOMATION_META_TEST_RECIPIENT),
    defaultLanguageCode: normalizeRequiredText(row.default_language_code, "pt_BR"),
    allowedCreatedTemplateNames: normalizeTemplateList(
      row.allowed_created_template_names,
      DEFAULT_CREATED_TEMPLATE_NAMES
    ),
    allowedReminderTemplateNames: normalizeTemplateList(
      row.allowed_reminder_template_names,
      DEFAULT_REMINDER_TEMPLATE_NAMES
    ),
  };
};

async function loadRawChannelRow(tenantId: string, environment: WhatsAppRuntimeEnvironment) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("whatsapp_environment_channels")
    .select(
      "id, tenant_id, environment, profile, provider, enabled, sender_phone_number_id, sender_display_phone, force_test_recipient, test_recipient_e164, default_language_code, allowed_created_template_names, allowed_reminder_template_names"
    )
    .eq("tenant_id", tenantId)
    .eq("environment", environment)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar canal WhatsApp por ambiente: ${error.message}`);
  }

  return (data ?? null) as RawWhatsAppEnvironmentChannelRow | null;
}

function buildPolicyIssues(policy: WhatsAppDispatchPolicy | null) {
  const issues: string[] = [];

  if (WHATSAPP_AUTOMATION_PROVIDER !== "meta_cloud") {
    issues.push("WHATSAPP_AUTOMATION_PROVIDER deve ser meta_cloud.");
  }

  if (!policy) {
    issues.push(
      `Canal WhatsApp por ambiente não encontrado para '${getWhatsAppRuntimeEnvironment()}'.`
    );
    return issues;
  }

  if (!policy.enabled) {
    issues.push("Canal WhatsApp do ambiente está desativado no banco.");
  }

  if (policy.profile !== WHATSAPP_PROFILE) {
    issues.push(
      `Perfil divergente entre ambiente e banco (env=${WHATSAPP_PROFILE}, db=${policy.profile}).`
    );
  }

  if (WHATSAPP_AUTOMATION_MODE === "enabled" && !WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID) {
    issues.push("WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID ausente em modo de envio real.");
  }

  if (
    WHATSAPP_AUTOMATION_MODE === "enabled" &&
    policy.senderPhoneNumberId &&
    WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID &&
    policy.senderPhoneNumberId !== WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID
  ) {
    issues.push(
      "sender_phone_number_id do banco diverge do WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID do ambiente."
    );
  }

  if (policy.recipientMode === "test_recipient" && !policy.testRecipient) {
    issues.push("Destino de teste obrigatório, mas test_recipient_e164 não está configurado.");
  }

  if (policy.profile === "prod_real" && policy.recipientMode !== "customer") {
    issues.push("Perfil prod_real exige envio para número real da cliente.");
  }

  if (policy.profile !== "prod_real" && policy.recipientMode !== "test_recipient") {
    issues.push("Perfis não produtivos exigem destino fixo de teste.");
  }

  if (policy.allowedCreatedTemplateNames.length === 0) {
    issues.push("Lista de templates de aviso/criação está vazia no canal do ambiente.");
  }

  if (policy.allowedReminderTemplateNames.length === 0) {
    issues.push("Lista de templates de lembrete está vazia no canal do ambiente.");
  }

  return issues;
}

export async function getTenantWhatsAppDispatchPolicyStatus(
  tenantId: string
): Promise<WhatsAppDispatchPolicyStatus> {
  const environment = getWhatsAppRuntimeEnvironment();
  const cacheKey = `${tenantId}::${environment}`;
  const cached = policyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const rawRow = await loadRawChannelRow(tenantId, environment);
  const policy = rawRow ? mapRowToPolicy(rawRow) : null;
  const value: WhatsAppDispatchPolicyStatus = {
    policy,
    issues: buildPolicyIssues(policy),
  };
  policyCache.set(cacheKey, {
    expiresAt: Date.now() + POLICY_CACHE_TTL_MS,
    value,
  });
  return value;
}

export async function assertTenantWhatsAppDispatchPolicy(tenantId: string) {
  const status = await getTenantWhatsAppDispatchPolicyStatus(tenantId);
  if (!status.policy) {
    throw new Error(
      `Configuração WhatsApp inconsistente: ${status.issues.join(" ")}`
    );
  }
  if (status.issues.length > 0) {
    throw new Error(
      `Configuração WhatsApp inconsistente: ${status.issues.join(" ")}`
    );
  }
  return status.policy;
}

export function resetWhatsAppDispatchPolicyCache() {
  policyCache.clear();
}
