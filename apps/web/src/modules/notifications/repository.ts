import { createServiceClient } from "../../../lib/supabase/service";
import type { Database } from "../../../lib/supabase/types";

export type NotificationJobInsert = Database["public"]["Tables"]["notification_jobs"]["Insert"];
export type NotificationJobRow = Database["public"]["Tables"]["notification_jobs"]["Row"];
export type NotificationJobUpdate = Database["public"]["Tables"]["notification_jobs"]["Update"];

export async function insertNotificationJob(payload: NotificationJobInsert) {
  const supabase = createServiceClient();
  return supabase.from("notification_jobs").insert(payload).select("*").limit(1).maybeSingle();
}

export async function findPendingNotificationJobDuplicate(params: {
  tenantId: string;
  appointmentId: string | null;
  channel: "whatsapp" | "sms" | "email";
  type: string;
}) {
  const supabase = createServiceClient();
  let query = supabase
    .from("notification_jobs")
    .select("*")
    .eq("tenant_id", params.tenantId)
    .eq("channel", params.channel)
    .eq("type", params.type)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  if (params.appointmentId) {
    query = query.eq("appointment_id", params.appointmentId);
  } else {
    query = query.is("appointment_id", null);
  }

  return query.maybeSingle();
}

export async function listPendingNotificationJobsDue(params: {
  channel?: string;
  limit?: number;
  nowIso?: string;
  appointmentId?: string;
  jobId?: string;
  type?: string;
}) {
  const supabase = createServiceClient();
  const limit = Math.max(1, Math.min(params.limit ?? 20, 100));
  const nowIso = params.nowIso ?? new Date().toISOString();

  let query = supabase
    .from("notification_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (params.channel) {
    query = query.eq("channel", params.channel);
  }
  if (params.appointmentId) {
    query = query.eq("appointment_id", params.appointmentId);
  }
  if (params.jobId) {
    query = query.eq("id", params.jobId);
  }
  if (params.type) {
    query = query.eq("type", params.type);
  }

  return query;
}

export async function updateNotificationJobStatus(params: {
  id: string;
  status: "pending" | "sent" | "failed";
  payload?: NotificationJobUpdate["payload"];
  scheduledFor?: string;
  expectedCurrentStatus?: "pending" | "sent" | "failed";
}) {
  const supabase = createServiceClient();
  let query = supabase
    .from("notification_jobs")
    .update({
      status: params.status,
      payload: params.payload,
      scheduled_for: params.scheduledFor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select("id")
    .limit(1);

  if (params.expectedCurrentStatus) {
    query = query.eq("status", params.expectedCurrentStatus);
  }

  return query.maybeSingle();
}

export async function findNotificationJobByProviderMessageId(providerMessageId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("notification_jobs")
    .select("*")
    .eq("payload->automation->>provider_message_id", providerMessageId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}
