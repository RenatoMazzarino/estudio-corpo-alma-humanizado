import "server-only";

import { createServiceClient } from "../../../lib/supabase/service";
import type { Json } from "../../../lib/supabase/types";
import { AppError } from "../../shared/errors/AppError";
import { recordTenantConfigurationAudit } from "./config-audit";
import { assertTenantHasActiveOwner } from "./membership-governance";
import { getTenantProviderHealth } from "./provider-config";

export const TENANT_ONBOARDING_STEPS = [
  "tenant_created",
  "branding",
  "domains",
  "memberships",
  "integrations",
  "validation",
  "activation",
] as const;

export type TenantOnboardingStep = (typeof TENANT_ONBOARDING_STEPS)[number];
export type TenantOnboardingRunStatus = "draft" | "in_progress" | "blocked" | "completed" | "cancelled";

function normalizeStep(step: string): TenantOnboardingStep {
  if ((TENANT_ONBOARDING_STEPS as readonly string[]).includes(step)) {
    return step as TenantOnboardingStep;
  }
  throw new AppError("Etapa de onboarding invalida.", "VALIDATION_ERROR", 400, { step });
}

async function getLatestOnboardingRun(tenantId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tenant_onboarding_runs")
    .select("id, tenant_id, status, current_step, started_by_email, notes, started_at, completed_at, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError("Falha ao consultar onboarding do tenant.", "SUPABASE_ERROR", 500, error);
  }

  return data;
}

