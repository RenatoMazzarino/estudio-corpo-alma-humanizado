"use server";

import { createClient } from "../../../lib/supabase/server";
import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";

export async function updateClientNotes(clientId: string, notes: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("clients")
    .update({ observacoes_gerais: notes || null })
    .eq("id", clientId)
    .eq("tenant_id", FIXED_TENANT_ID);

  if (error) {
    throw new Error("Erro ao atualizar observações do cliente: " + error.message);
  }

  revalidatePath(`/clientes/${clientId}`);
}
