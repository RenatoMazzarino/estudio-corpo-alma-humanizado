import { createServiceClient } from "../../../lib/supabase/service";
import type { Database } from "../../../lib/supabase/types";

export type SettingsRow = Database["public"]["Tables"]["settings"]["Row"];

export async function getSettings(tenantId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("settings")
    .select("default_home_buffer, default_studio_buffer")
    .eq("tenant_id", tenantId)
    .single();
}

export async function getTenantBySlug(slug: string) {
  const supabase = createServiceClient();
  return supabase.from("tenants").select("id, name, slug").eq("slug", slug).single();
}
