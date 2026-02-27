import { describe, expect, it } from "vitest";
import {
  isValidEmailAddress,
  normalizeCheckoutDiscountType,
  normalizeCpfDigits,
  parseDecimalInput,
  parseInitialFinanceExtraItems,
  resolveBuffer,
} from "./actions.helpers";

describe("appointments/actions.helpers", () => {
  it("parseia decimal com vírgula e ponto", () => {
    expect(parseDecimalInput("10,50")).toBe(10.5);
    expect(parseDecimalInput("1.234,56")).toBe(1234.56);
    expect(parseDecimalInput("")).toBeNull();
  });

  it("normaliza cpf para 11 dígitos", () => {
    expect(normalizeCpfDigits("123.456.789-09")).toBe("12345678909");
    expect(normalizeCpfDigits("")).toBeNull();
  });

  it("valida email", () => {
    expect(isValidEmailAddress("cliente@dominio.com")).toBe(true);
    expect(isValidEmailAddress("invalido")).toBe(false);
  });

  it("normaliza tipo de desconto", () => {
    expect(normalizeCheckoutDiscountType("pct")).toBe("pct");
    expect(normalizeCheckoutDiscountType("value")).toBe("value");
    expect(normalizeCheckoutDiscountType("x")).toBeNull();
  });

  it("resolve buffer com primeiro valor positivo", () => {
    expect(resolveBuffer(null, 0, 15, 10)).toBe(15);
    expect(resolveBuffer(null, 0, undefined)).toBe(0);
  });

  it("parseia itens extras iniciais de checkout", () => {
    const items = parseInitialFinanceExtraItems(
      JSON.stringify([
        { type: "addon", label: "Óleo", qty: 1, amount: 20 },
        { type: "adjustment", label: "Ajuste", qty: 1, amount: 5 },
        { type: "addon", label: "", qty: 1, amount: 10 },
      ])
    );
    expect(items).toHaveLength(2);
    expect(items[0]?.label).toBe("Óleo");
    expect(items[1]?.type).toBe("adjustment");
  });
});
