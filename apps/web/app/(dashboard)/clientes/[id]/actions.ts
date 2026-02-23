"use server";

import {
  updateClientNotes as updateClientNotesImpl,
  updateClientProfileAction as updateClientProfileActionImpl,
  deleteClientAction as deleteClientActionImpl,
} from "../../../../src/modules/clients/actions";
import type { ActionResult } from "../../../../src/shared/errors/result";
import { requireDashboardAccessForServerAction } from "../../../../src/modules/auth/dashboard-access";

export async function updateClientNotes(clientId: string, notes: string): Promise<ActionResult<{ id: string }>> {

  await requireDashboardAccessForServerAction();
  return updateClientNotesImpl(clientId, notes);
}

export async function updateClientProfile(formData: FormData): Promise<ActionResult<{ id: string }>> {

  await requireDashboardAccessForServerAction();
  return updateClientProfileActionImpl(formData);
}

export async function deleteClient(clientId: string): Promise<ActionResult<{ id: string }>> {

  await requireDashboardAccessForServerAction();
  return deleteClientActionImpl(clientId);
}
