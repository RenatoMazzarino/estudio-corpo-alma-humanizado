import { createServiceClient } from "../../../lib/supabase/service";
import type { Json } from "../../../lib/supabase/types";

type BasicError = { message?: string } | null;
type MaybeSingleResult<T> = Promise<{ data: T | null; error: BasicError }>;
type RowsResult<T> = Promise<{ data: T[] | null; error: BasicError }>;
type MutationResult = Promise<{ error: BasicError }>;

type PushSubscriptionRow = {
  id: string;
  tenant_id: string;
  external_id: string;
  onesignal_subscription_id: string;
  device_label: string | null;
  platform: string | null;
  last_seen_at: string | null;
  is_active: boolean;
  metadata: Json;
  updated_at: string;
};

type PushSubscriptionsTable = {
  upsert: (payload: unknown, options?: { onConflict?: string }) => {
    select: (columns: string) => {
      maybeSingle: () => MaybeSingleResult<PushSubscriptionRow>;
    };
  };
  update: (payload: unknown) => {
    eq: (column: string, value: unknown) => {
      eq: (column: string, value: unknown) => {
        select: (columns: string) => {
          maybeSingle: () => MaybeSingleResult<PushSubscriptionRow>;
        };
      };
    };
  };
  select: (columns: string) => {
    eq: (column: string, value: unknown) => {
      eq: (column: string, value: unknown) => {
        order: (column: string, options?: { ascending?: boolean }) => {
          limit: (value: number) => RowsResult<Record<string, unknown>>;
        };
      };
    };
  };
};

type NotificationPreferencesTable = {
  upsert: (payload: unknown, options?: { onConflict?: string }) => MutationResult;
  select: (columns: string) => {
    eq: (column: string, value: unknown) => {
      eq: (column: string, value: unknown) => {
        order: (column: string, options?: { ascending?: boolean }) => {
          limit: (value: number) => RowsResult<Record<string, unknown>>;
        };
        in?: (
          column: string,
          values: string[]
        ) => {
          order: (column: string, options?: { ascending?: boolean }) => {
            limit: (value: number) => RowsResult<Record<string, unknown>>;
          };
        };
      };
    };
  };
};

type PushDeliveryAttemptsTable = {
  insert: (payload: unknown) => MutationResult;
};

type PushClient = {
  from: (table: string) => unknown;
};

const asPushClient = () => createServiceClient() as unknown as PushClient;

export async function upsertPushSubscription(params: {
  tenantId: string;
  dashboardAccessUserId: string | null;
  externalId: string;
  oneSignalSubscriptionId: string;
  oneSignalUserId?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
  metadata?: Json;
}) {
  const supabase = asPushClient();
  const table = supabase.from("push_subscriptions") as PushSubscriptionsTable;
  const now = new Date().toISOString();
  const { data, error } = await table
    .upsert(
      {
        tenant_id: params.tenantId,
        dashboard_access_user_id: params.dashboardAccessUserId,
        external_id: params.externalId,
        onesignal_subscription_id: params.oneSignalSubscriptionId,
        onesignal_onesignal_id: params.oneSignalUserId ?? null,
        platform: "web_push",
        user_agent: params.userAgent ?? null,
        device_label: params.deviceLabel ?? null,
        is_active: true,
        last_seen_at: now,
        metadata: params.metadata ?? {},
        updated_at: now,
      },
      { onConflict: "tenant_id,onesignal_subscription_id" }
    )
    .select(
      "id, tenant_id, external_id, onesignal_subscription_id, device_label, platform, last_seen_at, is_active, metadata, updated_at"
    )
    .maybeSingle();

  if (error) throw new Error(`Falha ao salvar inscrição push: ${error.message}`);
  return data;
}

export async function disablePushSubscription(params: {
  tenantId: string;
  oneSignalSubscriptionId: string;
}) {
  const supabase = asPushClient();
  const table = supabase.from("push_subscriptions") as PushSubscriptionsTable;
  const now = new Date().toISOString();
  const { data, error } = await table
    .update({
      is_active: false,
      updated_at: now,
    })
    .eq("tenant_id", params.tenantId)
    .eq("onesignal_subscription_id", params.oneSignalSubscriptionId)
    .select(
      "id, tenant_id, external_id, onesignal_subscription_id, device_label, platform, last_seen_at, is_active, metadata, updated_at"
    )
    .maybeSingle();
  if (error) throw new Error(`Falha ao desativar inscrição push: ${error.message}`);
  return data;
}

