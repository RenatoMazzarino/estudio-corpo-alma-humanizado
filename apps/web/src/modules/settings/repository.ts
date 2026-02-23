import { createPublicClient, createServiceClient } from "../../../lib/supabase/service";
import type { Database } from "../../../lib/supabase/types";
import type { PostgrestError } from "@supabase/supabase-js";

export type SettingsRow = Database["public"]["Tables"]["settings"]["Row"];
export type BusinessHourRow = Database["public"]["Tables"]["business_hours"]["Row"];
export type PixPaymentKeyRow = Database["public"]["Tables"]["pix_payment_keys"]["Row"];
export type PixPaymentKeyType = "cnpj" | "cpf" | "email" | "phone" | "evp";

type SettingsMutationResult = { error: PostgrestError | null };

export async function getSettings(tenantId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("settings")
    .select(
      "default_home_buffer, default_studio_buffer, buffer_before_minutes, buffer_after_minutes, signal_percentage, public_base_url, mp_point_enabled, mp_point_terminal_id, mp_point_terminal_name, mp_point_terminal_model, mp_point_terminal_external_id, attendance_checklist_enabled, attendance_checklist_items, spotify_enabled, spotify_playlist_url, spotify_connected_at, spotify_account_id, spotify_account_name, spotify_access_token, spotify_refresh_token, spotify_token_expires_at"
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

export async function updateSettings(
  tenantId: string,
  payload: Partial<SettingsRow>
): Promise<SettingsMutationResult> {
  const supabase = createServiceClient();
  const updateResult = await supabase
    .from("settings")
    .update(payload)
    .eq("tenant_id", tenantId)
    .select("tenant_id");

  if (updateResult.error) return { error: updateResult.error };
  if ((updateResult.data?.length ?? 0) > 0) return { error: null };

  const insertResult = await supabase
    .from("settings")
    .insert({
      tenant_id: tenantId,
      ...payload,
    })
    .select("tenant_id")
    .single();

  return { error: insertResult.error };
}

export async function listPixPaymentKeys(tenantId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("pix_payment_keys")
    .select("id, tenant_id, key_type, key_value, label, is_active, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: true });
}

export async function insertPixPaymentKey(payload: {
  tenantId: string;
  keyType: PixPaymentKeyType;
  keyValue: string;
  label?: string | null;
  isActive?: boolean;
}) {
  const supabase = createServiceClient();
  return supabase
    .from("pix_payment_keys")
    .insert({
      tenant_id: payload.tenantId,
      key_type: payload.keyType,
      key_value: payload.keyValue,
      label: payload.label ?? null,
      is_active: payload.isActive ?? false,
    })
    .select("id, tenant_id, key_type, key_value, label, is_active, created_at, updated_at")
    .single();
}

export async function setAllPixKeysInactive(tenantId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("pix_payment_keys")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId);
}

export async function setPixPaymentKeyActive(tenantId: string, keyId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("pix_payment_keys")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", keyId)
    .select("id")
    .single();
}

export async function activatePixPaymentKeyAtomically(tenantId: string, keyId: string) {
  const supabase = createServiceClient();
  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: PostgrestError | null }>;
  return rpc("activate_pix_payment_key", {
    p_tenant_id: tenantId,
    p_key_id: keyId,
  });
}

export async function deletePixPaymentKey(tenantId: string, keyId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("pix_payment_keys")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", keyId)
    .select("id, is_active")
    .single();
}

export async function deletePixPaymentKeyAndRebalanceAtomically(tenantId: string, keyId: string) {
  const supabase = createServiceClient();
  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{
    data:
      | Array<{
          deleted_was_active: boolean | null;
          next_active_key_id: string | null;
        }>
      | null;
    error: PostgrestError | null;
  }>;
  return rpc("remove_pix_payment_key_and_rebalance", {
    p_tenant_id: tenantId,
    p_key_id: keyId,
  });
}
