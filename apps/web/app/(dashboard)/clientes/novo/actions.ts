"use server";

import { createClientAction as createClientActionImpl } from "../../../../src/modules/clients/actions";

export async function createClientAction(formData: FormData): Promise<void> {
  return createClientActionImpl(formData);
}
