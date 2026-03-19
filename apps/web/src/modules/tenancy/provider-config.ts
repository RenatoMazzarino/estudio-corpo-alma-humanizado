import "server-only";

import { createServiceClient } from "../../../lib/supabase/service";
import { AppError } from "../../shared/errors/AppError";

export type ProviderKey = "mercadopago" | "onesignal" | "google_maps" | "whatsapp_meta";
export type ProviderEnvironmentMode = "all" | "development" | "preview" | "production";
export type ProviderStatus = "draft" | "active" | "disabled" | "invalid";
export type ProviderCredentialMode =
  | "tenant_secret"
  | "platform_shared"
  | "environment_fallback"
  | "tenant_managed_external";

export type ProviderIssueCode =
  | "provider_not_found"
  | "provider_disabled"
  | "provider_inactive"
  | "credentials_missing"
  | "environment_mismatch";

export type TenantProviderConfig = {
  id: string;
  tenantId: string;
  providerKey: ProviderKey;
  environmentMode: ProviderEnvironmentMode;
  status: ProviderStatus;
  credentialMode: ProviderCredentialMode;
  enabled: boolean;
  senderIdentifier: string | null;
  baseUrl: string | null;
  publicConfig: Record<string, unknown>;
  secretConfig: Record<string, unknown>;
  failSafeEnabled: boolean;
  configVersion: number;
  lastValidatedAt: string | null;
  lastError: string | null;
  updatedAt: string;
};

export type TenantProviderHealthIssue = {
  code: ProviderIssueCode;
  message: string;
};

type RuntimeEnvironment = "development" | "preview" | "production";

type RawTenantProviderConfigRow = {
  id: string;
  tenant_id: string;
  provider_key: ProviderKey;
  environment_mode: ProviderEnvironmentMode;
  status: ProviderStatus;
  credential_mode: ProviderCredentialMode;
  enabled: boolean;
  sender_identifier: string | null;
  base_url: string | null;
  public_config: Record<string, unknown> | null;
  secret_config: Record<string, unknown> | null;
  fail_safe_enabled: boolean;
  config_version: number;
  last_validated_at: string | null;
  last_error: string | null;
  updated_at: string;
};

const PROVIDER_CACHE_TTL_MS = 30_000;
const providerConfigCache = new Map<string, { expiresAt: number; value: TenantProviderConfig | null }>();

function normalizeEnvironment(value: string | null | undefined): RuntimeEnvironment {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "production") return "production";
  if (normalized === "preview") return "preview";
  return "development";
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeJsonObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, unknown>;
  return value as Record<string, unknown>;
}

function mapRow(row: RawTenantProviderConfigRow): TenantProviderConfig {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    providerKey: row.provider_key,
    environmentMode: row.environment_mode,
    status: row.status,
    credentialMode: row.credential_mode,
    enabled: Boolean(row.enabled),
    senderIdentifier: normalizeText(row.sender_identifier),
    baseUrl: normalizeText(row.base_url),
    publicConfig: normalizeJsonObject(row.public_config),
    secretConfig: normalizeJsonObject(row.secret_config),
    failSafeEnabled: Boolean(row.fail_safe_enabled),
    configVersion: Number.isFinite(Number(row.config_version)) ? Number(row.config_version) : 1,
    lastValidatedAt: row.last_validated_at ?? null,
    lastError: normalizeText(row.last_error),
    updatedAt: row.updated_at,
  };
}

function getConfigValue(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return normalizeText(value);
}

function getRuntimeEnvironment() {
  return normalizeEnvironment(process.env.VERCEL_ENV);
}

function buildCacheKey(tenantId: string, providerKey: ProviderKey, environment: RuntimeEnvironment) {
  return `${tenantId}:${providerKey}:${environment}`;
}

export function clearTenantProviderConfigCache() {
  providerConfigCache.clear();
}

