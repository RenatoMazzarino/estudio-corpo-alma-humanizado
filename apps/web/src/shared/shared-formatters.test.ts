import { describe, expect, it, vi } from "vitest";
import { formatCep, normalizeCep } from "./address/cep";
import { formatCpf, isCpfLengthValid, normalizeCpfDigits } from "./cpf";
import { formatCurrencyInput, formatCurrencyLabel, parseDecimalInput } from "./currency";
import { formatMinutesSeconds, getRemainingSeconds } from "./datetime";
import { formatBrazilPhone, normalizePhoneDigits, phonesMatch } from "./phone";

describe("shared formatters and normalizers", () => {
  it("normaliza e formata CPF", () => {
    expect(normalizeCpfDigits("123.456.789-00")).toBe("12345678900");
    expect(formatCpf("12345678900")).toBe("123.456.789-00");
    expect(isCpfLengthValid("123.456.789-00")).toBe(true);
    expect(isCpfLengthValid("123.456.789-0")).toBe(false);
  });

  it("normaliza e formata CEP", () => {
    expect(normalizeCep("13080-090")).toBe("13080090");
    expect(formatCep("13080090")).toBe("13080-090");
  });

  it("faz parse e formatacao de moeda", () => {
    expect(parseDecimalInput("1.234,56")).toBe(1234.56);
    expect(parseDecimalInput("1234.56")).toBe(1234.56);
    expect(parseDecimalInput("R$ 99,90")).toBe(99.9);
    expect(formatCurrencyInput(99.9)).toBe("99,90");
    expect(formatCurrencyLabel(1234.5)).toBe("1.234,50");
  });

  it("normaliza e compara telefone", () => {
    expect(normalizePhoneDigits("(19) 99999-1111")).toBe("19999991111");
    expect(formatBrazilPhone("19999991111")).toBe("(19) 99999-1111");
    expect(phonesMatch("19999991111", "999991111")).toBe(true);
  });

  it("calcula contagem regressiva de segundos", () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-02-27T12:00:00.000Z").getTime());
    expect(getRemainingSeconds("2026-02-27T12:00:45.000Z")).toBe(45);
    expect(formatMinutesSeconds(65)).toBe("01:05");
    vi.restoreAllMocks();
  });
});
