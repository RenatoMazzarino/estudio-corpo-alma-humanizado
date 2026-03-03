import { revalidatePath } from "next/cache";
import { AppError } from "../../../shared/errors/AppError";
import { mapSupabaseError } from "../../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../shared/errors/result";
import { updateClientNotesSchema } from "../../../shared/validation/clients";
import { requireDashboardAccessForServerAction } from "../../auth/dashboard-access";
import { updateClient } from "../repository";

export async function runUpdateClientNotes(
  clientId: string,
  notes: string
): Promise<ActionResult<{ id: string }>> {
  const { tenantId } = await requireDashboardAccessForServerAction();
  const parsed = updateClientNotesSchema.safeParse({ clientId, notes });
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos para observações", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await updateClient(tenantId, clientId, {
    observacoes_gerais: parsed.data.notes || null,
  });

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath(`/clientes/${clientId}`);
  return ok({ id: clientId });
}