export async function listActivePushSubscriptionsForUser(params: {
  tenantId: string;
  externalId: string;
}) {
  const supabase = asPushClient();
  const table = supabase.from("push_subscriptions") as PushSubscriptionsTable;
  const { data, error } = await table
    .select(
      "id, tenant_id, external_id, onesignal_subscription_id, device_label, platform, last_seen_at, is_active, metadata, updated_at"
    )
    .eq("tenant_id", params.tenantId)
    .eq("external_id", params.externalId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(`Falha ao listar assinaturas push: ${error.message}`);
  return (data ?? [])
    .map((row: Record<string, unknown>) => ({
      id: typeof row.id === "string" ? row.id : "",
      oneSignalSubscriptionId:
        typeof row.onesignal_subscription_id === "string" ? row.onesignal_subscription_id : "",
      deviceLabel: typeof row.device_label === "string" ? row.device_label : null,
      platform: typeof row.platform === "string" ? row.platform : null,
      lastSeenAt: typeof row.last_seen_at === "string" ? row.last_seen_at : null,
      updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
      isActive: Boolean(row.is_active),
    }))
    .filter((row) => row.id && row.oneSignalSubscriptionId && row.isActive);
}

export async function upsertNotificationPreference(params: {
  tenantId: string;
  dashboardAccessUserId: string | null;
  externalId: string;
  eventType: string;
  enabled: boolean;
}) {
  const supabase = asPushClient();
  const table = supabase.from("user_notification_preferences") as NotificationPreferencesTable;
  const now = new Date().toISOString();
  const { error } = await table.upsert(
    {
      tenant_id: params.tenantId,
      dashboard_access_user_id: params.dashboardAccessUserId,
      external_id: params.externalId,
      event_type: params.eventType,
      enabled: params.enabled,
      updated_at: now,
    },
    { onConflict: "tenant_id,external_id,event_type" }
  );
  if (error) throw new Error(`Falha ao salvar preferência de notificação: ${error.message}`);
}

export async function listNotificationPreferencesForUser(params: {
  tenantId: string;
  externalId: string;
}) {
  const supabase = asPushClient();
  const table = supabase.from("user_notification_preferences") as NotificationPreferencesTable;
  const { data, error } = await table
    .select("event_type, enabled, updated_at")
    .eq("tenant_id", params.tenantId)
    .eq("external_id", params.externalId)
    .order("event_type", { ascending: true })
    .limit(200);
  if (error) throw new Error(`Falha ao listar preferências de notificação: ${error.message}`);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    eventType: typeof row.event_type === "string" ? row.event_type : "",
    enabled: Boolean(row.enabled),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  }));
}

export async function ensureDefaultNotificationPreferences(params: {
  tenantId: string;
  dashboardAccessUserId: string | null;
  externalId: string;
  eventTypes: string[];
}) {
  for (const eventType of params.eventTypes) {
    if (!eventType.trim()) continue;
    await upsertNotificationPreference({
      tenantId: params.tenantId,
      dashboardAccessUserId: params.dashboardAccessUserId,
      externalId: params.externalId,
      eventType: eventType.trim(),
      enabled: true,
    });
  }
}

export async function listEnabledPushExternalIdsForEvent(params: {
  tenantId: string;
  eventType: string;
}): Promise<string[]> {
  const supabase = asPushClient();
  const subscriptionsTable = supabase.from("push_subscriptions") as PushSubscriptionsTable;
  const subscriptionsResult = await subscriptionsTable
    .select("external_id")
    .eq("tenant_id", params.tenantId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (subscriptionsResult.error) {
    throw new Error(`Falha ao listar inscrições push ativas: ${subscriptionsResult.error.message}`);
  }

  const subscriptionRows = Array.isArray(subscriptionsResult.data)
    ? (subscriptionsResult.data as Array<{ external_id?: unknown }>)
    : [];

  const subscribedExternalIds = Array.from(
    new Set(
      subscriptionRows
        .map((row) => (typeof row.external_id === "string" ? row.external_id.trim() : ""))
        .filter((externalId): externalId is string => externalId.length > 0)
    )
  );

  if (subscribedExternalIds.length === 0) {
    return [];
  }

  const preferenceTable = supabase.from("user_notification_preferences") as NotificationPreferencesTable;
  const preferenceQuery = preferenceTable
    .select("external_id, enabled")
    .eq("tenant_id", params.tenantId)
    .eq("event_type", params.eventType);

  const prefResult =
    typeof preferenceQuery.in === "function"
      ? await preferenceQuery
          .in("external_id", subscribedExternalIds)
          .order("updated_at", { ascending: false })
          .limit(500)
      : null;

  if (!prefResult) return subscribedExternalIds;
  if (prefResult.error) {
    throw new Error(`Falha ao listar preferências de push: ${prefResult.error.message}`);
  }

  const preferenceRows = Array.isArray(prefResult.data)
    ? (prefResult.data as Array<{ external_id?: unknown; enabled?: unknown }>)
    : [];

  const prefMap = new Map<string, boolean>();
  for (const row of preferenceRows) {
    const externalId = typeof row.external_id === "string" ? row.external_id.trim() : "";
    if (!externalId) continue;
    prefMap.set(externalId, Boolean(row.enabled));
  }

  return subscribedExternalIds.filter((externalId) => prefMap.get(externalId) !== false);
}

export async function insertPushDeliveryAttempt(params: {
  tenantId: string;
  outboxId: string | null;
  eventId: string;
  eventType: string;
  correlationId: string;
  status: "queued" | "success" | "failed" | "retry" | "dead";
  providerMessageId?: string | null;
  requestPayload?: Json;
  responsePayload?: Json;
  errorMessage?: string | null;
  attempt?: number;
}) {
  const supabase = asPushClient();
  const table = supabase.from("push_delivery_attempts") as PushDeliveryAttemptsTable;
  const { error } = await table.insert({
    tenant_id: params.tenantId,
    outbox_id: params.outboxId,
    event_id: params.eventId,
    event_type: params.eventType,
    provider: "onesignal",
    provider_message_id: params.providerMessageId ?? null,
    status: params.status,
    correlation_id: params.correlationId,
    attempt: params.attempt ?? 1,
    request_payload: params.requestPayload ?? null,
    response_payload: params.responsePayload ?? null,
    error_message: params.errorMessage ?? null,
    delivered_at: params.status === "success" ? new Date().toISOString() : null,
  });
  if (error) throw new Error(`Falha ao registrar tentativa de push: ${error.message}`);
}
