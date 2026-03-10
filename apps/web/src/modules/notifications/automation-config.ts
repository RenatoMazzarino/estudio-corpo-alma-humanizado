type WhatsAppAutomationMode = "disabled" | "dry_run" | "enabled";
type WhatsAppAutomationProvider = "none" | "meta_cloud";
type WhatsAppAutomationProfile =
  | "development_safe"
  | "preview_safe"
  | "preview_real_test"
  | "production_live";
type WhatsAppAutomationRecipientMode = "customer" | "test_recipient";

type ProfilePreset = {
  mode: WhatsAppAutomationMode;
  recipientMode: WhatsAppAutomationRecipientMode;
};

type WhatsAppAutomationConfig = {
  profile: WhatsAppAutomationProfile;
  mode: WhatsAppAutomationMode;
  provider: WhatsAppAutomationProvider;
  recipientMode: WhatsAppAutomationRecipientMode;
  autoDispatchOnQueue: boolean;
  processorSecret: string;
  batchLimit: number;
  maxRetries: number;
  retryBaseDelaySeconds: number;
  metaAccessToken: string;
  metaPhoneNumberId: string;
  metaBusinessAccountId: string;
  metaTestRecipient: string;
  metaApiVersion: string;
  metaWebhookVerifyToken: string;
  metaAppSecret: string;
  floraHistorySince: string;
  legacy: {
    globalEnabled: boolean;
    forceDryRun: boolean;
    forceTestRecipient: boolean;
  };
};

const PROFILE_PRESETS: Record<WhatsAppAutomationProfile, ProfilePreset> = {
  development_safe: { mode: "dry_run", recipientMode: "test_recipient" },
  preview_safe: { mode: "dry_run", recipientMode: "test_recipient" },
  preview_real_test: { mode: "enabled", recipientMode: "test_recipient" },
  production_live: { mode: "enabled", recipientMode: "customer" },
};

const normalizeText = (value: string | undefined) => value?.trim() ?? "";

const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value == null) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
};

const parseProvider = (value: string | undefined): WhatsAppAutomationProvider => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "none" || normalized === "off" || normalized === "disabled") return "none";
  return "meta_cloud";
};

const parseBatchLimit = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(Math.trunc(parsed), 100));
};

const parsePositiveInt = (value: string | undefined, fallback: number, max = 10_000) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(Math.trunc(parsed), max));
};

const parseAutomationMode = (value: string | undefined): WhatsAppAutomationMode | null => {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return null;
  if (["disabled", "off", "none"].includes(normalized)) return "disabled";
  if (["dry_run", "dry-run", "dryrun", "simulation", "simulated"].includes(normalized)) return "dry_run";
  if (["enabled", "on", "live", "real"].includes(normalized)) return "enabled";
  return null;
};

const parseRecipientMode = (value: string | undefined): WhatsAppAutomationRecipientMode | null => {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return null;
  if (
    ["customer", "real_customer", "customer_real", "real", "client", "client_real"].includes(normalized)
  ) {
    return "customer";
  }
  if (
    ["test", "test_recipient", "fixed_test", "sandbox", "fixed", "homolog", "homologation"].includes(normalized)
  ) {
    return "test_recipient";
  }
  return null;
};

const parseAutomationProfile = (value: string | undefined): WhatsAppAutomationProfile | null => {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return null;
  if (normalized === "development_safe" || normalized === "dev_safe" || normalized === "development") {
    return "development_safe";
  }
  if (normalized === "preview_safe" || normalized === "preview") {
    return "preview_safe";
  }
  if (
    normalized === "preview_real_test" ||
    normalized === "preview_real" ||
    normalized === "preview_live_test"
  ) {
    return "preview_real_test";
  }
  if (normalized === "production_live" || normalized === "prod_live" || normalized === "production") {
    return "production_live";
  }
  return null;
};

const resolveDefaultProfile = (): WhatsAppAutomationProfile => {
  const vercelEnv = normalizeText(process.env.VERCEL_ENV).toLowerCase();
  if (vercelEnv === "production") return "production_live";
  if (vercelEnv === "preview") return "preview_safe";
  if (process.env.NODE_ENV === "production") return "production_live";
  return "development_safe";
};

