import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveMercadoPagoAccessToken } from "./mercadopago-access-token";

const providerResolverMock = vi.fn();

vi.mock("../tenancy/provider-config", () => ({
  resolveMercadoPagoTenantConfig: (...args: unknown[]) => providerResolverMock(...args),
}));

beforeEach(() => {
  providerResolverMock.mockReset();
});

describe("resolveMercadoPagoAccessToken", () => {
  it("retorna erro quando token não está configurado", async () => {
    providerResolverMock.mockResolvedValue({
      accessToken: "",
      publicKey: null,
      webhookSecret: null,
      config: {},
    });

    const result = await resolveMercadoPagoAccessToken("tenant-test");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("MERCADOPAGO_ACCESS_TOKEN ausente");
    }
  });

  it("retorna erro quando token TEST- é usado na Orders API", async () => {
    providerResolverMock.mockResolvedValue({
      accessToken: "TEST-123456",
      publicKey: null,
      webhookSecret: null,
      config: {},
    });

    const result = await resolveMercadoPagoAccessToken("tenant-test");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Orders API");
    }
  });

  it("retorna token normalizado quando token de produção está válido", async () => {
    providerResolverMock.mockResolvedValue({
      accessToken: "  APP_USR-abc123  ",
      publicKey: null,
      webhookSecret: null,
      config: {},
    });

    const result = await resolveMercadoPagoAccessToken("tenant-test");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe("APP_USR-abc123");
    }
  });

  it("retorna erro de config quando resolver do tenant falha", async () => {
    providerResolverMock.mockRejectedValue(new Error("Provider desabilitado"));

    const result = await resolveMercadoPagoAccessToken("tenant-test");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Provider desabilitado");
    }
  });
});
