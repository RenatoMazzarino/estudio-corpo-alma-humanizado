import { beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const reload = async () => {
  vi.resetModules();
  return import("./feature-flags");
};

describe("feature-flags", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.VERCEL_ENV;
    delete process.env.FF_REALTIME_PATCH_MODE;
    delete process.env.FF_EDGE_DISPATCHER_V2;
    delete process.env.FF_PUSH_NOTIFICATIONS;
    delete process.env.FF_LOADING_SYSTEM_V2;
    delete process.env.FF_CANARY_PERCENT;
  });

  it("defaulta para on em development", async () => {
    const flags = await reload();
    expect(flags.getFeatureFlagMode("FF_REALTIME_PATCH_MODE")).toBe("on");
    expect(flags.isFeatureEnabled("FF_REALTIME_PATCH_MODE")).toBe(true);
  });

  it("defaulta para canary em production", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.FF_CANARY_PERCENT = "10";
    const flags = await reload();
    expect(flags.getFeatureFlagMode("FF_EDGE_DISPATCHER_V2")).toBe("canary");
    expect(flags.isFeatureEnabled("FF_EDGE_DISPATCHER_V2")).toBe(false);
    expect(flags.isFeatureEnabled("FF_EDGE_DISPATCHER_V2", { key: "tenant-a", canaryPercent: 100 })).toBe(true);
  });

  it("respeita override explícito on/off", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.FF_PUSH_NOTIFICATIONS = "off";
    process.env.FF_LOADING_SYSTEM_V2 = "on";
    const flags = await reload();
    expect(flags.isFeatureEnabled("FF_PUSH_NOTIFICATIONS", { key: "t" })).toBe(false);
    expect(flags.isFeatureEnabled("FF_LOADING_SYSTEM_V2", { key: "t" })).toBe(true);
  });
});
