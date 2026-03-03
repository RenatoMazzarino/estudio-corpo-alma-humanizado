"use server";

import { z } from "zod";
import { createClientAction as createClientActionImpl } from "../../../../src/modules/clients/actions";
import { listClients } from "../../../../src/modules/clients/repository";
import { requireDashboardAccessForServerAction } from "../../../../src/modules/auth/dashboard-access";

export async function createClientAction(formData: FormData): Promise<void> {

  await requireDashboardAccessForServerAction();
  return createClientActionImpl(formData);
}

export async function searchClientsByName(query: string): Promise<{ data: { id: string; name: string; phone: string | null }[] }> {
  const { tenantId } = await requireDashboardAccessForServerAction();
  const parsed = z.string().min(2).safeParse(query);
  if (!parsed.success) return { data: [] };
  const { data } = await listClients(tenantId, parsed.data);
  const clients = (data as { id: string; name: string; phone: string | null }[] | null) ?? [];
  return { data: clients.slice(0, 6) };
}
