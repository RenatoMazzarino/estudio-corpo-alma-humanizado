"use server";

import type { ActionResult } from "../../shared/errors/result";
import type { ImportContactPayload } from "./actions.helpers";
import { runCreateClientAction } from "./actions/create-client-action";
import { runDeleteClientAction } from "./actions/delete-client-action";
import { runImportClientsFromContacts } from "./actions/import-clients-from-contacts-action";
import { runUpdateClientNotes } from "./actions/update-client-notes-action";
import { runUpdateClientProfileAction } from "./actions/update-client-profile-action";

export async function createClientAction(formData: FormData): Promise<void> {
  return runCreateClientAction(formData);
}

export async function updateClientNotes(clientId: string, notes: string): Promise<ActionResult<{ id: string }>> {
  return runUpdateClientNotes(clientId, notes);
}

export async function updateClientProfileAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runUpdateClientProfileAction(formData);
}

export async function deleteClientAction(clientId: string): Promise<ActionResult<{ id: string }>> {
  return runDeleteClientAction(clientId);
}

export async function importClientsFromContacts(
  contacts: ImportContactPayload[]
): Promise<ActionResult<{ created: number; skipped: number }>> {
  return runImportClientsFromContacts(contacts);
}
