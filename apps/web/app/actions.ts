"use server";

import { createClient } from "../lib/supabase/server";
import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../lib/tenant-context";

// --- SERVIÇOS ---

export async function upsertService(formData: FormData) {
  const supabase = await createClient();

  // Campos existentes
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const price = parseFloat(formData.get("price") as string);
  const duration_minutes = parseInt(formData.get("duration_minutes") as string);

  // Novos campos adicionados
  const accepts_home_visit = formData.get("accepts_home_visit") === "on";
  const home_visit_fee = parseFloat(formData.get("home_visit_fee") as string) || 0;
  const custom_buffer_minutes = parseInt(formData.get("custom_buffer_minutes") as string) || 0;

  const description = formData.get("description") as string;
  
  const payload = {
    name,
    description,
    price,
    duration_minutes,
    accepts_home_visit,
    home_visit_fee,
    custom_buffer_minutes,
    tenant_id: FIXED_TENANT_ID,
  };

  const { error } = id 
    ? await supabase.from("services").update(payload).eq("id", id)
    : await supabase.from("services").insert(payload);

  if (error) {
    throw new Error("Erro ao salvar serviço: " + error.message);
  }

  revalidatePath("/catalogo"); 
  revalidatePath("/admin/servicos"); 
}

export async function deleteService(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("tenant_id", FIXED_TENANT_ID);

  if (error) {
    throw new Error("Erro ao remover serviço: " + error.message);
  }

  revalidatePath("/catalogo");
  revalidatePath("/admin/servicos");
}

// --- AGENDAMENTOS (Mantidos) ---

export async function startAppointment(id: string) {
  const supabase = await createClient();
  
  await supabase
    .from("appointments")
    .update({ 
      status: "in_progress",
      started_at: new Date().toISOString() // Salva a hora exata do clique
    })
    .eq("id", id)
    .eq("tenant_id", FIXED_TENANT_ID);

  revalidatePath("/"); // Atualiza a tela instantaneamente
}

export async function finishAppointment(id: string) {
  const supabase = await createClient();
  
  await supabase
    .from("appointments")
    .update({ 
      status: "done",
      finished_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("tenant_id", FIXED_TENANT_ID);

  revalidatePath("/");
}

export async function cancelAppointment(id: string) {
  const supabase = await createClient();
  
  await supabase
    .from("appointments")
    .update({ 
      status: "canceled"
    })
    .eq("id", id)
    .eq("tenant_id", FIXED_TENANT_ID);

  revalidatePath("/");
  revalidatePath("/caixa"); // Atualiza também o caixa se precisar
}