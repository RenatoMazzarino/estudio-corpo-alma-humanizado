import { isFeatureEnabled } from "../../shared/feature-flags";

const normalize = (value: string | undefined) => value?.trim() ?? "";

export const ONESIGNAL_APP_ID = normalize(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID);
export const ONESIGNAL_SAFARI_WEB_ID = normalize(process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID);
export const ONESIGNAL_REST_API_KEY = normalize(process.env.ONESIGNAL_REST_API_KEY);

export function isPushNotificationsEnabled(tenantId?: string | null) {
  return isFeatureEnabled("FF_PUSH_NOTIFICATIONS", { key: tenantId ?? null });
}

export function assertPushServerConfig() {
  if (!ONESIGNAL_APP_ID) {
    throw new Error("NEXT_PUBLIC_ONESIGNAL_APP_ID não configurado.");
  }
  if (!ONESIGNAL_REST_API_KEY) {
    throw new Error("ONESIGNAL_REST_API_KEY não configurado.");
  }
}