const hasLegacyModeFlags = () =>
  process.env.WHATSAPP_AUTOMATION_GLOBAL_ENABLED != null ||
  process.env.WHATSAPP_AUTOMATION_FORCE_DRY_RUN != null;

const resolveModeFromLegacyFlags = (defaultMode: WhatsAppAutomationMode): WhatsAppAutomationMode => {
  if (!hasLegacyModeFlags()) {
    return defaultMode;
  }
  const globallyEnabled = parseBoolean(process.env.WHATSAPP_AUTOMATION_GLOBAL_ENABLED, true);
  if (!globallyEnabled) {
    return "disabled";
  }
  const forceDryRun = parseBoolean(
    process.env.WHATSAPP_AUTOMATION_FORCE_DRY_RUN,
    process.env.NODE_ENV !== "production"
  );
  return forceDryRun ? "dry_run" : "enabled";
};

const resolveRecipientModeFromLegacyFlags = (
  defaultMode: WhatsAppAutomationRecipientMode
): WhatsAppAutomationRecipientMode => {
  if (process.env.WHATSAPP_AUTOMATION_META_FORCE_TEST_RECIPIENT == null) {
    return defaultMode;
  }
  return parseBoolean(process.env.WHATSAPP_AUTOMATION_META_FORCE_TEST_RECIPIENT, true)
    ? "test_recipient"
    : "customer";
};

const buildAutomationConfig = (): WhatsAppAutomationConfig => {
  const profile = parseAutomationProfile(process.env.WHATSAPP_AUTOMATION_PROFILE) ?? resolveDefaultProfile();
  const profilePreset = PROFILE_PRESETS[profile];
  const explicitMode = parseAutomationMode(process.env.WHATSAPP_AUTOMATION_MODE);
  const mode = explicitMode ?? resolveModeFromLegacyFlags(profilePreset.mode);
  const explicitRecipientMode = parseRecipientMode(process.env.WHATSAPP_AUTOMATION_RECIPIENT_MODE);
  const recipientMode =
    explicitRecipientMode ?? resolveRecipientModeFromLegacyFlags(profilePreset.recipientMode);
  const provider = parseProvider(process.env.WHATSAPP_AUTOMATION_PROVIDER);
  const forceDryRunLegacy = mode === "dry_run";
  const globalEnabledLegacy = mode !== "disabled";
  const forceTestRecipientLegacy = recipientMode === "test_recipient";

  return {
    profile,
    mode,
    provider,
    recipientMode,
    autoDispatchOnQueue: parseBoolean(process.env.WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE, true),
    processorSecret: normalizeText(process.env.WHATSAPP_AUTOMATION_PROCESSOR_SECRET),
    batchLimit: parseBatchLimit(process.env.WHATSAPP_AUTOMATION_BATCH_LIMIT, 20),
    maxRetries: parsePositiveInt(process.env.WHATSAPP_AUTOMATION_MAX_RETRIES, 3, 20),
    retryBaseDelaySeconds: parsePositiveInt(process.env.WHATSAPP_AUTOMATION_RETRY_BASE_DELAY_SECONDS, 60, 86_400),
    metaAccessToken: normalizeText(process.env.WHATSAPP_AUTOMATION_META_ACCESS_TOKEN),
    metaPhoneNumberId: normalizeText(process.env.WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID),
    metaBusinessAccountId: normalizeText(process.env.WHATSAPP_AUTOMATION_META_BUSINESS_ACCOUNT_ID),
    metaTestRecipient: normalizeText(process.env.WHATSAPP_AUTOMATION_META_TEST_RECIPIENT),
    metaApiVersion: normalizeText(process.env.WHATSAPP_AUTOMATION_META_API_VERSION) || "v22.0",
    metaWebhookVerifyToken: normalizeText(process.env.WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN),
    metaAppSecret: normalizeText(process.env.WHATSAPP_AUTOMATION_META_APP_SECRET),
    floraHistorySince: normalizeText(process.env.WHATSAPP_AUTOMATION_FLORA_HISTORY_SINCE),
    legacy: {
      globalEnabled: globalEnabledLegacy,
      forceDryRun: forceDryRunLegacy,
      forceTestRecipient: forceTestRecipientLegacy,
    },
  };
};

