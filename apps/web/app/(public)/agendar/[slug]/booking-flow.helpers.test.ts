import { describe, expect, it } from "vitest";
import {
  buildMapsQuery,
  buildWhatsAppLink,
  computePixProgress,
  isValidCpfDigits,
  isValidEmailAddress,
  isValidPhoneDigits,
  normalizeCpfDigits,
  normalizePhoneDigits,
  resolveClientHeaderFirstName,
  resolvePositiveMinutes,
  resolvePublicClientFullName,
  resolveSignalPercentage,
} from "./booking-flow.helpers";

describe("booking-flow.helpers", () => {
  it("normaliza telefone e valida dígitos", () => {
    expect(normalizePhoneDigits("(19) 99999-1234")).toBe("19999991234");
    expect(isValidPhoneDigits("19999991234")).toBe(true);
    expect(isValidPhoneDigits("199999")).toBe(false);
  });

  it("normaliza cpf e valida 11 dígitos", () => {
    expect(normalizeCpfDigits("123.456.789-09")).toBe("12345678909");
    expect(isValidCpfDigits("12345678909")).toBe(true);
    expect(isValidCpfDigits("123456")).toBe(false);
  });

  it("valida email e resolve nome público", () => {
    expect(isValidEmailAddress("cliente@email.com")).toBe(true);
    expect(isValidEmailAddress("invalido")).toBe(false);
    expect(
      resolvePublicClientFullName({
        firstName: "Renato",
        lastName: "Mazzarino",
        fallbackName: "Renato",
      })
    ).toBe("Renato Mazzarino");
  });

  it("resolve percentuais e minutos com fallback", () => {
    expect(resolveSignalPercentage(40)).toBe(40);
    expect(resolveSignalPercentage(0)).toBe(30);
    expect(resolvePositiveMinutes(15, 60)).toBe(15);
    expect(resolvePositiveMinutes(null, 60)).toBe(60);
  });

  it("monta link de whatsapp e query de mapa", () => {
    expect(buildWhatsAppLink("(19) 99999-1234")).toContain("wa.me/5519999991234");
    expect(buildMapsQuery(["Rua A", "10", "", "Centro"])).toBe("Rua A, 10, Centro");
  });

  it("calcula progresso do pix", () => {
    const now = Date.now();
    const createdAt = new Date(now - 5 * 60 * 1000).toISOString();
    const expiresAt = new Date(now + 5 * 60 * 1000).toISOString();
    const progress = computePixProgress({ createdAt, expiresAt, nowMs: now });
    expect(progress.remainingMs).toBeGreaterThan(0);
    expect(progress.progressPct).toBeLessThanOrEqual(100);
    expect(progress.isExpired).toBe(false);
  });

  it("resolve primeiro nome para cabeçalho", () => {
    expect(resolveClientHeaderFirstName("Renato Mazzarino")).toBe("Renato");
    expect(resolveClientHeaderFirstName("")).toBe("Visitante");
  });
});
