import { createServiceClient } from "../../../lib/supabase/service";
import type { Database } from "../../../lib/supabase/types";

export type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];
export type ClientAddressRow = Database["public"]["Tables"]["client_addresses"]["Row"];
export type ClientAddressInsert = Database["public"]["Tables"]["client_addresses"]["Insert"];
export type ClientPhoneRow = Database["public"]["Tables"]["client_phones"]["Row"];
export type ClientPhoneInsert = Database["public"]["Tables"]["client_phones"]["Insert"];
export type ClientEmailRow = Database["public"]["Tables"]["client_emails"]["Row"];
export type ClientEmailInsert = Database["public"]["Tables"]["client_emails"]["Insert"];
export type ClientHealthItemRow = Database["public"]["Tables"]["client_health_items"]["Row"];
export type ClientHealthItemInsert = Database["public"]["Tables"]["client_health_items"]["Insert"];

export async function listClients(
  tenantId: string,
  query?: string,
  filter?: "vip" | "alert"
) {
  const supabase = createServiceClient();
  let dbQuery = supabase.from("clients").select("*").eq("tenant_id", tenantId).order("name");
  const safeQuery = query?.replace(/[%_,]/g, "").trim();
  if (safeQuery) {
    dbQuery = dbQuery.or(
      [`name.ilike.%${safeQuery}%`, `phone.ilike.%${safeQuery}%`].join(",")
    );
  }
  if (filter === "vip") {
    dbQuery = dbQuery.eq("is_vip", true);
  }
  if (filter === "alert") {
    dbQuery = dbQuery.eq("needs_attention", true);
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

export async function listClientAddresses(tenantId: string, clientId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("client_addresses")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("client_id", clientId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
}

export async function upsertClientAddresses(addresses: ClientAddressInsert[]) {
  const supabase = createServiceClient();
  return supabase.from("client_addresses").upsert(addresses, { onConflict: "id" });
}

export async function listClientPhones(tenantId: string, clientId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("client_phones")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("client_id", clientId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
}

export async function replaceClientPhones(tenantId: string, clientId: string, phones: ClientPhoneInsert[]) {
  const supabase = createServiceClient();
  await supabase.from("client_phones").delete().eq("tenant_id", tenantId).eq("client_id", clientId);
  if (phones.length === 0) return { data: [], error: null };
  return supabase.from("client_phones").insert(phones);
}

export async function listClientEmails(tenantId: string, clientId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("client_emails")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("client_id", clientId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
}

export async function replaceClientEmails(tenantId: string, clientId: string, emails: ClientEmailInsert[]) {
  const supabase = createServiceClient();
  await supabase.from("client_emails").delete().eq("tenant_id", tenantId).eq("client_id", clientId);
  if (emails.length === 0) return { data: [], error: null };
  return supabase.from("client_emails").insert(emails);
}

export async function listClientHealthItems(tenantId: string, clientId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("client_health_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("client_id", clientId)
    .order("type", { ascending: true })
    .order("label", { ascending: true });
}

export async function replaceClientHealthItems(
  tenantId: string,
  clientId: string,
  items: ClientHealthItemInsert[]
) {
  const supabase = createServiceClient();
  await supabase.from("client_health_items").delete().eq("tenant_id", tenantId).eq("client_id", clientId);
  if (items.length === 0) return { data: [], error: null };
  return supabase.from("client_health_items").insert(items);
}
