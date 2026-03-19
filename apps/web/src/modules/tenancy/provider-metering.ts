import "server-only";

import { createServiceClient } from "../../../lib/supabase/service";
import type { Json } from "../../../lib/supabase/types";
import { AppError } from "../../shared/errors/AppError";
import type { ProviderKey } from "./provider-config";

type BillingModel = "none" | "package" | "usage" | "package_plus_overage";

type UsageProfileRow = {
  id: string;
  tenant_id: string;
  provider_key: ProviderKey;
  billing_model: BillingModel;
  currency: string;
  package_quota: number;
  package_price_cents: number;
  unit_price_cents: number;
  overage_price_cents: number;
  reset_cycle: "daily" | "monthly";
  is_active: boolean;
};

type DailyUsageRow = {
  id: string;
  tenant_id: string;
  provider_key: ProviderKey;
  usage_date: string;
  total_quantity: number;
  event_count: number;
  estimated_cost_cents: number;
  currency: string;
};

const toMoneyInt = (value: number) => Math.max(0, Math.round(value));

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toMonthStart(date: Date) {
  return `${date.toISOString().slice(0, 7)}-01`;
}

function resolveCostFromProfile(params: {
  profile: UsageProfileRow | null;
  quantity: number;
  cumulativeQuantity: number;
}) {
  const profile = params.profile;
  if (!profile || !profile.is_active || profile.billing_model === "none") {
    return 0;
  }

  const quantity = Math.max(0, params.quantity);
  const cumulativeQuantity = Math.max(0, params.cumulativeQuantity);

  if (profile.billing_model === "usage") {
    return toMoneyInt(quantity * profile.unit_price_cents);
  }

  if (profile.billing_model === "package") {
    if (profile.package_quota <= 0) return 0;
    return 0;
  }

  if (profile.billing_model === "package_plus_overage") {
    const previousQuantity = Math.max(0, cumulativeQuantity - quantity);
    const previousOverage = Math.max(0, previousQuantity - profile.package_quota);
    const nextOverage = Math.max(0, cumulativeQuantity - profile.package_quota);
    const incrementalOverage = Math.max(0, nextOverage - previousOverage);
    return toMoneyInt(incrementalOverage * profile.overage_price_cents);
  }

  return 0;
}

async function loadUsageProfile(tenantId: string, providerKey: ProviderKey) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tenant_provider_usage_profiles")
    .select(
      "id, tenant_id, provider_key, billing_model, currency, package_quota, package_price_cents, unit_price_cents, overage_price_cents, reset_cycle, is_active"
    )
    .eq("tenant_id", tenantId)
    .eq("provider_key", providerKey)
    .maybeSingle();

  if (error) {
    throw new AppError("Falha ao carregar perfil de cobranca do tenant.", "SUPABASE_ERROR", 500, error);
  }

  return (data ?? null) as UsageProfileRow | null;
}

async function loadDailyUsage(tenantId: string, providerKey: ProviderKey, usageDate: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tenant_provider_daily_usage")
    .select("id, tenant_id, provider_key, usage_date, total_quantity, event_count, estimated_cost_cents, currency")
    .eq("tenant_id", tenantId)
    .eq("provider_key", providerKey)
    .eq("usage_date", usageDate)
    .maybeSingle();

  if (error) {
    throw new AppError("Falha ao carregar uso diario do tenant.", "SUPABASE_ERROR", 500, error);
  }

  return (data ?? null) as DailyUsageRow | null;
}

export async function registerProviderUsageEvent(params: {
  tenantId: string;
  providerKey: ProviderKey;
  usageKey: string;
  quantity?: number;
  unit?: string;
  correlationId?: string | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}) {
  const quantity = Number.isFinite(Number(params.quantity)) ? Math.max(0, Number(params.quantity)) : 1;
  const occurredAt = params.occurredAt ?? new Date();
  const usageDate = toDateKey(occurredAt);

  const supabase = createServiceClient();
  const metadata = (params.metadata ?? {}) as Json;
  const { error: insertError } = await supabase.from("tenant_provider_metering_events").insert({
    tenant_id: params.tenantId,
    provider_key: params.providerKey,
    usage_key: params.usageKey,
    quantity,
    unit: (params.unit ?? "unit").trim() || "unit",
    occurred_at: occurredAt.toISOString(),
    correlation_id: params.correlationId ?? null,
    idempotency_key: params.idempotencyKey,
    metadata,
  });

  if (insertError) {
    const message = insertError.message?.toLowerCase() ?? "";
    if (message.includes("duplicate") || message.includes("unique")) {
      return {
        duplicated: true,
        usageDate,
      };
    }
    throw new AppError("Falha ao registrar metrica de uso.", "SUPABASE_ERROR", 500, insertError);
  }

  const [profile, daily] = await Promise.all([
    loadUsageProfile(params.tenantId, params.providerKey),
    loadDailyUsage(params.tenantId, params.providerKey, usageDate),
  ]);

  const nextTotalQuantity = Number(daily?.total_quantity ?? 0) + quantity;
  const nextEventCount = Number(daily?.event_count ?? 0) + 1;
  const incrementalCost = resolveCostFromProfile({
    profile,
    quantity,
    cumulativeQuantity: nextTotalQuantity,
  });
  const nextEstimatedCost = Number(daily?.estimated_cost_cents ?? 0) + incrementalCost;

  const { error: upsertError } = await supabase.from("tenant_provider_daily_usage").upsert(
    {
      tenant_id: params.tenantId,
      provider_key: params.providerKey,
      usage_date: usageDate,
      total_quantity: nextTotalQuantity,
      event_count: nextEventCount,
      estimated_cost_cents: nextEstimatedCost,
      currency: profile?.currency ?? "BRL",
    },
    { onConflict: "tenant_id,provider_key,usage_date" }
  );

  if (upsertError) {
    throw new AppError("Falha ao atualizar consolidado diario de uso.", "SUPABASE_ERROR", 500, upsertError);
  }

  return {
    duplicated: false,
    usageDate,
    quantity,
    incrementalCostCents: incrementalCost,
  };
}

