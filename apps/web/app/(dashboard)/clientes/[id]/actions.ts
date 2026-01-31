"use server";

import {
  updateClientNotes as updateClientNotesImpl,
  updateClientProfileAction as updateClientProfileActionImpl,
  deleteClientAction as deleteClientActionImpl,
} from "../../../../src/modules/clients/actions";
import type { ActionResult } from "../../../../src/shared/errors/result";

export async function updateClientNotes(clientId: string, notes: string): Promise<ActionResult<{ id: string }>> {
  return updateClientNotesImpl(clientId, notes);
}

export async function updateClientProfile(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return updateClientProfileActionImpl(formData);
}

export async function deleteClient(clientId: string): Promise<ActionResult<{ id: string }>> {
  return deleteClientActionImpl(clientId);
}
