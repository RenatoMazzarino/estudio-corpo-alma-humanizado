import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "../../../../../src/shared/errors/AppError";
import { getDashboardAccessForCurrentUser } from "../../../../../src/modules/auth/dashboard-access";
import { assertTenantPermission } from "../../../../../src/modules/auth/tenant-permissions";
import {
  activateTenantIfReady,
  listTenantOnboardingHistory,
  markTenantOnboardingStep,
  startTenantOnboardingRun,
} from "../../../../../src/modules/tenancy/onboarding";

const startSchema = z.object({
  action: z.literal("start"),
  notes: z.string().trim().max(300).optional().nullable(),
});

const stepSchema = z.object({
  action: z.literal("step"),
  step: z.enum([
    "tenant_created",
    "branding",
    "domains",
    "memberships",
    "integrations",
    "validation",
    "activation",
  ]),
  status: z.enum(["pending", "completed", "skipped", "blocked"]),
  notes: z.string().trim().max(300).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const activateSchema = z.object({
  action: z.literal("activate"),
});

const mutationSchema = z.union([startSchema, stepSchema, activateSchema]);

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

    const history = await listTenantOnboardingHistory(access.data.tenantId);
    return NextResponse.json({ ok: true, history });
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
        : "Falha ao listar histórico de onboarding.";
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
    if (payload.action === "start") {
      const run = await startTenantOnboardingRun({
        tenantId: access.data.tenantId,
        startedByEmail: access.data.email,
        notes: payload.notes ?? null,
      });
      return NextResponse.json({ ok: true, run });
    }

    if (payload.action === "step") {
      const result = await markTenantOnboardingStep({
        tenantId: access.data.tenantId,
        step: payload.step,
        status: payload.status,
        notes: payload.notes ?? null,
        performedByEmail: access.data.email,
        metadata: payload.metadata ?? {},
      });
      return NextResponse.json({ ok: true, result });
    }

    const activation = await activateTenantIfReady({
      tenantId: access.data.tenantId,
      performedByEmail: access.data.email,
    });
    return NextResponse.json({ ok: true, activation });
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
      error instanceof Error ? error.message : "Falha ao operar onboarding do tenant.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

