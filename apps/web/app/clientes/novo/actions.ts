"use server";

import { createClient } from "../../../lib/supabase/server";
import { redirect } from "next/navigation";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";

export async function createClientAction(formData: FormData) {
  const supabase = await createClient();
  
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const notes = formData.get("notes") as string;

  if (!name) {
    throw new Error("Nome é obrigatório");
  }

  await supabase.from("clients").insert({
    name,
    phone,
    notes,
    initials: name.slice(0, 2).toUpperCase(),
    tenant_id: FIXED_TENANT_ID
  });

  redirect("/clientes");
}
