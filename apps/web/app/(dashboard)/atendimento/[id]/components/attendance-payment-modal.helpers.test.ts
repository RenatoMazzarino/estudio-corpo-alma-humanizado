import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  formatCurrency,
  formatPixTypeLabel,
  normalizePixKeyForCharge,
} from "./attendance-payment-modal.helpers";

describe("attendance-payment-modal.helpers", () => {
  it("formata moeda em pt-BR", () => {
    expect(formatCurrency(123.45)).toContain("123");
  });

  it("formata countdown mm:ss", () => {
    expect(formatCountdown(125)).toBe("02:05");
  });

  it("normaliza chave pix por tipo", () => {
    expect(normalizePixKeyForCharge("12.345.678/0001-99", "cnpj")).toBe("12345678000199");
    expect(normalizePixKeyForCharge("  chave@exemplo.com ", "email")).toBe("chave@exemplo.com");
    expect(normalizePixKeyForCharge("(19) 99999-0000", "phone")).toBe("+19999990000");
  });

  it("formata label de tipo de chave pix", () => {
    expect(formatPixTypeLabel("evp")).toBe("Aleatória (EVP)");
    expect(formatPixTypeLabel("cpf")).toBe("CPF");
    expect(formatPixTypeLabel(null)).toBe("Chave");
  });
});
