import { describe, expect, it } from "vitest";
import { PRIMARY_STUDIO_PUBLIC_BASE_URL } from "./defaults";
import {
  buildTenantPublicUrl,
  DEFAULT_TENANT_RUNTIME,
  normalizeTenantBaseUrl,
  normalizeTenantDomain,
} from "./runtime";

describe("tenancy/runtime", () => {
  it("mantém o tenant principal do estúdio como fallback canônico", () => {
    expect(DEFAULT_TENANT_RUNTIME.tenant.slug).toBe("estudio-corpo-alma");
    expect(DEFAULT_TENANT_RUNTIME.branding.displayName).toBe("Estúdio Corpo & Alma Humanizado");
    expect(DEFAULT_TENANT_RUNTIME.publicBaseUrl).toBe(PRIMARY_STUDIO_PUBLIC_BASE_URL);
  });

  it("normaliza base URL removendo path e preservando origem válida", () => {
    expect(normalizeTenantBaseUrl("https://public.corpoealmahumanizado.com.br/agenda")).toBe(
      "https://public.corpoealmahumanizado.com.br"
    );
    expect(normalizeTenantBaseUrl("ftp://invalid.local")).toBeNull();
    expect(normalizeTenantBaseUrl("")).toBeNull();
  });

  it("normaliza domínio removendo porta e caixa alta", () => {
    expect(normalizeTenantDomain("APP.CORPOEALMAHUMANIZADO.COM.BR:443")).toBe(
      "app.corpoealmahumanizado.com.br"
    );
    expect(normalizeTenantDomain(null)).toBeNull();
  });

  it("monta links públicos do tenant principal sem mudar a URL atual", () => {
    expect(buildTenantPublicUrl("/voucher/abc-123")).toBe(
      "https://public.corpoealmahumanizado.com.br/voucher/abc-123"
    );
  });
});
