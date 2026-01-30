"use server";

import { updateClientNotes as updateClientNotesImpl } from "../../../src/modules/clients/actions";
import type { ActionResult } from "../../../src/shared/errors/result";

export async function updateClientNotes(clientId: string, notes: string): Promise<ActionResult<{ id: string }>> {
  return updateClientNotesImpl(clientId, notes);
}
