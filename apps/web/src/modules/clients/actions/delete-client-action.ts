import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError } from "../../../shared/errors/AppError";
import { mapSupabaseError } from "../../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../../shared/errors/result";
import { requireDashboardAccessForServerAction } from "../../auth/dashboard-access";
import { deleteClient as deleteClientRepo } from "../repository";

export async function runDeleteClientAction(clientId: string): Promise<ActionResult<{ id: string }>> {
  const { tenantId } = await requireDashboardAccessForServerAction();
  const parsed = z.object({ clientId: z.string().uuid() }).safeParse({ clientId });
  if (!parsed.success) {
    return fail(new AppError("Cliente inválido", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await deleteClientRepo(tenantId, parsed.data.clientId);
  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath("/clientes");
  return ok({ id: parsed.data.clientId });
}
