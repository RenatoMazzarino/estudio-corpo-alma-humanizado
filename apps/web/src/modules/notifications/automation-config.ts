type WhatsAppAutomationMode = "disabled" | "dry_run" | "enabled";
type WhatsAppAutomationProvider = "none" | "meta_cloud";

const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value == null) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
};

const parseProvider = (value: string | undefined): WhatsAppAutomationProvider => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "meta_cloud") return "meta_cloud";
  return "none";
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

function resolveAutomationMode(): WhatsAppAutomationMode {
  const globallyEnabled = parseBoolean(process.env.WHATSAPP_AUTOMATION_GLOBAL_ENABLED, true);
  if (!globallyEnabled) return "disabled";

  const forceDryRun = parseBoolean(
    process.env.WHATSAPP_AUTOMATION_FORCE_DRY_RUN,
    process.env.NODE_ENV !== "production"
  );

  return forceDryRun ? "dry_run" : "enabled";
}

export const WHATSAPP_AUTOMATION_MODE = resolveAutomationMode();
export const WHATSAPP_AUTOMATION_PROVIDER = parseProvider(process.env.WHATSAPP_AUTOMATION_PROVIDER);

export const WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE = parseBoolean(
  process.env.WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE,
  true
);

export const WHATSAPP_AUTOMATION_PROCESSOR_SECRET =
  process.env.WHATSAPP_AUTOMATION_PROCESSOR_SECRET?.trim() ?? "";

export const WHATSAPP_AUTOMATION_BATCH_LIMIT = parseBatchLimit(
  process.env.WHATSAPP_AUTOMATION_BATCH_LIMIT,
  20
);

export const WHATSAPP_AUTOMATION_MAX_RETRIES = parsePositiveInt(
  process.env.WHATSAPP_AUTOMATION_MAX_RETRIES,
  3,
  20
);

export const WHATSAPP_AUTOMATION_RETRY_BASE_DELAY_SECONDS = parsePositiveInt(
  process.env.WHATSAPP_AUTOMATION_RETRY_BASE_DELAY_SECONDS,
  60,
  86_400
);

export const WHATSAPP_AUTOMATION_META_ACCESS_TOKEN =
  process.env.WHATSAPP_AUTOMATION_META_ACCESS_TOKEN?.trim() ?? "";

export const WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID =
  process.env.WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID?.trim() ?? "";

export const WHATSAPP_AUTOMATION_META_TEST_RECIPIENT =
  process.env.WHATSAPP_AUTOMATION_META_TEST_RECIPIENT?.trim() ?? "";

export const WHATSAPP_AUTOMATION_META_API_VERSION =
  process.env.WHATSAPP_AUTOMATION_META_API_VERSION?.trim() || "v22.0";

export const WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN =
  process.env.WHATSAPP_AUTOMATION_META_WEBHOOK_VERIFY_TOKEN?.trim() ?? "";

export const WHATSAPP_AUTOMATION_META_APP_SECRET =
  process.env.WHATSAPP_AUTOMATION_META_APP_SECRET?.trim() ?? "";

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

export type { WhatsAppAutomationMode, WhatsAppAutomationProvider };
