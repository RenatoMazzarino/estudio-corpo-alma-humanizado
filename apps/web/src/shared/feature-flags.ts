export type RuntimeEnvironment = "development" | "preview" | "production";
export type FeatureFlagMode = "on" | "off" | "canary";

type FeatureFlagName =
  | "FF_REALTIME_PATCH_MODE"
  | "FF_EDGE_DISPATCHER_V2"
  | "FF_PUSH_NOTIFICATIONS"
  | "FF_LOADING_SYSTEM_V2";

type FeatureFlagConfig = {
  name: FeatureFlagName;
  mode: FeatureFlagMode;
};

const normalizeText = (value: string | undefined) => value?.trim().toLowerCase() ?? "";

const parseMode = (value: string | undefined, fallback: FeatureFlagMode): FeatureFlagMode => {
  const normalized = normalizeText(value);
  if (normalized === "on" || normalized === "true" || normalized === "enabled" || normalized === "1") {
    return "on";
  }
  if (normalized === "off" || normalized === "false" || normalized === "disabled" || normalized === "0") {
    return "off";
  }
  if (normalized === "canary" || normalized === "gradual" || normalized === "rollout") {
    return "canary";
  }
  return fallback;
};

const resolveRuntimeEnvironment = (): RuntimeEnvironment => {
  const normalized = normalizeText(process.env.VERCEL_ENV);
  if (normalized === "production") return "production";
  if (normalized === "preview") return "preview";
  return "development";
};

const defaultModeByEnvironment = (environment: RuntimeEnvironment): FeatureFlagMode => {
  if (environment === "production") return "canary";
  return "on";
};

const buildFlagConfig = (name: FeatureFlagName): FeatureFlagConfig => {
  const environment = resolveRuntimeEnvironment();
  const fallback = defaultModeByEnvironment(environment);
  return {
    name,
    mode: parseMode(process.env[name], fallback),
  };
};

const stableHash = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const normalizeCanaryPercent = (value: string | undefined, fallback = 10) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.trunc(parsed)));
};

export const RUNTIME_ENVIRONMENT = resolveRuntimeEnvironment();

export const FEATURE_FLAGS: Record<FeatureFlagName, FeatureFlagConfig> = {
  FF_REALTIME_PATCH_MODE: buildFlagConfig("FF_REALTIME_PATCH_MODE"),
  FF_EDGE_DISPATCHER_V2: buildFlagConfig("FF_EDGE_DISPATCHER_V2"),
  FF_PUSH_NOTIFICATIONS: buildFlagConfig("FF_PUSH_NOTIFICATIONS"),
  FF_LOADING_SYSTEM_V2: buildFlagConfig("FF_LOADING_SYSTEM_V2"),
};

export function isFeatureEnabled(
  name: FeatureFlagName,
  options?: {
    /** Deterministic bucket key for canary rollout (tenantId/userId/appointmentId). */
    key?: string | null;
    /** Override canary percent for one decision point. */
    canaryPercent?: number;
  }
) {
  const config = FEATURE_FLAGS[name];
  if (config.mode === "on") return true;
  if (config.mode === "off") return false;

  const percent = Math.max(
    0,
    Math.min(
      100,
      Math.trunc(options?.canaryPercent ?? normalizeCanaryPercent(process.env.FF_CANARY_PERCENT, 10))
    )
  );
  if (percent <= 0) return false;
  if (percent >= 100) return true;

  const key = (options?.key ?? "").trim();
  if (!key) {
    // Without deterministic key, canary defaults to off in production-safe mode.
    return RUNTIME_ENVIRONMENT !== "production";
  }

  return stableHash(`${name}:${key}`) % 100 < percent;
}

export function getFeatureFlagMode(name: FeatureFlagName) {
  return FEATURE_FLAGS[name].mode;
}

export type { FeatureFlagName };
