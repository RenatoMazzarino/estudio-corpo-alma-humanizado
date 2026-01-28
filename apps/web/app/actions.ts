"use server";

import { createClient } from "../lib/supabase/server";
import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../lib/tenant-context";

// Função para INICIAR o atendimento
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

// Função para FINALIZAR o atendimento
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

// Função para CANCELAR o atendimento (Soft Delete)
// Não apagamos do banco, apenas marcamos como 'canceled' para manter histórico
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