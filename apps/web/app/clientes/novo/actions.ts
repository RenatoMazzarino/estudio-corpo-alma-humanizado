"use server";

import { createClient } from "../../../lib/supabase/server";
import { redirect } from "next/navigation";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";

export async function createClientAction(formData: FormData) {
  const supabase = await createClient();
  
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const observacoes_gerais = (formData.get("observacoes_gerais") as string | null) || null;

  if (!name) {
    throw new Error("Nome é obrigatório");
  }

  const { error } = await supabase.from("clients").insert({
    name,
    phone,
    observacoes_gerais,
    initials: name.slice(0, 2).toUpperCase(),
    tenant_id: FIXED_TENANT_ID
  });

  if (error) {
    throw new Error("Erro ao criar cliente: " + error.message);
  }

  redirect("/clientes");
}
