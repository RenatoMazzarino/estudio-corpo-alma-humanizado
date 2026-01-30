"use server";

import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { AppError } from "../../shared/errors/AppError";
import { mapSupabaseError } from "../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import { upsertServiceSchema } from "../../shared/validation/services";
import { deleteService as deleteServiceRepo, upsertService as upsertServiceRepo } from "./repository";
import { revalidatePath } from "next/cache";

export async function upsertService(formData: FormData): Promise<ActionResult<{ id?: string }>> {
  const id = formData.get("id") as string | null;
  const name = formData.get("name") as string | null;
  const price = Number(formData.get("price"));
  const duration_minutes = Number(formData.get("duration_minutes"));
  const accepts_home_visit = formData.get("accepts_home_visit") === "on";
  const home_visit_fee = Number(formData.get("home_visit_fee")) || 0;
  const custom_buffer_minutes = Number(formData.get("custom_buffer_minutes")) || 0;
  const description = (formData.get("description") as string | null) || null;

  const parsed = upsertServiceSchema.safeParse({
    id,
    name,
    price,
    duration_minutes,
    accepts_home_visit,
    home_visit_fee,
    custom_buffer_minutes,
    description,
  });

  if (!parsed.success) {
    return fail(new AppError("Dados inválidos para serviço", "VALIDATION_ERROR", 400, parsed.error));
  }

  const payload = {
    name: parsed.data.name,
    description: parsed.data.description,
    price: parsed.data.price,
    duration_minutes: parsed.data.duration_minutes,
    accepts_home_visit: parsed.data.accepts_home_visit,
    home_visit_fee: parsed.data.home_visit_fee,
    custom_buffer_minutes: parsed.data.custom_buffer_minutes ?? 0,
    tenant_id: FIXED_TENANT_ID,
  };

  const serviceId = parsed.data.id ?? undefined;
  const { error } = await upsertServiceRepo(FIXED_TENANT_ID, payload, serviceId);
  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath("/catalogo");
  return ok({ id: serviceId });
}

export async function deleteService(id: string): Promise<ActionResult<{ id: string }>> {
  const { error } = await deleteServiceRepo(FIXED_TENANT_ID, id);
  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath("/catalogo");
  return ok({ id });
}
