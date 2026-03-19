import "server-only";

import { createServiceClient } from "../../../lib/supabase/service";
import type { Json } from "../../../lib/supabase/types";
import { AppError } from "../../shared/errors/AppError";

export type TenantAuditCategory =
  | "branding"
  | "domains"
  | "feature_flags"
  | "provider_config"
  | "billing_profile"
  | "membership"
  | "tenant_status"
  | "onboarding";

export async function recordTenantConfigurationAudit(params: {
  tenantId: string;
  category: TenantAuditCategory;
  sourceModule: string;
  changeSummary: string;
  actorEmail?: string | null;
  actorDashboardAccessUserId?: string | null;
  correlationId?: string | null;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
}) {
  const beforeJson = (params.beforeJson ?? null) as Json | null;
  const afterJson = (params.afterJson ?? null) as Json | null;
  const supabase = createServiceClient();
  const { error } = await supabase.from("tenant_configuration_audit_logs").insert({
    tenant_id: params.tenantId,
    category: params.category,
    actor_email: params.actorEmail ?? null,
    actor_dashboard_access_user_id: params.actorDashboardAccessUserId ?? null,
    source_module: params.sourceModule,
    change_summary: params.changeSummary,
    before_json: beforeJson,
    after_json: afterJson,
    correlation_id: params.correlationId ?? null,
  });

  if (error) {
    throw new AppError("Falha ao registrar auditoria de configuracao do tenant.", "SUPABASE_ERROR", 500, error);
  }
}

export async function listTenantConfigurationAuditLogs(tenantId: string, limit = 100) {
  const normalizedLimit = Number.isFinite(limit) ? Math.min(500, Math.max(1, Math.trunc(limit))) : 100;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tenant_configuration_audit_logs")
    .select(
      "id, tenant_id, category, actor_email, actor_dashboard_access_user_id, source_module, change_summary, before_json, after_json, correlation_id, created_at"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(normalizedLimit);

  if (error) {
    throw new AppError("Falha ao listar auditoria de configuracao do tenant.", "SUPABASE_ERROR", 500, error);
  }

  return data ?? [];
}
