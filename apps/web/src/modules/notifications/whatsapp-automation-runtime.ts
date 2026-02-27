import {
  WHATSAPP_AUTOMATION_ALLOWED_TENANT_IDS,
  WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE,
  WHATSAPP_AUTOMATION_BATCH_LIMIT,
  WHATSAPP_AUTOMATION_LOCAL_POLLER_ENABLED,
  WHATSAPP_AUTOMATION_LOCAL_POLLER_INTERVAL_SECONDS,
  WHATSAPP_AUTOMATION_MAX_RETRIES,
  WHATSAPP_AUTOMATION_META_ACCESS_TOKEN,
  WHATSAPP_AUTOMATION_META_API_VERSION,
  WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_LANGUAGE,
  WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME,
  WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID,
  WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_LANGUAGE,
  WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME,
  WHATSAPP_AUTOMATION_META_TEST_RECIPIENT,
  WHATSAPP_AUTOMATION_MODE,
  WHATSAPP_AUTOMATION_PROVIDER,
  WHATSAPP_AUTOMATION_QUEUE_ENABLED,
  WHATSAPP_AUTOMATION_RETRY_BASE_DELAY_SECONDS,
  WHATSAPP_AUTOMATION_STUDIO_LOCATION_LINE,
} from "./automation-config";
import { onlyDigits } from "./whatsapp-automation.helpers";
import { processPendingWhatsAppNotificationJobs } from "./whatsapp-automation-processor";
import type { LocalPollerState } from "./whatsapp-automation.types";

export function getWhatsAppAutomationRuntimeConfig() {
  return {
    mode: WHATSAPP_AUTOMATION_MODE,
    provider: WHATSAPP_AUTOMATION_PROVIDER,
    queueEnabled: WHATSAPP_AUTOMATION_QUEUE_ENABLED,
    autoDispatchOnQueue: WHATSAPP_AUTOMATION_AUTO_DISPATCH_ON_QUEUE,
    batchLimit: WHATSAPP_AUTOMATION_BATCH_LIMIT,
    maxRetries: WHATSAPP_AUTOMATION_MAX_RETRIES,
    retryBaseDelaySeconds: WHATSAPP_AUTOMATION_RETRY_BASE_DELAY_SECONDS,
    localPollerEnabled: WHATSAPP_AUTOMATION_LOCAL_POLLER_ENABLED,
    localPollerIntervalSeconds: WHATSAPP_AUTOMATION_LOCAL_POLLER_INTERVAL_SECONDS,
    allowedTenantIdsCount: WHATSAPP_AUTOMATION_ALLOWED_TENANT_IDS.length,
    meta: {
      apiVersion: WHATSAPP_AUTOMATION_META_API_VERSION,
      phoneNumberIdConfigured: Boolean(WHATSAPP_AUTOMATION_META_PHONE_NUMBER_ID),
      accessTokenConfigured: Boolean(WHATSAPP_AUTOMATION_META_ACCESS_TOKEN),
      testRecipientConfigured: Boolean(onlyDigits(WHATSAPP_AUTOMATION_META_TEST_RECIPIENT)),
      createdTemplateName: WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_NAME,
      createdTemplateLanguage: WHATSAPP_AUTOMATION_META_CREATED_TEMPLATE_LANGUAGE,
      reminderTemplateName: WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_NAME,
      reminderTemplateLanguage: WHATSAPP_AUTOMATION_META_REMINDER_TEMPLATE_LANGUAGE,
      studioLocationLineConfigured: Boolean(WHATSAPP_AUTOMATION_STUDIO_LOCATION_LINE),
    },
  };
}

function getLocalPollerState(): LocalPollerState {
  const globalRef = globalThis as typeof globalThis & {
    __whatsappAutomationLocalPollerState?: LocalPollerState;
  };
  if (!globalRef.__whatsappAutomationLocalPollerState) {
    globalRef.__whatsappAutomationLocalPollerState = {
      started: false,
      running: false,
      timer: null,
    };
  }
  return globalRef.__whatsappAutomationLocalPollerState;
}

export function startLocalWhatsAppAutomationPollerIfNeeded() {
  if (typeof window !== "undefined") return;
  if (!WHATSAPP_AUTOMATION_LOCAL_POLLER_ENABLED) return;
  if (process.env.NODE_ENV === "production") return;

  const state = getLocalPollerState();
  if (state.started) return;
  state.started = true;

  const intervalMs = Math.max(5, WHATSAPP_AUTOMATION_LOCAL_POLLER_INTERVAL_SECONDS) * 1000;
  state.timer = setInterval(async () => {
    if (state.running) return;
    if (WHATSAPP_AUTOMATION_MODE === "disabled") return;
    state.running = true;
    try {
      const summary = await processPendingWhatsAppNotificationJobs({ limit: 5 });
      if (summary.sent > 0 || summary.failed > 0) {
        console.log(
          `[whatsapp-automation] Local poller processou jobs: sent=${summary.sent} failed=${summary.failed} skipped=${summary.skipped}`
        );
      }
    } catch (error) {
      console.error("[whatsapp-automation] Falha no local poller:", error);
    } finally {
      state.running = false;
    }
  }, intervalMs);
  state.timer.unref?.();

  console.log(
    `[whatsapp-automation] Local poller ativo (${WHATSAPP_AUTOMATION_LOCAL_POLLER_INTERVAL_SECONDS}s) para jobs agendados.`
  );
}
