import { createServiceClient } from "../../../lib/supabase/service";
import {
  WHATSAPP_TEMPLATE_LIBRARY,
  type WhatsAppTemplateStatus,
} from "./whatsapp-template-library";
import { createEventCorrelationId } from "../events/outbox";
import { safeEmitDomainEventToOutbox } from "../events/safe-outbox";

export type NotificationTemplateCatalogRow = {
  id: string;
  tenant_id: string;
  channel: string;
  name: string;
  language_code: string | null;
  status: string | null;
  quality: string | null;
  category: string | null;
  provider_template_id: string | null;
  source: string | null;
  last_synced_at: string | null;
  updated_at: string;
};

type CatalogStatus = "active" | "in_review" | "missing";

const STATUS_CACHE_TTL_MS = 30_000;
const statusCache = new Map<string, { expiresAt: number; map: Map<string, CatalogStatus> }>();

const normalizeOptionalText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const mapLocalStatusToCatalogStatus = (status: WhatsAppTemplateStatus) => {
  if (status === "active") return "active";
  return "in_review";
};

const mapCatalogStatusToSelectionStatus = (status: string | null | undefined): CatalogStatus => {
  const normalized = (status ?? "").trim().toLowerCase();
  if (normalized === "active" || normalized === "approved" || normalized === "enabled") {
    return "active";
  }
  if (normalized === "in_review" || normalized === "pending" || normalized === "paused") {
    return "in_review";
  }
  return "missing";
};

const TRACKED_TEMPLATE_FIELDS = new Set([
  "message_template_status_update",
  "message_template_quality_update",
  "template_category_update",
  "message_template_components_update",
]);

type TemplateWebhookUpdate = {
  field: string;
  name: string;
  languageCode: string;
  providerTemplateId: string | null;
  status: string | null;
  quality: string | null;
  category: string | null;
  raw: Record<string, unknown>;
};

const extractEventCandidates = (field: string, changeValue: Record<string, unknown>) => {
  const direct = changeValue[field];
  if (Array.isArray(direct)) {
    return direct
      .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : null))
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }
  if (direct && typeof direct === "object") {
    return [direct as Record<string, unknown>];
  }
  return [changeValue];
};

const extractTemplateName = (event: Record<string, unknown>) =>
  normalizeOptionalText(event.message_template_name) ??
  normalizeOptionalText(event.template_name) ??
  normalizeOptionalText(event.name);

const extractLanguageCode = (event: Record<string, unknown>) =>
  normalizeOptionalText(event.message_template_language) ??
  normalizeOptionalText(event.language_code) ??
  normalizeOptionalText(event.language) ??
  "pt_BR";

const extractProviderTemplateId = (event: Record<string, unknown>) =>
  normalizeOptionalText(event.message_template_id) ??
  normalizeOptionalText(event.template_id) ??
  null;

const normalizeMetaTemplateStatus = (field: string, event: Record<string, unknown>) => {
  if (field !== "message_template_status_update") {
    return null;
  }
  const statusRaw =
    normalizeOptionalText(event.event) ??
    normalizeOptionalText(event.status) ??
    normalizeOptionalText(event.message_template_status);
  if (!statusRaw) return null;
  const normalized = statusRaw.toLowerCase();
  if (
    normalized === "approved" ||
    normalized === "active" ||
    normalized === "enabled" ||
    normalized === "in_quality_assessment"
  ) {
    return "active";
  }
  if (normalized === "pending" || normalized === "in_review") {
    return "in_review";
  }
  if (normalized === "paused") return "paused";
  if (normalized === "disabled") return "disabled";
  if (normalized === "rejected") return "rejected";
  return normalized;
};

const normalizeMetaTemplateQuality = (field: string, event: Record<string, unknown>) => {
  if (field !== "message_template_quality_update") return null;
  const qualityRaw =
    normalizeOptionalText(event.new_quality) ??
    normalizeOptionalText(event.quality) ??
    normalizeOptionalText(event.message_template_quality);
  return qualityRaw ? qualityRaw.toLowerCase() : null;
};

const normalizeMetaTemplateCategory = (field: string, event: Record<string, unknown>) => {
  if (field !== "template_category_update") return null;
  const categoryRaw =
    normalizeOptionalText(event.new_category) ??
    normalizeOptionalText(event.category) ??
    normalizeOptionalText(event.message_template_category);
  return categoryRaw ? categoryRaw.toLowerCase() : null;
};

export function extractTemplateWebhookUpdates(payload: Record<string, unknown>) {
  const entryList = Array.isArray(payload.entry) ? payload.entry : [];
  const updates: TemplateWebhookUpdate[] = [];

  for (const rawEntry of entryList) {
    if (!rawEntry || typeof rawEntry !== "object") continue;
    const entry = rawEntry as Record<string, unknown>;
    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const rawChange of changes) {
      if (!rawChange || typeof rawChange !== "object") continue;
      const change = rawChange as Record<string, unknown>;
      const field = normalizeOptionalText(change.field);
      if (!field || !TRACKED_TEMPLATE_FIELDS.has(field)) continue;
      const changeValue =
        change.value && typeof change.value === "object" && !Array.isArray(change.value)
          ? (change.value as Record<string, unknown>)
          : {};
      for (const event of extractEventCandidates(field, changeValue)) {
        const name = extractTemplateName(event);
        if (!name) continue;
        updates.push({
          field,
          name,
          languageCode: extractLanguageCode(event),
          providerTemplateId: extractProviderTemplateId(event),
          status: normalizeMetaTemplateStatus(field, event),
          quality: normalizeMetaTemplateQuality(field, event),
          category: normalizeMetaTemplateCategory(field, event),
          raw: event,
        });
      }
    }
  }

  return updates;
}

