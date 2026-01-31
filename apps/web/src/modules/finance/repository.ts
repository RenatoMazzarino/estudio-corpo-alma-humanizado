import { createServiceClient } from "../../../lib/supabase/service";
import type { Database } from "../../../lib/supabase/types";

export type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

export async function listTransactionsInRange(tenantId: string, start: string, end: string) {
  const supabase = createServiceClient();
  return supabase
    .from("transactions")
    .select("id, appointment_id, description, amount, type, payment_method, created_at")
    .eq("tenant_id", tenantId)
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: true });
}

export async function insertTransaction(payload: TransactionInsert) {
  const supabase = createServiceClient();
  return supabase.from("transactions").insert(payload);
}

export async function getTransactionByAppointmentId(tenantId: string, appointmentId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("transactions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("appointment_id", appointmentId)
    .limit(1)
    .maybeSingle();
}
