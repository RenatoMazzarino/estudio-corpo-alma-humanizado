"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { AppError } from "../../shared/errors/AppError";
import { mapSupabaseError } from "../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import { createClientSchema, updateClientNotesSchema } from "../../shared/validation/clients";
import { createClient, updateClient } from "./repository";

export async function createClientAction(formData: FormData): Promise<void> {
  const name = formData.get("name") as string | null;
  const phone = (formData.get("phone") as string | null) || null;
  const observacoes_gerais = (formData.get("observacoes_gerais") as string | null) || null;

  const parsed = createClientSchema.safeParse({ name, phone, observacoes_gerais });
  if (!parsed.success) {
    throw new AppError("Dados inválidos para cliente", "VALIDATION_ERROR", 400, parsed.error);
  }

  const { data, error } = await createClient({
    name: parsed.data.name,
    phone: parsed.data.phone,
    observacoes_gerais: parsed.data.observacoes_gerais,
    initials: parsed.data.name.slice(0, 2).toUpperCase(),
    tenant_id: FIXED_TENANT_ID,
  });

  const mappedError = mapSupabaseError(error);
  if (mappedError) throw mappedError;
  if (!data) throw new AppError("Cliente não criado", "UNKNOWN", 500);

  redirect("/clientes");
}

export async function updateClientNotes(clientId: string, notes: string): Promise<ActionResult<{ id: string }>> {
  const parsed = updateClientNotesSchema.safeParse({ clientId, notes });
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos para observações", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await updateClient(FIXED_TENANT_ID, clientId, {
    observacoes_gerais: parsed.data.notes || null,
  });

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath(`/clientes/${clientId}`);
  return ok({ id: clientId });
}
