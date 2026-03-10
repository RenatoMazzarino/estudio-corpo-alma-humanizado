import { createServiceClient } from "../../../lib/supabase/service";
import { getDashboardAccessForCurrentUser } from "../../../src/modules/auth/dashboard-access";
import { getWhatsAppAutomationRuntimeConfig } from "../../../src/modules/notifications/whatsapp-automation";
import { getTenantWhatsAppDispatchPolicyStatus } from "../../../src/modules/notifications/whatsapp-environment-channel";
import {
  listNotificationTemplateCatalog,
  syncNotificationTemplateCatalogFromLibrary,
  type NotificationTemplateCatalogRow,
} from "../../../src/modules/notifications/whatsapp-template-catalog";
import type { AppointmentMini, AutomationState, JobRow } from "./message-jobs.shared";
import { extractAutomationError } from "./message-jobs.shared";

export * from "./message-jobs.shared";

async function loadAutomationState(tenantId: string): Promise<AutomationState> {
  const runtime = getWhatsAppAutomationRuntimeConfig();
  const supabase = createServiceClient();

  try {
    await syncNotificationTemplateCatalogFromLibrary(tenantId);
  } catch (error) {
    console.warn("[mensagens] Falha ao sincronizar catálogo local de templates:", error);
  }

  const [policyStatus, templateCatalog, latestFailedJob] = await Promise.all([
    getTenantWhatsAppDispatchPolicyStatus(tenantId).catch((error) => ({
      policy: null,
      issues: [error instanceof Error ? error.message : "Falha ao carregar política de envio."],
    })),
    listNotificationTemplateCatalog(tenantId).catch(() => [] as NotificationTemplateCatalogRow[]),
    supabase
      .from("notification_jobs")
      .select("payload, updated_at")
      .eq("tenant_id", tenantId)
      .eq("channel", "whatsapp")
      .eq("status", "failed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const templatesActive = templateCatalog.filter(
    (template) => (template.status ?? "").toLowerCase() === "active"
  ).length;
  const templatesInReview = templateCatalog.filter((template) =>
    ["in_review", "pending", "paused"].includes((template.status ?? "").toLowerCase())
  ).length;
  const templatesOther = Math.max(templateCatalog.length - templatesActive - templatesInReview, 0);
  const latestOperationalError = extractAutomationError(latestFailedJob.data?.payload ?? null);

  return {
    profile: runtime.profile,
    runtimeEnvironment: runtime.runtimeEnvironment,
    senderPhoneNumberId: policyStatus.policy?.senderPhoneNumberId ?? null,
    senderDisplayPhone: policyStatus.policy?.senderDisplayPhone ?? null,
    recipientMode: policyStatus.policy?.recipientMode ?? runtime.recipientMode,
    forcedRecipient:
      policyStatus.policy?.recipientMode === "test_recipient"
        ? policyStatus.policy.testRecipient
        : null,
    templatesTotal: templateCatalog.length,
    templatesActive,
    templatesInReview,
    templatesOther,
    latestOperationalError,
    latestOperationalErrorAt: latestFailedJob.data?.updated_at ?? null,
    failSafeIssues: policyStatus.issues,
    templates: templateCatalog,
  };
}

export async function loadMessagesData() {
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    return {
      jobs: [] as JobRow[],
      appointmentsById: new Map<string, AppointmentMini>(),
      automationState: null as AutomationState | null,
    };
  }

  const supabase = createServiceClient();
  const tenantId = access.data.tenantId;

  const { data: jobsData } = await supabase
    .from("notification_jobs")
    .select("id, appointment_id, type, channel, status, payload, scheduled_for, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .eq("channel", "whatsapp")
    .order("created_at", { ascending: false })
    .limit(80);

  const jobs = ((jobsData ?? []) as unknown as JobRow[]).filter(Boolean);

  const appointmentIds = Array.from(
    new Set(jobs.map((job) => job.appointment_id).filter((id): id is string => Boolean(id)))
  );

  const appointmentsById = new Map<string, AppointmentMini>();
  if (appointmentIds.length > 0) {
    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select("id, service_name, start_time, clients(name)")
      .in("id", appointmentIds);

    for (const row of (appointmentsData ?? []) as unknown as AppointmentMini[]) {
      appointmentsById.set(row.id, row);
    }
  }

  const automationState = await loadAutomationState(tenantId);

  return { jobs, appointmentsById, automationState };
}