async function loadTenantProviderConfig(params: {
  tenantId: string;
  providerKey: ProviderKey;
  environment?: RuntimeEnvironment;
}) {
  const runtimeEnvironment = params.environment ?? getRuntimeEnvironment();
  const cacheKey = buildCacheKey(params.tenantId, params.providerKey, runtimeEnvironment);
  const cached = providerConfigCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tenant_provider_configs")
    .select(
      "id, tenant_id, provider_key, environment_mode, status, credential_mode, enabled, sender_identifier, base_url, public_config, secret_config, fail_safe_enabled, config_version, last_validated_at, last_error, updated_at"
    )
    .eq("tenant_id", params.tenantId)
    .eq("provider_key", params.providerKey)
    .in("environment_mode", ["all", runtimeEnvironment])
    .order("environment_mode", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new AppError(
      `Falha ao carregar configuracao do provider '${params.providerKey}'.`,
      "SUPABASE_ERROR",
      500,
      error
    );
  }

  const rows = ((data ?? []) as RawTenantProviderConfigRow[])
    .filter((row) => row.provider_key === params.providerKey)
    .sort((left, right) => {
      const leftPriority = left.environment_mode === runtimeEnvironment ? 0 : 1;
      const rightPriority = right.environment_mode === runtimeEnvironment ? 0 : 1;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return right.updated_at.localeCompare(left.updated_at);
    });

  const firstRow = rows.length > 0 ? rows[0] : null;
  const mapped = firstRow ? mapRow(firstRow) : null;
  providerConfigCache.set(cacheKey, {
    expiresAt: Date.now() + PROVIDER_CACHE_TTL_MS,
    value: mapped,
  });

  return mapped;
}

function evaluateHealth(config: TenantProviderConfig | null) {
  const issues: TenantProviderHealthIssue[] = [];

  if (!config) {
    issues.push({
      code: "provider_not_found",
      message: "Provider nao configurado para este tenant.",
    });
    return issues;
  }

  if (!config.enabled) {
    issues.push({
      code: "provider_disabled",
      message: "Provider desabilitado para este tenant.",
    });
  }

  if (config.status !== "active") {
    issues.push({
      code: "provider_inactive",
      message: `Provider com status '${config.status}'.`,
    });
  }

  if (config.environmentMode !== "all" && config.environmentMode !== getRuntimeEnvironment()) {
    issues.push({
      code: "environment_mismatch",
      message: "Provider configurado para ambiente diferente do runtime atual.",
    });
  }

  return issues;
}

function assertProviderHealth(config: TenantProviderConfig | null, providerKey: ProviderKey) {
  const issues = evaluateHealth(config);
  if (issues.length > 0) {
    throw new AppError(
      `Configuracao de provider '${providerKey}' inconsistente: ${issues.map((item) => item.message).join(" ")}`,
      "CONFIG_ERROR",
      423,
      { providerKey, issues }
    );
  }
  return config as TenantProviderConfig;
}

export async function getTenantProviderHealth(tenantId: string, providerKey: ProviderKey) {
  const config = await loadTenantProviderConfig({ tenantId, providerKey });
  return {
    config,
    issues: evaluateHealth(config),
  };
}

export async function listTenantProviderConfigs(tenantId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tenant_provider_configs")
    .select(
      "id, tenant_id, provider_key, environment_mode, status, credential_mode, enabled, sender_identifier, base_url, public_config, secret_config, fail_safe_enabled, config_version, last_validated_at, last_error, updated_at"
    )
    .eq("tenant_id", tenantId)
    .order("provider_key", { ascending: true })
    .order("environment_mode", { ascending: true });

  if (error) {
    throw new AppError("Falha ao listar providers do tenant.", "SUPABASE_ERROR", 500, error);
  }

  return ((data ?? []) as RawTenantProviderConfigRow[]).map(mapRow);
}

export async function resolveMercadoPagoTenantConfig(tenantId: string) {
  const config = assertProviderHealth(
    await loadTenantProviderConfig({ tenantId, providerKey: "mercadopago" }),
    "mercadopago"
  );

  const accessToken =
    getConfigValue(config.secretConfig, "access_token") ??
    (config.credentialMode === "environment_fallback"
      ? normalizeText(process.env.MERCADOPAGO_ACCESS_TOKEN)
      : null);
  const publicKey =
    getConfigValue(config.publicConfig, "public_key") ??
    (config.credentialMode === "environment_fallback"
      ? normalizeText(process.env.MERCADOPAGO_PUBLIC_KEY)
      : null);
  const webhookSecret =
    getConfigValue(config.secretConfig, "webhook_secret") ??
    (config.credentialMode === "environment_fallback"
      ? normalizeText(process.env.MERCADOPAGO_WEBHOOK_SECRET)
      : null);

  if (!accessToken) {
    throw new AppError(
      "Mercado Pago sem access token configurado para este tenant.",
      "CONFIG_ERROR",
      500,
      { tenantId, providerKey: "mercadopago" }
    );
  }

  return {
    config,
    accessToken,
    publicKey,
    webhookSecret,
  };
}

