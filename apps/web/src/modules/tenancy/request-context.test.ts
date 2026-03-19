import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDashboardAccessForCurrentUser } from "../auth/dashboard-access";
import { getTenantRuntimeConfigByDomain, getTenantRuntimeConfigBySlug } from "./runtime";
import { resolveTenantIdForRequestContext } from "./request-context";

vi.mock("../auth/dashboard-access", () => ({
  getDashboardAccessForCurrentUser: vi.fn(),
}));

vi.mock("./runtime", async () => {
  const actual = await vi.importActual<typeof import("./runtime")>("./runtime");
  return {
    ...actual,
    getTenantRuntimeConfigBySlug: vi.fn(),
    getTenantRuntimeConfigByDomain: vi.fn(),
  };
});

const mockedDashboardAccess = vi.mocked(getDashboardAccessForCurrentUser);
const mockedRuntimeBySlug = vi.mocked(getTenantRuntimeConfigBySlug);
const mockedRuntimeByDomain = vi.mocked(getTenantRuntimeConfigByDomain);

describe("tenancy/request-context", () => {
  beforeEach(() => {
    mockedDashboardAccess.mockReset();
    mockedRuntimeBySlug.mockReset();
    mockedRuntimeByDomain.mockReset();
    mockedDashboardAccess.mockResolvedValue({ ok: false, reason: "unauthenticated" });
    mockedRuntimeBySlug.mockResolvedValue(null);
    mockedRuntimeByDomain.mockResolvedValue(null);
  });

  it("prioriza tenantId explícito quando válido", async () => {
    const request = new Request("https://example.com/api/displacement-fee");
    const tenantId = "6f5f5004-7a58-4ab8-9c3c-5d6764ad2e01";

    const resolved = await resolveTenantIdForRequestContext({
      request,
      tenantId,
    });

    expect(resolved).toBe(tenantId);
    expect(mockedDashboardAccess).not.toHaveBeenCalled();
    expect(mockedRuntimeBySlug).not.toHaveBeenCalled();
    expect(mockedRuntimeByDomain).not.toHaveBeenCalled();
  });

  it("usa tenant da sessão de dashboard quando permitido", async () => {
    const request = new Request("https://example.com/api/push/test");
    mockedDashboardAccess.mockResolvedValue({
      ok: true,
      data: {
        tenantId: "dccf4492-9576-479c-8594-2795bd6b81d7",
      },
    } as never);

    const resolved = await resolveTenantIdForRequestContext({
      request,
    });

    expect(resolved).toBe("dccf4492-9576-479c-8594-2795bd6b81d7");
    expect(mockedRuntimeBySlug).not.toHaveBeenCalled();
    expect(mockedRuntimeByDomain).not.toHaveBeenCalled();
  });

  it("resolve por slug quando não há sessão", async () => {
    const request = new Request("https://public.example.com/api/address-search?q=rua");
    mockedRuntimeBySlug.mockResolvedValue({
      tenant: { id: "11111111-1111-4111-8111-111111111111" },
    } as never);

    const resolved = await resolveTenantIdForRequestContext({
      request,
      tenantSlug: "salao-aurora-demo",
      allowDashboardSession: false,
    });

    expect(resolved).toBe("11111111-1111-4111-8111-111111111111");
    expect(mockedRuntimeBySlug).toHaveBeenCalledWith("salao-aurora-demo");
    expect(mockedRuntimeByDomain).not.toHaveBeenCalled();
  });

  it("resolve por domínio quando slug não resolve", async () => {
    const request = new Request("https://public-salao-aurora-demo.vercel.app/api/address-details?placeId=abc");
    mockedRuntimeByDomain.mockResolvedValue({
      tenant: { id: "22222222-2222-4222-8222-222222222222" },
    } as never);

    const resolved = await resolveTenantIdForRequestContext({
      request,
      allowDashboardSession: false,
    });

    expect(resolved).toBe("22222222-2222-4222-8222-222222222222");
    expect(mockedRuntimeByDomain).toHaveBeenCalledWith("public-salao-aurora-demo.vercel.app");
  });

  it("retorna null quando não consegue resolver", async () => {
    const request = new Request("https://unknown.example.com/api/displacement-fee");

    const resolved = await resolveTenantIdForRequestContext({
      request,
      allowDashboardSession: false,
    });

    expect(resolved).toBeNull();
  });
});
