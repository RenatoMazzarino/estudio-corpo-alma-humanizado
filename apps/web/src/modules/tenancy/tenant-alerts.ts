import "server-only";

import { createServiceClient } from "../../../lib/supabase/service";
import { AppError } from "../../shared/errors/AppError";
import { listTenantMemberships } from "./membership-governance";
import { listTenantProviderConfigs, type ProviderKey } from "./provider-config";

export type TenantAlertSeverity = "warning" | "critical";

export type TenantOperationalAlert = {
  code:
    | "tenant_without_owner"
    | "provider_enabled_without_credentials"
    | "provider_inactive"
    | "domain_inactive"
    | "tenant_suspended"
    | "onboarding_blocked";
  severity: TenantAlertSeverity;
  message: string;
  details?: Record<string, unknown>;
};

function hasCredentialForProvider(providerKey: ProviderKey, secretConfig: Record<string, unknown>) {
  const read = (key: string) => {
    const value = secretConfig[key];
    return typeof value === "string" && value.trim().length > 0;
  };

  if (providerKey === "mercadopago") return read("access_token");
  if (providerKey === "onesignal") return read("rest_api_key");
  if (providerKey === "google_maps") return read("api_key");
  if (providerKey === "whatsapp_meta") return read("access_token");
  return false;
}

export async function getTenantOperationalAlerts(tenantId: string) {
  const alerts: TenantOperationalAlert[] = [];
  const supabase = createServiceClient();

  const [{ data: tenant, error: tenantError }, { data: domains, error: domainsError }, { data: onboardingRuns, error: onboardingError }] =
    await Promise.all([
      supabase.from("tenants").select("id, status").eq("id", tenantId).maybeSingle(),
      supabase
        .from("tenant_domains")
        .select("domain, is_active")
        .eq("tenant_id", tenantId),
      supabase
        .from("tenant_onboarding_runs")
        .select("id, status, current_step, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (tenantError || domainsError || onboardingError) {
    throw new AppError("Falha ao avaliar alertas operacionais do tenant.", "SUPABASE_ERROR", 500, {
      tenantError,
      domainsError,
      onboardingError,
    });
  }

  if (tenant?.status === "suspended" || tenant?.status === "archived") {
    alerts.push({
      code: "tenant_suspended",
      severity: "critical",
      message: `Tenant em status '${tenant.status}'.`,
      details: { status: tenant.status },
    });
  }

  const memberships = await listTenantMemberships(tenantId);
  const activeOwners = memberships.filter((membership) => membership.role === "owner" && membership.status === "active");
  if (activeOwners.length === 0) {
    alerts.push({
      code: "tenant_without_owner",
      severity: "critical",
      message: "Tenant sem owner ativo.",
    });
  }

  const providerConfigs = await listTenantProviderConfigs(tenantId);
  for (const config of providerConfigs) {
    if (config.status !== "active") {
      alerts.push({
        code: "provider_inactive",
        severity: config.enabled ? "critical" : "warning",
        message: `Provider '${config.providerKey}' com status '${config.status}'.`,
        details: {
          providerKey: config.providerKey,
          status: config.status,
          enabled: config.enabled,
        },
      });
    }

    if (config.enabled && config.credentialMode !== "environment_fallback") {
      const hasCredential = hasCredentialForProvider(config.providerKey, config.secretConfig);
      if (!hasCredential) {
        alerts.push({
          code: "provider_enabled_without_credentials",
          severity: "critical",
          message: `Provider '${config.providerKey}' habilitado sem credencial valida no tenant.`,
          details: {
            providerKey: config.providerKey,
            credentialMode: config.credentialMode,
          },
        });
      }
    }
  }

  const inactiveDomains = (domains ?? []).filter((domain) => !domain.is_active);
  if (inactiveDomains.length > 0) {
    alerts.push({
      code: "domain_inactive",
      severity: "warning",
      message: "Tenant possui dominios inativos que exigem revisao.",
      details: {
        totalInactiveDomains: inactiveDomains.length,
      },
    });
  }

  if (onboardingRuns?.status === "blocked") {
    alerts.push({
      code: "onboarding_blocked",
      severity: "warning",
      message: "Onboarding do tenant esta bloqueado e precisa de acao manual.",
      details: {
        currentStep: onboardingRuns.current_step,
      },
    });
  }

  return alerts;
}
