import { createServiceClient } from "../../../lib/supabase/service";
import type { Database } from "../../../lib/supabase/types";

export type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

export async function listClients(tenantId: string, query?: string) {
  const supabase = createServiceClient();
  let dbQuery = supabase.from("clients").select("*").eq("tenant_id", tenantId).order("name");
  if (query) {
    dbQuery = dbQuery.ilike("name", `%${query}%`);
  }
  return dbQuery;
}

export async function getClientById(tenantId: string, id: string) {
  const supabase = createServiceClient();
  return supabase.from("clients").select("*").eq("id", id).eq("tenant_id", tenantId).single();
}

export async function createClient(payload: ClientInsert) {
  const supabase = createServiceClient();
  return supabase.from("clients").insert(payload).select("id").single();
}

export async function updateClient(tenantId: string, id: string, payload: ClientUpdate) {
  const supabase = createServiceClient();
  return supabase.from("clients").update(payload).eq("id", id).eq("tenant_id", tenantId);
}

export async function findClientByNamePhone(tenantId: string, name: string, phone: string) {
  const supabase = createServiceClient();
  return supabase
    .from("clients")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", name)
    .eq("phone", phone)
    .single();
}

export async function deleteClient(tenantId: string, id: string) {
  const supabase = createServiceClient();
  return supabase.from("clients").delete().eq("id", id).eq("tenant_id", tenantId);
}
