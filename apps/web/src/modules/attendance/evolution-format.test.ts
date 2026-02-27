import { describe, expect, it } from "vitest";
import { fallbackStructuredEvolution } from "./evolution-format";

describe("fallbackStructuredEvolution", () => {
  it("returns empty string for blank input", () => {
    expect(fallbackStructuredEvolution("   ")).toBe("");
  });

  it("builds a structured template using normalized input", () => {
    const result = fallbackStructuredEvolution(" Dor cervical e tensão ");
    expect(result).toContain("Queixa principal:");
    expect(result).toContain("Dor cervical e tensão");
    expect(result).toContain("Conduta aplicada:");
    expect(result).toContain("Resposta do cliente:");
    expect(result).toContain("Recomendação:");
  });
});
