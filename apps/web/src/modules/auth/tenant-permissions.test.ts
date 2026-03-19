import { describe, expect, it } from "vitest";
import { AppError } from "../../shared/errors/AppError";
import {
  assertTenantPermission,
  hasTenantPermission,
  listTenantPermissionMatrix,
  listTenantRolePermissions,
} from "./tenant-permissions";

describe("auth/tenant-permissions", () => {
  it("retorna matriz de permissões com os quatro papéis", () => {
    const matrix = listTenantPermissionMatrix();
    expect(Object.keys(matrix).sort()).toEqual(["admin", "owner", "staff", "viewer"]);
  });

  it("permite ações de manage para owner em whitelabel", () => {
    expect(
      hasTenantPermission({
        role: "owner",
        module: "whitelabel",
        action: "manage",
      })
    ).toBe(true);
  });

  it("nega manage para admin em whitelabel", () => {
    expect(
      hasTenantPermission({
        role: "admin",
        module: "whitelabel",
        action: "manage",
      })
    ).toBe(false);
  });

  it("nega write para viewer em clients", () => {
    expect(
      hasTenantPermission({
        role: "viewer",
        module: "clients",
        action: "write",
      })
    ).toBe(false);
  });

  it("exposição por papel retorna módulos esperados", () => {
    const staff = listTenantRolePermissions("staff");
    expect(staff.finance).toEqual(["read"]);
    expect(staff.whitelabel).toEqual([]);
  });

  it("lança UNAUTHORIZED com status 403 quando não há permissão", () => {
    expect(() =>
      assertTenantPermission({
        role: "viewer",
        module: "settings",
        action: "write",
      })
    ).toThrowError(AppError);

    try {
      assertTenantPermission({
        role: "viewer",
        module: "settings",
        action: "write",
      });
    } catch (error) {
      const appError = error as AppError;
      expect(appError.code).toBe("UNAUTHORIZED");
      expect(appError.status).toBe(403);
    }
  });
});
