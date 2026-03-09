import { createServiceClient } from "../../../lib/supabase/service";

export type TenantWhatsAppSettings = {
  createdTemplateName: string;
  createdTemplateLanguage: string;
  reminderTemplateName: string;
  reminderTemplateLanguage: string;
  studioLocationLine: string | null;
  automationEnabledInSettings: boolean;
};

type SettingsCacheEntry = {
  expiresAt: number;
  value: TenantWhatsAppSettings;
};

const SETTINGS_CACHE_TTL_MS = 60_000;
const settingsCache = new Map<string, SettingsCacheEntry>();

const DEFAULT_CREATED_TEMPLATE_NAME = "aviso_agendamento_no_estudio_com_sinal_pago_sem_oi_flora";
const DEFAULT_CREATED_TEMPLATE_LANGUAGE = "pt_BR";
const DEFAULT_REMINDER_TEMPLATE_NAME = "confirmacao_de_agendamento_24h";
const DEFAULT_REMINDER_TEMPLATE_LANGUAGE = "pt_BR";

const normalizeOptionalText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeRequiredText = (value: unknown, fallback: string) => {
  const normalized = normalizeOptionalText(value);
  return normalized ?? fallback;
};

function buildFallbackSettings(): TenantWhatsAppSettings {
  return {
    createdTemplateName: DEFAULT_CREATED_TEMPLATE_NAME,
    createdTemplateLanguage: DEFAULT_CREATED_TEMPLATE_LANGUAGE,
    reminderTemplateName: DEFAULT_REMINDER_TEMPLATE_NAME,
    reminderTemplateLanguage: DEFAULT_REMINDER_TEMPLATE_LANGUAGE,
    studioLocationLine: null,
    automationEnabledInSettings: false,
  };
}

export async function getTenantWhatsAppSettings(tenantId: string): Promise<TenantWhatsAppSettings> {
  const cached = settingsCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const fallback = buildFallbackSettings();

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    console.warn("[whatsapp-automation] Falha ao carregar settings por tenant:", error.message);
    throw new Error("Falha ao carregar configurações da automação WhatsApp por tenant.");
  }

  if (!data) {
    const { error: insertError } = await supabase.from("settings").insert({
      tenant_id: tenantId,
      whatsapp_automation_enabled: fallback.automationEnabledInSettings,
      whatsapp_template_created_name: fallback.createdTemplateName,
      whatsapp_template_created_language: fallback.createdTemplateLanguage,
      whatsapp_template_reminder_name: fallback.reminderTemplateName,
      whatsapp_template_reminder_language: fallback.reminderTemplateLanguage,
      whatsapp_studio_location_line: fallback.studioLocationLine,
    });

    if (insertError) {
      console.warn(
        "[whatsapp-automation] Falha ao criar settings padrão por tenant:",
        insertError.message
      );
      throw new Error("Falha ao inicializar configurações da automação WhatsApp por tenant.");
    }

    settingsCache.set(tenantId, {
      expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS,
      value: fallback,
    });
    return fallback;
  }

  const settingsRow = (data ?? null) as Record<string, unknown> | null;

  const value: TenantWhatsAppSettings = {
    createdTemplateName: normalizeRequiredText(
      settingsRow?.whatsapp_template_created_name,
      fallback.createdTemplateName
    ),
    createdTemplateLanguage: normalizeRequiredText(
      settingsRow?.whatsapp_template_created_language,
      fallback.createdTemplateLanguage
    ),
    reminderTemplateName: normalizeRequiredText(
      settingsRow?.whatsapp_template_reminder_name,
      fallback.reminderTemplateName
    ),
    reminderTemplateLanguage: normalizeRequiredText(
      settingsRow?.whatsapp_template_reminder_language,
      fallback.reminderTemplateLanguage
    ),
    studioLocationLine:
      normalizeOptionalText(settingsRow?.whatsapp_studio_location_line) ?? fallback.studioLocationLine,
    automationEnabledInSettings:
      typeof settingsRow?.whatsapp_automation_enabled === "boolean"
        ? settingsRow.whatsapp_automation_enabled
        : fallback.automationEnabledInSettings,
  };

  settingsCache.set(tenantId, {
    expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS,
    value,
  });

  return value;
}
