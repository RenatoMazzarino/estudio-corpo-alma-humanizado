import type { DashboardAccessRole } from "./dashboard-access";
import { AppError } from "../../shared/errors/AppError";

export type TenantPermissionModule =
  | "agenda"
  | "clients"
  | "attendance"
  | "messages"
  | "finance"
  | "settings"
  | "whitelabel";

export type TenantPermissionAction = "read" | "write" | "manage";

const PERMISSION_MATRIX: Record<DashboardAccessRole, Record<TenantPermissionModule, TenantPermissionAction[]>> = {
  owner: {
    agenda: ["read", "write", "manage"],
    clients: ["read", "write", "manage"],
    attendance: ["read", "write", "manage"],
    messages: ["read", "write", "manage"],
    finance: ["read", "write", "manage"],
    settings: ["read", "write", "manage"],
    whitelabel: ["read", "write", "manage"],
  },
  admin: {
    agenda: ["read", "write", "manage"],
    clients: ["read", "write", "manage"],
    attendance: ["read", "write", "manage"],
    messages: ["read", "write", "manage"],
    finance: ["read", "write", "manage"],
    settings: ["read", "write", "manage"],
    whitelabel: ["read", "write"],
  },
  staff: {
    agenda: ["read", "write"],
    clients: ["read", "write"],
    attendance: ["read", "write"],
    messages: ["read", "write"],
    finance: ["read"],
    settings: ["read"],
    whitelabel: [],
  },
  viewer: {
    agenda: ["read"],
    clients: ["read"],
    attendance: ["read"],
    messages: ["read"],
    finance: ["read"],
    settings: ["read"],
    whitelabel: [],
  },
};

export function hasTenantPermission(params: {
  role: DashboardAccessRole;
  module: TenantPermissionModule;
  action: TenantPermissionAction;
}) {
  const allowedActions = PERMISSION_MATRIX[params.role][params.module] ?? [];
  return allowedActions.includes(params.action);
}

export function assertTenantPermission(params: {
  role: DashboardAccessRole;
  module: TenantPermissionModule;
  action: TenantPermissionAction;
  message?: string;
}) {
  const allowed = hasTenantPermission(params);
  if (!allowed) {
    throw new AppError(
      params.message ??
        `Permissão insuficiente para ${params.action} em ${params.module}.`,
      "UNAUTHORIZED",
      403,
      {
        role: params.role,
        module: params.module,
        action: params.action,
      }
    );
  }
}

export function listTenantRolePermissions(role: DashboardAccessRole) {
  return PERMISSION_MATRIX[role];
}

export function listTenantPermissionMatrix() {
  return PERMISSION_MATRIX;
}