export const WHATSAPP_AUTOMATION_CONFIG = buildAutomationConfig();

export const WHATSAPP_AUTOMATION_PROFILE = WHATSAPP_AUTOMATION_CONFIG.profile;
export const WHATSAPP_AUTOMATION_MODE = WHATSAPP_AUTOMATION_CONFIG.mode;
export const WHATSAPP_AUTOMATION_PROVIDER = WHATSAPP_AUTOMATION_CONFIG.provider;
export const WHATSAPP_AUTOMATION_RECIPIENT_MODE = WHATSAPP_AUTOMATION_CONFIG.recipientMode;
export const WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE = WHATSAPP_AUTOMATION_CONFIG.autoDispatchOnQueue;
export const WHATSAPP_AUTOMATION_PROCESSOR_SECRET = WHATSAPP_AUTOMATION_CONFIG.processorSecret;
export const WHATSAPP_AUTOMATION_BATCH_LIMIT = WHATSAPP_AUTOMATION_CONFIG.batchLimit;
export const WHATSAPP_AUTOMATION_MAX_RETRIES = WHATSAPP_AUTOMATION_CONFIG.maxRetries;
export const WHATSAPP_AUTOMATION_RETRY_BASE_DELAY_SECONDS =
  WHATSAPP_AUTOMATION_CONFIG.retryBaseDelaySeconds;
export const WHATSAPP_AUTOMATION_META_ACCESS_TOKEN = WHATSAPP_AUTOMATION_CONFIG.metaAccessToken;
export const WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID = WHATSAPP_AUTOMATION_CONFIG.metaPhoneNumberId;
export const WHATSAPP_AUTOMATION_META_BUSINESS_ACCOUNT_ID =
  WHATSAPP_AUTOMATION_CONFIG.metaBusinessAccountId;
export const WHATSAPP_AUTOMATION_META_TEST_RECIPIENT = WHATSAPP_AUTOMATION_CONFIG.metaTestRecipient;
export const WHATSAPP_AUTOMATION_META_API_VERSION = WHATSAPP_AUTOMATION_CONFIG.metaApiVersion;
export const WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN =
  WHATSAPP_AUTOMATION_CONFIG.metaWebhookVerifyToken;
export const WHATSAPP_AUTOMATION_META_APP_SECRET = WHATSAPP_AUTOMATION_CONFIG.metaAppSecret;
export const WHATSAPP_AUTOMATION_FLORA_HISTORY_SINCE = WHATSAPP_AUTOMATION_CONFIG.floraHistorySince;

export const WHATSAPP_AUTOMATION_GLOBAL_ENABLED = WHATSAPP_AUTOMATION_CONFIG.legacy.globalEnabled;
export const WHATSAPP_AUTOMATION_FORCE_DRY_RUN = WHATSAPP_AUTOMATION_CONFIG.legacy.forceDryRun;
export const WHATSAPP_AUTOMATION_META_FORCE_TEST_RECIPIENT =
  WHATSAPP_AUTOMATION_CONFIG.legacy.forceTestRecipient;

export function isWhatsAppAutomationDispatchEnabled() {
  return WHATSAPP_AUTOMATION_MODE !== "disabled";
}

export function isWhatsAppAutomationLiveSendEnabled() {
  return WHATSAPP_AUTOMATION_MODE === "enabled";
}

export function isWhatsAppAutomationTenantAllowed(tenantId: string) {
  void tenantId;
  return true;
}

export type {
  WhatsAppAutomationMode,
  WhatsAppAutomationProfile,
  WhatsAppAutomationProvider,
  WhatsAppAutomationRecipientMode,
  WhatsAppAutomationConfig,
};
