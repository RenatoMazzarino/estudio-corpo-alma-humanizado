"use server";

import { createServiceClient } from "../../../lib/supabase/service";
import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { AppError } from "../../../src/shared/errors/AppError";
import { mapSupabaseError } from "../../../src/shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../src/shared/errors/result";
import { updateClientNotesSchema } from "../../../src/shared/validation/clients";

export async function updateClientNotes(clientId: string, notes: string): Promise<ActionResult<{ id: string }>> {
  const supabase = createServiceClient();

  const parsed = updateClientNotesSchema.safeParse({ clientId, notes });
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos para observações", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await supabase
    .from("clients")
    .update({ observacoes_gerais: parsed.data.notes || null })
    .eq("id", clientId)
    .eq("tenant_id", FIXED_TENANT_ID);

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath(`/clientes/${clientId}`);
  return ok({ id: clientId });
}
