import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "../../../../../src/shared/errors/AppError";
import { getDashboardAccessForCurrentUser } from "../../../../../src/modules/auth/dashboard-access";
import { assertTenantPermission } from "../../../../../src/modules/auth/tenant-permissions";
import {
  bootstrapTenantOwner,
  listTenantMemberships,
  updateTenantMembershipRole,
  updateTenantMembershipStatus,
} from "../../../../../src/modules/tenancy/membership-governance";

const bootstrapOwnerSchema = z.object({
  action: z.literal("bootstrap_owner"),
  ownerEmail: z.string().trim().email(),
});

const updateRoleSchema = z.object({
  action: z.literal("update_role"),
  membershipId: z.string().uuid(),
  role: z.enum(["owner", "admin", "staff", "viewer"]),
  reason: z.string().trim().max(240).optional().nullable(),
});

const updateStatusSchema = z.object({
  action: z.literal("update_status"),
  membershipId: z.string().uuid(),
  status: z.enum(["pending", "active", "suspended", "revoked"]),
  reason: z.string().trim().max(240).optional().nullable(),
});

const mutationSchema = z.union([
  bootstrapOwnerSchema,
  updateRoleSchema,
  updateStatusSchema,
]);

export async function GET() {
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertTenantPermission({
      role: access.data.role,
      module: "whitelabel",
      action: "read",
    });

    const memberships = await listTenantMemberships(access.data.tenantId);
    return NextResponse.json({ ok: true, memberships });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: error.status || 500 }
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao listar memberships do tenant.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertTenantPermission({
      role: access.data.role,
      module: "whitelabel",
      action: "manage",
    });

    const payload = mutationSchema.parse(await request.json());
    if (payload.action === "bootstrap_owner") {
      const owner = await bootstrapTenantOwner({
        tenantId: access.data.tenantId,
        ownerEmail: payload.ownerEmail,
        actorEmail: access.data.email,
        actorMembershipId: access.data.membershipId,
      });
      return NextResponse.json({ ok: true, owner });
    }

    if (payload.action === "update_role") {
      const membership = await updateTenantMembershipRole({
        tenantId: access.data.tenantId,
        membershipId: payload.membershipId,
        role: payload.role,
        actorEmail: access.data.email,
        actorMembershipId: access.data.membershipId,
        reason: payload.reason ?? null,
      });
      return NextResponse.json({ ok: true, membership });
    }

    const membership = await updateTenantMembershipStatus({
      tenantId: access.data.tenantId,
      membershipId: payload.membershipId,
      status: payload.status,
      actorEmail: access.data.email,
      actorMembershipId: access.data.membershipId,
      reason: payload.reason ?? null,
    });
    return NextResponse.json({ ok: true, membership });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Payload inválido.", details: error.flatten() },
        { status: 400 }
      );
    }
    if (error instanceof AppError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: error.status || 500 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Falha ao atualizar memberships.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

