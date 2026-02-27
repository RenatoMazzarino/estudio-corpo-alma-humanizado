import { describe, expect, it } from "vitest";
import { buildClientReferenceCode, buildServiceReferenceCode } from "./appointment-reference";

describe("appointment-reference helpers", () => {
  it("gera código de serviço a partir do nome do procedimento", () => {
    expect(buildServiceReferenceCode("Drenagem Linfática")).toBe("DL");
    expect(buildServiceReferenceCode("Massagem")).toBe("MA");
    expect(buildServiceReferenceCode(null)).toBe("AT");
  });

  it("gera código de cliente por nome, telefone ou fallback de id", () => {
    expect(buildClientReferenceCode({ clientName: "Renato Mazzarino", appointmentId: "abc123" })).toBe("NRM");
    expect(buildClientReferenceCode({ phone: "(19) 99999-1234", appointmentId: "abc123" })).toBe("T1234");
    expect(buildClientReferenceCode({ appointmentId: "pay_01kjb" })).toBe("AKJB");
  });
});
