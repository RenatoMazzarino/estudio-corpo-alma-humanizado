"use server";

import { createClient } from "../../../lib/supabase/server";
import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";

export async function updateClientNotes(clientId: string, notes: string) {
  const supabase = await createClient();

  await supabase
    .from("clients")
    .update({ notes })
    .eq("id", clientId)
    .eq("tenant_id", FIXED_TENANT_ID);

  revalidatePath(`/clientes/${clientId}`);
}
