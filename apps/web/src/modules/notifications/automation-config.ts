type WhatsAppAutomationMode = "disabled" | "dry_run" | "enabled";
type WhatsAppAutomationProvider = "none" | "meta_cloud";

const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value == null) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
};

const parseMode = (value: string | undefined): WhatsAppAutomationMode => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "dry_run") return "dry_run";
  if (normalized === "enabled") return "enabled";
  return "disabled";
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

const parseCsv = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const WHATSAPP_AUTOMATION_MODE = parseMode(process.env.WHATSAPP_AUTOMATION_MODE);
export const WHATSAPP_AUTOMATION_PROVIDER = parseProvider(process.env.WHATSAPP_AUTOMATION_PROVIDER);
export const WHATSAPP_AUTOMATION_QUEUE_ENABLED = parseBoolean(
  process.env.WHATSAPP_AUTOMATION_QUEUE_ENABLED,
  false
);
export const WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE = parseBoolean(
  process.env.WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE,
  true
);
export const WHATSAPP_AUTOMATION_LOCAL_POLLER_ENABLED = parseBoolean(
  process.env.WHATSAPP_AUTOMATION_LOCAL_POLLER_ENABLED,
  process.env.NODE_ENV !== "production"
);
export const WHATSAPP_AUTOMATION_LOCAL_POLLER_INTERVAL_SECONDS = parsePositiveInt(
  process.env.WHATSAPP_AUTOMATION_LOCAL_POLLER_INTERVAL_SECONDS,
  30,
  3600
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
export const WHATSAPP_AUTOMATION_ALLOWED_TENANT_IDS = parseCsv(
  process.env.WHATSAPP_AUTOMATION_ALLOWED_TENANT_IDS
);
export const WHATSAPP_AUTOMATION_META_ACCESS_TOKEN =
  process.env.WHATSAPP_AUTOMATION_META_ACCESS_TOKEN?.trim() ?? "";
export const WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID =
  process.env.WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID?.trim() ?? "";
export const WHATSAPP_AUTOMATION_META_TEST_RECIPIENT =
  process.env.WHATSAPP_AUTOMATION_META_TEST_RECIPIENT?.trim() ?? "";
export const WHATSAPP_AUTOMATION_META_API_VERSION =
  process.env.WHATSAPP_AUTOMATION_META_API_VERSION?.trim() || "v22.0";
export const WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME =
  process.env.WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME?.trim() ||
  "aviso_agendamento_interno_sem_comprovante";
export const WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_LANGUAGE =
  process.env.WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_LANGUAGE?.trim() || "pt_BR";
export const WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME =
  process.env.WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME?.trim() ||
  "confirmacao_de_agendamento_24h";
export const WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_LANGUAGE =
  process.env.WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_LANGUAGE?.trim() || "pt_BR";
export const WHATSAPP_AUTOMATION_STUDIO_LOCATION_LINE =
  process.env.WHATSAPP_AUTOMATION_STUDIO_LOCATION_LINE?.trim() ??
  process.env.DISPLACEMENT_ORIGIN_ADDRESS?.trim() ??
  "";
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
  if (WHATSAPP_AUTOMATION_ALLOWED_TENANT_IDS.length === 0) return true;
  return WHATSAPP_AUTOMATION_ALLOWED_TENANT_IDS.includes(tenantId);
}

export type { WhatsAppAutomationMode, WhatsAppAutomationProvider };
