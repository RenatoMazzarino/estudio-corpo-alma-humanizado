import { createPublicClient, createServiceClient } from "../../../lib/supabase/service";
import type { Database } from "../../../lib/supabase/types";

export type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
export type ServiceInsert = Database["public"]["Tables"]["services"]["Insert"];
export type ServiceUpdate = Database["public"]["Tables"]["services"]["Update"];

export async function listServices(tenantId: string) {
  const supabase = createServiceClient();
  return supabase.from("services").select("*").eq("tenant_id", tenantId).order("name");
}

export async function listPublicServices(tenantId: string) {
  const supabase = createPublicClient();
  return supabase
    .from("services")
    .select("id, name, price, duration_minutes, accepts_home_visit, description, custom_buffer_minutes")
    .eq("tenant_id", tenantId)
    .order("name");
}

export async function getServiceById(id: string) {
  const supabase = createServiceClient();
  return supabase.from("services").select("*").eq("id", id).single();
}

export async function upsertService(tenantId: string, payload: ServiceInsert, id?: string) {
  const supabase = createServiceClient();
  if (id) {
    return supabase.from("services").update(payload).eq("id", id).eq("tenant_id", tenantId);
  }
  return supabase.from("services").insert(payload);
}

export async function deleteService(tenantId: string, id: string) {
  const supabase = createServiceClient();
  return supabase.from("services").delete().eq("id", id).eq("tenant_id", tenantId);
}
