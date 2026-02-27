import { describe, expect, it } from "vitest";
import {
  deriveAppointmentPaymentStatus,
  getPayloadMessage,
  mapMercadoPagoUserMessage,
  mapProviderStatusToInternal,
  normalizeMercadoPagoToken,
} from "./mercadopago-orders.helpers";

describe("mercadopago-orders.helpers", () => {
  it("normaliza token removendo aspas e prefixo Bearer", () => {
    expect(normalizeMercadoPagoToken(' "Bearer abc123" ')).toBe("abc123");
    expect(normalizeMercadoPagoToken("'abc123'")).toBe("abc123");
    expect(normalizeMercadoPagoToken("")).toBe("");
  });

  it("mapeia status do provider para status interno", () => {
    expect(mapProviderStatusToInternal("approved")).toBe("paid");
    expect(mapProviderStatusToInternal("accredited")).toBe("paid");
    expect(mapProviderStatusToInternal("failed")).toBe("failed");
    expect(mapProviderStatusToInternal("refunded")).toBe("failed");
    expect(mapProviderStatusToInternal("in_process")).toBe("pending");
  });

  it("resolve status financeiro do agendamento respeitando regras de waived/refunded", () => {
    expect(
      deriveAppointmentPaymentStatus({
        total: 120,
        paidTotal: 0,
        appointmentStatus: "pending",
        currentPaymentStatus: "waived",
      })
    ).toBe("waived");

    expect(
      deriveAppointmentPaymentStatus({
        total: 120,
        paidTotal: 0,
        appointmentStatus: "completed",
        currentPaymentStatus: "refunded",
      })
    ).toBe("refunded");
  });

  it("resolve status financeiro em cenários de pago/parcial/pendente", () => {
    expect(
      deriveAppointmentPaymentStatus({
        total: 100,
        paidTotal: 100,
        appointmentStatus: "pending",
      })
    ).toBe("paid");

    expect(
      deriveAppointmentPaymentStatus({
        total: 100,
        paidTotal: 40,
        appointmentStatus: "pending",
      })
    ).toBe("partial");

    expect(
      deriveAppointmentPaymentStatus({
        total: 100,
        paidTotal: 40,
        appointmentStatus: "completed",
      })
    ).toBe("pending");
  });

  it("extrai mensagem do payload com fallback", () => {
    expect(getPayloadMessage({ message: "erro direto" }, "fallback")).toBe("erro direto");
    expect(getPayloadMessage({ error: "erro secundário" }, "fallback")).toBe("erro secundário");
    expect(getPayloadMessage(null, "fallback")).toBe("fallback");
  });

  it("mapeia mensagem amigável para erro de credencial", () => {
    const result = mapMercadoPagoUserMessage({
      method: "pix",
      status: 401,
      payload: { error: "invalid_credentials" },
      fallback: "fallback",
    });
    expect(result).toBe("Pagamento indisponível no momento. Tente novamente em alguns minutos.");
  });
});
