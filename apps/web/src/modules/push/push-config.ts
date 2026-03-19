import { isFeatureEnabled } from "../../shared/feature-flags";
import { resolveOneSignalTenantConfig } from "../tenancy/provider-config";

const normalize = (value: string | undefined) => value?.trim() ?? "";

export const ENV_ONESIGNAL_APP_ID = normalize(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID);
export const ENV_ONESIGNAL_SAFARI_WEB_ID = normalize(process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID);
export const ENV_ONESIGNAL_REST_API_KEY = normalize(process.env.ONESIGNAL_REST_API_KEY);

export function isPushNotificationsEnabled(tenantId?: string | null) {
  return isFeatureEnabled("FF_PUSH_NOTIFICATIONS", { key: tenantId ?? null });
}

export async function resolvePushProviderConfig(tenantId: string) {
  const oneSignalConfig = await resolveOneSignalTenantConfig(tenantId);
  return {
    appId: oneSignalConfig.appId,
    safariWebId: oneSignalConfig.safariWebId,
    restApiKey: oneSignalConfig.restApiKey,
  };
}

export async function isPushTransportConfigured(tenantId: string) {
  try {
    const config = await resolvePushProviderConfig(tenantId);
    return Boolean(config.appId && config.restApiKey);
  } catch {
    return false;
  }
}

export async function assertPushServerConfig(tenantId: string) {
  const config = await resolvePushProviderConfig(tenantId);
  if (!config.appId) {
    throw new Error("OneSignal app_id não configurado para este tenant.");
  }
  if (!config.restApiKey) {
    throw new Error("OneSignal rest_api_key não configurado para este tenant.");
  }
  return config;
}