export async function closeProviderMonthlySnapshot(params: {
  tenantId: string;
  providerKey: ProviderKey;
  referenceDate?: Date;
}) {
  const referenceDate = params.referenceDate ?? new Date();
  const monthStart = toMonthStart(referenceDate);

  const supabase = createServiceClient();
  const { data: dailyRows, error: dailyError } = await supabase
    .from("tenant_provider_daily_usage")
    .select("total_quantity, estimated_cost_cents")
    .eq("tenant_id", params.tenantId)
    .eq("provider_key", params.providerKey)
    .gte("usage_date", monthStart)
    .lte("usage_date", toDateKey(referenceDate));

  if (dailyError) {
    throw new AppError("Falha ao consolidar uso mensal.", "SUPABASE_ERROR", 500, dailyError);
  }

  const profile = await loadUsageProfile(params.tenantId, params.providerKey);
  const totalQuantity = (dailyRows ?? []).reduce((acc, row) => acc + Number(row.total_quantity ?? 0), 0);
  const estimatedCostCents = (dailyRows ?? []).reduce(
    (acc, row) => acc + Number(row.estimated_cost_cents ?? 0),
    0
  );

  const packageQuota = Number(profile?.package_quota ?? 0);
  const includedQuantity = Math.min(totalQuantity, packageQuota);
  const overageQuantity = Math.max(0, totalQuantity - packageQuota);

  const { error: upsertError } = await supabase.from("tenant_provider_monthly_snapshots").upsert(
    {
      tenant_id: params.tenantId,
      provider_key: params.providerKey,
      period_month: monthStart,
      total_quantity: totalQuantity,
      package_quota: packageQuota,
      included_quantity: includedQuantity,
      overage_quantity: overageQuantity,
      estimated_cost_cents: estimatedCostCents,
      final_cost_cents: estimatedCostCents,
      currency: profile?.currency ?? "BRL",
      status: "closed",
      closed_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,provider_key,period_month" }
  );

  if (upsertError) {
    throw new AppError("Falha ao fechar snapshot mensal do provider.", "SUPABASE_ERROR", 500, upsertError);
  }

  return {
    periodMonth: monthStart,
    totalQuantity,
    estimatedCostCents,
    overageQuantity,
  };
}

export async function getTenantProviderUsageSummary(tenantId: string) {
  const supabase = createServiceClient();

  const [profilesResult, dailyResult, monthlyResult] = await Promise.all([
    supabase
      .from("tenant_provider_usage_profiles")
      .select(
        "tenant_id, provider_key, billing_model, currency, package_quota, package_price_cents, unit_price_cents, overage_price_cents, reset_cycle, is_active"
      )
      .eq("tenant_id", tenantId)
      .order("provider_key", { ascending: true }),
    supabase
      .from("tenant_provider_daily_usage")
      .select("provider_key, usage_date, total_quantity, event_count, estimated_cost_cents, currency")
      .eq("tenant_id", tenantId)
      .order("usage_date", { ascending: false })
      .limit(60),
    supabase
      .from("tenant_provider_monthly_snapshots")
      .select(
        "provider_key, period_month, total_quantity, package_quota, included_quantity, overage_quantity, estimated_cost_cents, final_cost_cents, currency, status, closed_at"
      )
      .eq("tenant_id", tenantId)
      .order("period_month", { ascending: false })
      .limit(24),
  ]);

  if (profilesResult.error) {
    throw new AppError("Falha ao listar perfis de cobranca do tenant.", "SUPABASE_ERROR", 500, profilesResult.error);
  }

  if (dailyResult.error) {
    throw new AppError("Falha ao listar uso diario do tenant.", "SUPABASE_ERROR", 500, dailyResult.error);
  }

  if (monthlyResult.error) {
    throw new AppError("Falha ao listar snapshots mensais do tenant.", "SUPABASE_ERROR", 500, monthlyResult.error);
  }

  return {
    profiles: profilesResult.data ?? [],
    dailyUsage: dailyResult.data ?? [],
    monthlySnapshots: monthlyResult.data ?? [],
  };
}