async function listTenantIds() {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("tenants").select("id");
  if (error) {
    throw new Error(`Falha ao carregar tenants para catálogo de templates: ${error.message}`);
  }
  return (data ?? [])
    .map((row) => normalizeOptionalText((row as { id?: string }).id))
    .filter((value): value is string => Boolean(value));
}

export async function syncNotificationTemplateCatalogFromLibrary(tenantId: string) {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const rows = WHATSAPP_TEMPLATE_LIBRARY.map((template) => ({
    tenant_id: tenantId,
    channel: "whatsapp",
    name: template.name,
    body: template.body,
    provider: "meta",
    language_code: template.locale,
    status: mapLocalStatusToCatalogStatus(template.status),
    quality: null,
    category: null,
    provider_template_id: null,
    source: "local_library",
    last_synced_at: nowIso,
    metadata: {
      footer: template.footer,
      status_label: template.statusLabel,
      button: template.button,
      meta_test_url: template.metaTestUrl,
    },
    updated_at: nowIso,
  }));

  const { error } = await supabase
    .from("notification_templates")
    .upsert(rows, { onConflict: "tenant_id,channel,name,language_code" });
  if (error) {
    throw new Error(`Falha ao sincronizar catálogo local de templates: ${error.message}`);
  }
}

export async function syncNotificationTemplateCatalogFromMetaWebhook(payload: Record<string, unknown>) {
  const updates = extractTemplateWebhookUpdates(payload);
  if (updates.length === 0) {
    return { updatesApplied: 0, updatesFound: 0 };
  }

  const tenantIds = await listTenantIds();
  if (tenantIds.length === 0) {
    return { updatesApplied: 0, updatesFound: updates.length };
  }

  const nowIso = new Date().toISOString();
  const rows = tenantIds.flatMap((tenantId) =>
    updates.map((update) => ({
      tenant_id: tenantId,
      channel: "whatsapp",
      name: update.name,
      body: null,
      provider: "meta",
      provider_template_id: update.providerTemplateId,
      language_code: update.languageCode,
      status: update.status ?? "unknown",
      quality: update.quality,
      category: update.category,
      source: "meta_webhook",
      last_synced_at: nowIso,
      metadata: {
        webhook_field: update.field,
        raw_json: JSON.stringify(update.raw),
      },
      updated_at: nowIso,
    }))
  );

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("notification_templates")
    .upsert(rows, { onConflict: "tenant_id,channel,name,language_code" });
  if (error) {
    throw new Error(`Falha ao sincronizar catálogo por webhook Meta: ${error.message}`);
  }

  for (const tenantId of tenantIds) {
    for (const update of updates) {
      const basePayload = {
        template_name: update.name,
        language_code: update.languageCode,
        provider_template_id: update.providerTemplateId,
        status: update.status,
        quality: update.quality,
        category: update.category,
        field: update.field,
      };

      if (update.status) {
        await safeEmitDomainEventToOutbox({
          tenantId,
          eventType: "whatsapp.template.status_changed",
          sourceModule: "notifications.whatsapp-template-catalog",
          correlationId: createEventCorrelationId("wa-template"),
          idempotencyKey: `${tenantId}:${update.name}:${update.languageCode}:status:${update.status}:${nowIso}`,
          payload: basePayload,
        });
      }

      if (update.quality) {
        await safeEmitDomainEventToOutbox({
          tenantId,
          eventType: "whatsapp.template.quality_changed",
          sourceModule: "notifications.whatsapp-template-catalog",
          correlationId: createEventCorrelationId("wa-template"),
          idempotencyKey: `${tenantId}:${update.name}:${update.languageCode}:quality:${update.quality}:${nowIso}`,
          payload: basePayload,
        });
      }
    }
  }

  statusCache.clear();
  return { updatesApplied: rows.length, updatesFound: updates.length };
}

export async function getNotificationTemplateStatusMap(tenantId: string) {
  const cached = statusCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.map;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("notification_templates")
    .select("name, status")
    .eq("tenant_id", tenantId)
    .eq("channel", "whatsapp");
  if (error) {
    throw new Error(`Falha ao carregar status dos templates no catálogo: ${error.message}`);
  }

  const statusMap = new Map<string, CatalogStatus>();
  for (const row of data ?? []) {
    const rowObj = row as { name?: string; status?: string | null };
    const name = normalizeOptionalText(rowObj.name);
    if (!name) continue;
    statusMap.set(name, mapCatalogStatusToSelectionStatus(rowObj.status));
  }

  statusCache.set(tenantId, {
    expiresAt: Date.now() + STATUS_CACHE_TTL_MS,
    map: statusMap,
  });
  return statusMap;
}

export async function listNotificationTemplateCatalog(tenantId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("notification_templates")
    .select(
      "id, tenant_id, channel, name, language_code, status, quality, category, provider_template_id, source, last_synced_at, updated_at"
    )
    .eq("tenant_id", tenantId)
    .eq("channel", "whatsapp")
    .order("name", { ascending: true });
  if (error) {
    throw new Error(`Falha ao listar catálogo de templates: ${error.message}`);
  }
  return (data ?? []) as NotificationTemplateCatalogRow[];
}
