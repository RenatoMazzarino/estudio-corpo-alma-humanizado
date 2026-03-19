import "server-only";

import { listTenantConfigurationAuditLogs } from "./config-audit";
import {
  listTenantMemberships,
  type TenantMembershipRole,
  type TenantMembershipStatus,
} from "./membership-governance";
import { listTenantOnboardingHistory } from "./onboarding";
import { listTenantProviderConfigs, getTenantProviderHealth } from "./provider-config";
import { getTenantProviderUsageSummary } from "./provider-metering";
import { getTenantRuntimeConfigById } from "./runtime";
import { getTenantOperationalAlerts } from "./tenant-alerts";

export type TenantOperationalOverview = {
  tenantId: string;
  generatedAt: string;
  runtime: Awaited<ReturnType<typeof getTenantRuntimeConfigById>>;
  providerConfigs: Awaited<ReturnType<typeof listTenantProviderConfigs>>;
  providerHealth: Array<{
    providerKey: string;
    issues: Array<{ code: string; message: string }>;
  }>;
  alerts: Awaited<ReturnType<typeof getTenantOperationalAlerts>>;
  memberships: Array<{
    id: string;
    tenantId: string;
    email: string;
    role: TenantMembershipRole;
    status: TenantMembershipStatus;
    isActive: boolean;
    linkedAt: string | null;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  onboarding: Awaited<ReturnType<typeof listTenantOnboardingHistory>>;
  usage: Awaited<ReturnType<typeof getTenantProviderUsageSummary>>;
  audit: Awaited<ReturnType<typeof listTenantConfigurationAuditLogs>>;
};

const PROVIDER_KEYS = ["mercadopago", "onesignal", "google_maps", "whatsapp_meta"] as const;

export async function getTenantOperationalOverview(
  tenantId: string
): Promise<TenantOperationalOverview> {
  const [runtime, providerConfigs, memberships, onboarding, usage, audit, alerts, providerHealth] =
    await Promise.all([
      getTenantRuntimeConfigById(tenantId),
      listTenantProviderConfigs(tenantId),
      listTenantMemberships(tenantId),
      listTenantOnboardingHistory(tenantId),
      getTenantProviderUsageSummary(tenantId),
      listTenantConfigurationAuditLogs(tenantId, 120),
      getTenantOperationalAlerts(tenantId),
      Promise.all(
        PROVIDER_KEYS.map(async (providerKey) => {
          const health = await getTenantProviderHealth(tenantId, providerKey);
          return {
            providerKey,
            issues: health.issues.map((issue) => ({
              code: issue.code,
              message: issue.message,
            })),
          };
        })
      ),
    ]);

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    runtime,
    providerConfigs,
    providerHealth,
    alerts,
    memberships,
    onboarding,
    usage,
    audit,
  };
}