export async function listMercadoPagoWebhookCandidates() {
  const supabase = createServiceClient();
  const runtimeEnvironment = getRuntimeEnvironment();

  const { data, error } = await supabase
    .from("tenant_provider_configs")
    .select(
      "tenant_id, provider_key, environment_mode, status, credential_mode, enabled, secret_config, public_config"
    )
    .eq("provider_key", "mercadopago")
    .eq("enabled", true)
    .eq("status", "active")
    .in("environment_mode", ["all", runtimeEnvironment]);

  if (error) {
    throw new AppError("Falha ao listar candidatos de webhook Mercado Pago.", "SUPABASE_ERROR", 500, error);
  }

  const candidates = ((data ?? []) as Array<{
    tenant_id: string;
    credential_mode: ProviderCredentialMode;
    secret_config: Record<string, unknown> | null;
    public_config: Record<string, unknown> | null;
  }>).map((row) => {
    const secretConfig = normalizeJsonObject(row.secret_config);
    const publicConfig = normalizeJsonObject(row.public_config);

    const accessToken =
      getConfigValue(secretConfig, "access_token") ??
      (row.credential_mode === "environment_fallback"
        ? normalizeText(process.env.MERCADOPAGO_ACCESS_TOKEN)
        : null);
    const webhookSecret =
      getConfigValue(secretConfig, "webhook_secret") ??
      (row.credential_mode === "environment_fallback"
        ? normalizeText(process.env.MERCADOPAGO_WEBHOOK_SECRET)
        : null);
    const publicKey =
      getConfigValue(publicConfig, "public_key") ??
      (row.credential_mode === "environment_fallback"
        ? normalizeText(process.env.MERCADOPAGO_PUBLIC_KEY)
        : null);

    return {
      tenantId: row.tenant_id,
      accessToken,
      webhookSecret,
      publicKey,
    };
  });

  const dedup = new Map<string, { tenantId: string; accessToken: string; webhookSecret: string | null; publicKey: string | null }>();
  for (const candidate of candidates) {
    if (!candidate.accessToken) continue;
    if (dedup.has(candidate.accessToken)) continue;
    dedup.set(candidate.accessToken, {
      tenantId: candidate.tenantId,
      accessToken: candidate.accessToken,
      webhookSecret: candidate.webhookSecret,
      publicKey: candidate.publicKey,
    });
  }

  return Array.from(dedup.values());
}

export async function resolveOneSignalTenantConfig(tenantId: string) {
  const config = assertProviderHealth(
    await loadTenantProviderConfig({ tenantId, providerKey: "onesignal" }),
    "onesignal"
  );

  const appId =
    getConfigValue(config.publicConfig, "app_id") ??
    (config.credentialMode === "environment_fallback"
      ? normalizeText(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID)
      : null);
  const safariWebId =
    getConfigValue(config.publicConfig, "safari_web_id") ??
    (config.credentialMode === "environment_fallback"
      ? normalizeText(process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID)
      : null);
  const restApiKey =
    getConfigValue(config.secretConfig, "rest_api_key") ??
    (config.credentialMode === "environment_fallback"
      ? normalizeText(process.env.ONESIGNAL_REST_API_KEY)
      : null);

  if (!appId || !restApiKey) {
    throw new AppError(
      "OneSignal sem app_id/rest_api_key configurados para este tenant.",
      "CONFIG_ERROR",
      500,
      { tenantId, providerKey: "onesignal" }
    );
  }

  return {
    config,
    appId,
    safariWebId,
    restApiKey,
  };
}

export async function resolveGoogleMapsTenantConfig(tenantId: string) {
  const config = assertProviderHealth(
    await loadTenantProviderConfig({ tenantId, providerKey: "google_maps" }),
    "google_maps"
  );

  const apiKey =
    getConfigValue(config.secretConfig, "api_key") ??
    (config.credentialMode === "environment_fallback" || config.credentialMode === "platform_shared"
      ? normalizeText(process.env.GOOGLE_MAPS_API_KEY)
      : null);

  if (!apiKey) {
    throw new AppError(
      "Google Maps sem api_key configurada para este tenant.",
      "CONFIG_ERROR",
      500,
      { tenantId, providerKey: "google_maps" }
    );
  }

  const originAddress =
    getConfigValue(config.publicConfig, "origin_address") ??
    normalizeText(process.env.DISPLACEMENT_ORIGIN_ADDRESS) ??
    "Supermercado Daolio, Centro, Amparo - SP, Brasil";

  return {
    config,
    apiKey,
    originAddress,
  };
}
