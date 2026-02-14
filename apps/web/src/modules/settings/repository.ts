import { createPublicClient, createServiceClient } from "../../../lib/supabase/service";
import type { Database } from "../../../lib/supabase/types";

export type SettingsRow = Database["public"]["Tables"]["settings"]["Row"];
export type BusinessHourRow = Database["public"]["Tables"]["business_hours"]["Row"];

export async function getSettings(tenantId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("settings")
    .select(
      "default_home_buffer, default_studio_buffer, buffer_before_minutes, buffer_after_minutes, signal_percentage, public_base_url, mp_point_enabled, mp_point_terminal_id, mp_point_terminal_name, mp_point_terminal_model, mp_point_terminal_external_id, attendance_checklist_enabled, attendance_checklist_items"
    )
    .eq("tenant_id", tenantId)
    .single();
}

export async function getTenantBySlug(slug: string) {
  const supabase = createPublicClient();
  return supabase.from("tenants").select("id, name, slug").eq("slug", slug).single();
}

export async function listBusinessHours(tenantId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("business_hours")
    .select("id, day_of_week, open_time, close_time, is_closed")
    .eq("tenant_id", tenantId)
    .order("day_of_week", { ascending: true });
}

export async function upsertBusinessHours(
  payload: Database["public"]["Tables"]["business_hours"]["Insert"][]
) {
  const supabase = createServiceClient();
  return supabase.from("business_hours").upsert(payload, { onConflict: "tenant_id,day_of_week" });
}

export async function deleteInvalidBusinessHours(tenantId: string) {
  const supabase = createServiceClient();
  return supabase.from("business_hours").delete().eq("tenant_id", tenantId).is("day_of_week", null);
}

export async function updateSettings(tenantId: string, payload: Partial<SettingsRow>) {
  const supabase = createServiceClient();
  return supabase.from("settings").update(payload).eq("tenant_id", tenantId);
}
