import { afterEach, describe, expect, it } from "vitest";
import { resolveMercadoPagoAccessToken } from "./mercadopago-access-token";

const originalAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

afterEach(() => {
  process.env.MERCADOPAGO_ACCESS_TOKEN = originalAccessToken;
});

describe("resolveMercadoPagoAccessToken", () => {
  it("retorna erro quando token não está configurado", () => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;

    const result = resolveMercadoPagoAccessToken();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("MERCADOPAGO_ACCESS_TOKEN ausente");
    }
  });

  it("retorna erro quando token TEST- é usado na Orders API", () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-123456";

    const result = resolveMercadoPagoAccessToken();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Orders API");
    }
  });

  it("retorna token normalizado quando token de produção está válido", () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "  APP_USR-abc123  ";

    const result = resolveMercadoPagoAccessToken();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe("APP_USR-abc123");
    }
  });
});
