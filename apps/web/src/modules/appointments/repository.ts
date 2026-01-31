import { createServiceClient } from "../../../lib/supabase/service";
import type { Database } from "../../../lib/supabase/types";
import type { PostgrestError } from "@supabase/supabase-js";

export type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];
export type AppointmentUpdate = Database["public"]["Tables"]["appointments"]["Update"];

export async function listAppointmentsInRange(tenantId: string, start: string, end: string) {
  const supabase = createServiceClient();
  return supabase
    .from("appointments")
    .select(
      `id, service_name, start_time, finished_at, status, price, is_home_visit, total_duration_minutes,
       clients ( id, name, initials, phone, health_tags, endereco_completo )`
    )
    .eq("tenant_id", tenantId)
    .gte("start_time", start)
    .lte("start_time", end);
}

export async function listCompletedAppointmentsInRange(tenantId: string, start: string, end: string) {
  const supabase = createServiceClient();
  return supabase
    .from("appointments")
    .select(
      `
      id,
      service_name,
      price,
      clients ( name )
    `
    )
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .gte("start_time", start)
    .lte("start_time", end);
}

export async function listAppointmentsForClient(tenantId: string, clientId: string) {
  const supabase = createServiceClient();
  return supabase
    .from("appointments")
    .select("id, start_time, service_name, price, status")
    .eq("client_id", clientId)
    .eq("tenant_id", tenantId)
    .order("start_time", { ascending: false });
}

export async function updateAppointment(tenantId: string, id: string, update: AppointmentUpdate) {
  const supabase = createServiceClient();
  return supabase
    .from("appointments")
    .update(update)
    .eq("id", id)
    .eq("tenant_id", tenantId);
}

export async function updateAppointmentReturning<T = unknown>(
  tenantId: string,
  id: string,
  update: AppointmentUpdate,
  select: string
) {
  const supabase = createServiceClient();
  const response = await supabase
    .from("appointments")
    .update(update)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select(select)
    .single();

  return response as { data: T | null; error: PostgrestError | null };
}

export async function insertAppointment(payload: AppointmentInsert) {
  const supabase = createServiceClient();
  return supabase.from("appointments").insert(payload);
}

export async function listAvailabilityBlocksInRange(tenantId: string, start: string, end: string) {
  const supabase = createServiceClient();
  return supabase
    .from("availability_blocks")
    .select("id, title, start_time, end_time, reason")
    .eq("tenant_id", tenantId)
    .gte("start_time", start)
    .lte("start_time", end);
}

export async function getAppointmentById(tenantId: string, id: string) {
  const supabase = createServiceClient();
  return supabase
    .from("appointments")
    .select(
      `id, service_name, start_time, finished_at, status, price, is_home_visit, total_duration_minutes, actual_duration_minutes,
       address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado,
       clients ( id, name, initials, phone, health_tags, endereco_completo, address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado ),
       services ( duration_minutes )`
    )
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();
}

export async function insertAvailabilityBlocks(
  payload: Database["public"]["Tables"]["availability_blocks"]["Insert"][]
) {
  const supabase = createServiceClient();
  return supabase.from("availability_blocks").insert(payload);
}

export async function deleteAvailabilityBlocksInRange(tenantId: string, start: string, end: string) {
  const supabase = createServiceClient();
  return supabase
    .from("availability_blocks")
    .delete()
    .eq("tenant_id", tenantId)
    .gte("start_time", start)
    .lte("end_time", end);
}