export async function startTenantOnboardingRun(params: {
  tenantId: string;
  startedByEmail?: string | null;
  notes?: string | null;
}) {
  const current = await getLatestOnboardingRun(params.tenantId);
  if (current && ["draft", "in_progress", "blocked"].includes(current.status)) {
    return current;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tenant_onboarding_runs")
    .insert({
      tenant_id: params.tenantId,
      status: "in_progress",
      current_step: "tenant_created",
      started_by_email: params.startedByEmail ?? null,
      notes: params.notes ?? null,
      started_at: new Date().toISOString(),
    })
    .select("id, tenant_id, status, current_step, started_by_email, notes, started_at, completed_at, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new AppError("Falha ao iniciar onboarding do tenant.", "SUPABASE_ERROR", 500, error);
  }

  await recordTenantConfigurationAudit({
    tenantId: params.tenantId,
    category: "onboarding",
    sourceModule: "tenancy.onboarding",
    actorEmail: params.startedByEmail ?? null,
    changeSummary: "Onboarding iniciado para o tenant.",
    afterJson: {
      runId: data.id,
      status: data.status,
      currentStep: data.current_step,
    },
  });

  return data;
}

export async function markTenantOnboardingStep(params: {
  tenantId: string;
  step: TenantOnboardingStep | string;
  status: "pending" | "completed" | "skipped" | "blocked";
  performedByEmail?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const step = normalizeStep(params.step);
  const run = await startTenantOnboardingRun({
    tenantId: params.tenantId,
    startedByEmail: params.performedByEmail ?? null,
  });

  const supabase = createServiceClient();
  const metadata = (params.metadata ?? {}) as Json;

  const { error: stepError } = await supabase.from("tenant_onboarding_step_logs").insert({
    onboarding_run_id: run.id,
    tenant_id: params.tenantId,
    step_key: step,
    status: params.status,
    notes: params.notes ?? null,
    performed_by_email: params.performedByEmail ?? null,
    metadata,
  });

  if (stepError) {
    throw new AppError("Falha ao registrar etapa do onboarding.", "SUPABASE_ERROR", 500, stepError);
  }

  const nextRunStatus: TenantOnboardingRunStatus =
    params.status === "blocked"
      ? "blocked"
      : step === "activation" && params.status === "completed"
        ? "completed"
        : "in_progress";

  const { error: runError } = await supabase
    .from("tenant_onboarding_runs")
    .update({
      status: nextRunStatus,
      current_step: step,
      completed_at:
        nextRunStatus === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", run.id)
    .eq("tenant_id", params.tenantId);

  if (runError) {
    throw new AppError("Falha ao atualizar status do onboarding.", "SUPABASE_ERROR", 500, runError);
  }

  await recordTenantConfigurationAudit({
    tenantId: params.tenantId,
    category: "onboarding",
    sourceModule: "tenancy.onboarding",
    actorEmail: params.performedByEmail ?? null,
    changeSummary: `Onboarding step '${step}' marcado como '${params.status}'.`,
    afterJson: {
      runId: run.id,
      step,
      stepStatus: params.status,
      runStatus: nextRunStatus,
    },
  });

  return {
    runId: run.id,
    step,
    status: params.status,
    runStatus: nextRunStatus,
  };
}

async function assertTenantProviderReadyForActivation(tenantId: string) {
  const providerKeys = ["whatsapp_meta", "mercadopago", "onesignal", "google_maps"] as const;
  const healthChecks = await Promise.all(
    providerKeys.map(async (providerKey) => {
      const health = await getTenantProviderHealth(tenantId, providerKey);
      return {
        providerKey,
        issues: health.issues,
      };
    })
  );

  const blockingIssues = healthChecks.filter((item) => item.issues.length > 0);
  if (blockingIssues.length > 0) {
    throw new AppError(
      "Tenant com integracoes inconsistentes para ativacao.",
      "CONFIG_ERROR",
      423,
      { tenantId, blockingIssues }
    );
  }
}

export async function activateTenantIfReady(params: {
  tenantId: string;
  performedByEmail?: string | null;
}) {
  await assertTenantHasActiveOwner(params.tenantId);
  await assertTenantProviderReadyForActivation(params.tenantId);

  const supabase = createServiceClient();
  const { data: tenantBefore, error: readError } = await supabase
    .from("tenants")
    .select("id, status")
    .eq("id", params.tenantId)
    .single();

  if (readError || !tenantBefore) {
    throw new AppError("Falha ao carregar tenant para ativacao.", "SUPABASE_ERROR", 500, readError);
  }

  if (tenantBefore.status === "active") {
    return { alreadyActive: true };
  }

  const { error: updateError } = await supabase
    .from("tenants")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", params.tenantId);

  if (updateError) {
    throw new AppError("Falha ao ativar tenant.", "SUPABASE_ERROR", 500, updateError);
  }

  await markTenantOnboardingStep({
    tenantId: params.tenantId,
    step: "activation",
    status: "completed",
    performedByEmail: params.performedByEmail ?? null,
    notes: "Tenant promovido para active apos validacoes de onboarding.",
  });

  await recordTenantConfigurationAudit({
    tenantId: params.tenantId,
    category: "tenant_status",
    sourceModule: "tenancy.onboarding",
    actorEmail: params.performedByEmail ?? null,
    changeSummary: "Status do tenant alterado para active.",
    beforeJson: { status: tenantBefore.status },
    afterJson: { status: "active" },
  });

  return { alreadyActive: false };
}

export async function listTenantOnboardingHistory(tenantId: string) {
  const supabase = createServiceClient();

  const [runsResult, stepsResult] = await Promise.all([
    supabase
      .from("tenant_onboarding_runs")
      .select("id, tenant_id, status, current_step, started_by_email, notes, started_at, completed_at, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("tenant_onboarding_step_logs")
      .select("id, onboarding_run_id, tenant_id, step_key, status, notes, performed_by_email, metadata, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (runsResult.error) {
    throw new AppError("Falha ao listar runs de onboarding do tenant.", "SUPABASE_ERROR", 500, runsResult.error);
  }

  if (stepsResult.error) {
    throw new AppError("Falha ao listar etapas de onboarding do tenant.", "SUPABASE_ERROR", 500, stepsResult.error);
  }

  return {
    runs: runsResult.data ?? [],
    steps: stepsResult.data ?? [],
  };
}
