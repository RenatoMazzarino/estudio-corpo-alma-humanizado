import "server-only";

import { createServiceClient } from "../../../lib/supabase/service";
import type { Json } from "../../../lib/supabase/types";
import { AppError } from "../../shared/errors/AppError";

export type TenantMembershipRole = "owner" | "admin" | "staff" | "viewer";
export type TenantMembershipStatus = "pending" | "active" | "suspended" | "revoked";

type MembershipRow = {
  id: string;
  tenant_id: string;
  email: string;
  role: TenantMembershipRole;
  is_active: boolean;
  auth_user_id: string | null;
  linked_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function mapStatusToIsActive(status: TenantMembershipStatus) {
  return status === "active";
}

function deriveStatusFromRow(row: MembershipRow): TenantMembershipStatus {
  if (row.is_active) return "active";
  if (!row.auth_user_id && !row.linked_at && !row.last_login_at) return "pending";
  return "suspended";
}

async function insertMembershipAudit(params: {
  tenantId: string;
  dashboardAccessUserId?: string | null;
  actorMembershipId?: string | null;
  actorEmail?: string | null;
  targetEmail?: string | null;
  action: "invite" | "activate" | "suspend" | "revoke" | "role_change" | "owner_bootstrap";
  oldRole?: TenantMembershipRole | null;
  newRole?: TenantMembershipRole | null;
  oldStatus?: TenantMembershipStatus | null;
  newStatus?: TenantMembershipStatus | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const metadata = (params.metadata ?? {}) as Json;
  const supabase = createServiceClient();
  const { error } = await supabase.from("tenant_membership_audit_logs").insert({
    tenant_id: params.tenantId,
    dashboard_access_user_id: params.dashboardAccessUserId ?? null,
    actor_dashboard_access_user_id: params.actorMembershipId ?? null,
    actor_email: params.actorEmail ?? null,
    target_email: params.targetEmail ?? null,
    action: params.action,
    old_role: params.oldRole ?? null,
    new_role: params.newRole ?? null,
    old_is_active:
      params.oldStatus === undefined || params.oldStatus === null
        ? null
        : mapStatusToIsActive(params.oldStatus),
    new_is_active:
      params.newStatus === undefined || params.newStatus === null
        ? null
        : mapStatusToIsActive(params.newStatus),
    reason: params.reason ?? null,
    metadata,
  });

  if (error) {
    throw new AppError("Falha ao registrar auditoria de membership.", "SUPABASE_ERROR", 500, error);
  }
}

export async function listTenantMemberships(tenantId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("dashboard_access_users")
    .select("id, tenant_id, email, role, is_active, auth_user_id, linked_at, last_login_at, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .order("email", { ascending: true });

  if (error) {
    throw new AppError("Falha ao listar memberships do tenant.", "SUPABASE_ERROR", 500, error);
  }

  return ((data ?? []) as MembershipRow[]).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    role: row.role,
    status: deriveStatusFromRow(row),
    isActive: row.is_active,
    linkedAt: row.linked_at,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function bootstrapTenantOwner(params: {
  tenantId: string;
  ownerEmail: string;
  actorEmail?: string | null;
  actorMembershipId?: string | null;
}) {
  const normalizedEmail = normalizeEmail(params.ownerEmail);
  if (!normalizedEmail) {
    throw new AppError("E-mail do owner e obrigatorio.", "VALIDATION_ERROR", 400);
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("dashboard_access_users")
    .upsert(
      {
        tenant_id: params.tenantId,
        email: normalizedEmail,
        role: "owner",
        is_active: true,
        updated_at: now,
      },
      { onConflict: "tenant_id,email" }
    )
    .select("id, tenant_id, email, role, is_active, auth_user_id, linked_at, last_login_at, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new AppError("Falha ao criar owner do tenant.", "SUPABASE_ERROR", 500, error);
  }

  await insertMembershipAudit({
    tenantId: params.tenantId,
    dashboardAccessUserId: data.id,
    actorMembershipId: params.actorMembershipId ?? null,
    actorEmail: params.actorEmail ?? null,
    targetEmail: normalizedEmail,
    action: "owner_bootstrap",
    oldRole: null,
    newRole: "owner",
    oldStatus: null,
    newStatus: "active",
    reason: "Bootstrap do primeiro owner do tenant.",
    metadata: {
      source: "tenant.onboarding",
    },
  });

  return data as MembershipRow;
}

export async function updateTenantMembershipRole(params: {
  tenantId: string;
  membershipId: string;
  role: TenantMembershipRole;
  actorEmail?: string | null;
  actorMembershipId?: string | null;
  reason?: string | null;
}) {
  const supabase = createServiceClient();
  const { data: current, error: currentError } = await supabase
    .from("dashboard_access_users")
    .select("id, tenant_id, email, role, is_active, auth_user_id, linked_at, last_login_at, created_at, updated_at")
    .eq("tenant_id", params.tenantId)
    .eq("id", params.membershipId)
    .maybeSingle();

  if (currentError) {
    throw new AppError("Falha ao carregar membership para troca de perfil.", "SUPABASE_ERROR", 500, currentError);
  }

  if (!current) {
    throw new AppError("Membership nao encontrada no tenant.", "NOT_FOUND", 404);
  }

  const currentRow = current as MembershipRow;
  if (currentRow.role === params.role) {
    return currentRow;
  }

  const { data: updated, error: updateError } = await supabase
    .from("dashboard_access_users")
    .update({ role: params.role, updated_at: new Date().toISOString() })
    .eq("tenant_id", params.tenantId)
    .eq("id", params.membershipId)
    .select("id, tenant_id, email, role, is_active, auth_user_id, linked_at, last_login_at, created_at, updated_at")
    .single();

  if (updateError || !updated) {
    throw new AppError("Falha ao atualizar perfil da membership.", "SUPABASE_ERROR", 500, updateError);
  }

  await insertMembershipAudit({
    tenantId: params.tenantId,
    dashboardAccessUserId: params.membershipId,
    actorMembershipId: params.actorMembershipId ?? null,
    actorEmail: params.actorEmail ?? null,
    targetEmail: currentRow.email,
    action: "role_change",
    oldRole: currentRow.role,
    newRole: params.role,
    oldStatus: deriveStatusFromRow(currentRow),
    newStatus: deriveStatusFromRow(updated as MembershipRow),
    reason: params.reason ?? "Alteracao de perfil da membership.",
  });

  return updated as MembershipRow;
}

export async function updateTenantMembershipStatus(params: {
  tenantId: string;
  membershipId: string;
  status: TenantMembershipStatus;
  actorEmail?: string | null;
  actorMembershipId?: string | null;
  reason?: string | null;
}) {
  const supabase = createServiceClient();
  const { data: current, error: currentError } = await supabase
    .from("dashboard_access_users")
    .select("id, tenant_id, email, role, is_active, auth_user_id, linked_at, last_login_at, created_at, updated_at")
    .eq("tenant_id", params.tenantId)
    .eq("id", params.membershipId)
    .maybeSingle();

  if (currentError) {
    throw new AppError("Falha ao carregar membership para troca de status.", "SUPABASE_ERROR", 500, currentError);
  }

  if (!current) {
    throw new AppError("Membership nao encontrada no tenant.", "NOT_FOUND", 404);
  }

  const currentRow = current as MembershipRow;
  const previousStatus = deriveStatusFromRow(currentRow);
  if (previousStatus === params.status) {
    return currentRow;
  }

  const isActive = mapStatusToIsActive(params.status);
  const { data: updated, error: updateError } = await supabase
    .from("dashboard_access_users")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("tenant_id", params.tenantId)
    .eq("id", params.membershipId)
    .select("id, tenant_id, email, role, is_active, auth_user_id, linked_at, last_login_at, created_at, updated_at")
    .single();

  if (updateError || !updated) {
    throw new AppError("Falha ao atualizar status da membership.", "SUPABASE_ERROR", 500, updateError);
  }

  const action =
    params.status === "active"
      ? "activate"
      : params.status === "revoked"
        ? "revoke"
        : "suspend";

  await insertMembershipAudit({
    tenantId: params.tenantId,
    dashboardAccessUserId: params.membershipId,
    actorMembershipId: params.actorMembershipId ?? null,
    actorEmail: params.actorEmail ?? null,
    targetEmail: currentRow.email,
    action,
    oldRole: currentRow.role,
    newRole: (updated as MembershipRow).role,
    oldStatus: previousStatus,
    newStatus: params.status,
    reason: params.reason ?? "Alteracao de status da membership.",
  });

  return updated as MembershipRow;
}

export async function assertTenantHasActiveOwner(tenantId: string) {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from("dashboard_access_users")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("role", "owner")
    .eq("is_active", true);

  if (error) {
    throw new AppError("Falha ao validar owner ativo do tenant.", "SUPABASE_ERROR", 500, error);
  }

  if (!count || count < 1) {
    throw new AppError("Tenant sem owner ativo. Ative ou crie o owner antes de continuar.", "CONFIG_ERROR", 423, {
      tenantId,
    });
  }
}
