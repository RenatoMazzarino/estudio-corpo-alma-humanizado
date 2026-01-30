"use server";

import { createServiceClient } from "../lib/supabase/service";
import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../lib/tenant-context";
import { AppError } from "../src/shared/errors/AppError";
import { mapSupabaseError } from "../src/shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../src/shared/errors/result";
import {
  cancelAppointmentSchema,
  finishAppointmentSchema,
  startAppointmentSchema,
} from "../src/shared/validation/appointments";
import { upsertServiceSchema } from "../src/shared/validation/services";

// --- SERVIÇOS ---

export async function upsertService(formData: FormData): Promise<ActionResult<{ id?: string }>> {
  const supabase = createServiceClient();

  // Campos existentes
  const id = formData.get("id") as string | null;
  const name = formData.get("name") as string | null;
  const price = Number(formData.get("price"));
  const duration_minutes = Number(formData.get("duration_minutes"));

  // Novos campos adicionados
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
  const { error } = serviceId
    ? await supabase.from("services").update(payload).eq("id", serviceId)
    : await supabase.from("services").insert(payload);

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath("/catalogo"); 
  return ok({ id: serviceId });
}

export async function deleteService(id: string): Promise<ActionResult<{ id: string }>> {
  const supabase = createServiceClient();

  const parsed = startAppointmentSchema.safeParse({ id });
  if (!parsed.success) {
    return fail(new AppError("ID inválido", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("tenant_id", FIXED_TENANT_ID);

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath("/catalogo");
  return ok({ id });
}

// --- AGENDAMENTOS (Mantidos) ---

export async function startAppointment(id: string): Promise<ActionResult<{ id: string }>> {
  const supabase = createServiceClient();
  
  const parsed = startAppointmentSchema.safeParse({ id });
  if (!parsed.success) {
    return fail(new AppError("ID inválido", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await supabase
    .from("appointments")
    .update({ 
      status: "in_progress",
      started_at: new Date().toISOString() // Salva a hora exata do clique
    })
    .eq("id", id)
    .eq("tenant_id", FIXED_TENANT_ID);

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath("/"); // Atualiza a tela instantaneamente
  return ok({ id });
}

export async function finishAppointment(id: string): Promise<ActionResult<{ id: string }>> {
  const supabase = createServiceClient();
  
  const parsed = finishAppointmentSchema.safeParse({ id });
  if (!parsed.success) {
    return fail(new AppError("ID inválido", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await supabase
    .from("appointments")
    .update({ 
      status: "completed",
      finished_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("tenant_id", FIXED_TENANT_ID);

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath("/");
  return ok({ id });
}

export async function cancelAppointment(id: string): Promise<ActionResult<{ id: string }>> {
  const supabase = createServiceClient();
  
  const parsed = cancelAppointmentSchema.safeParse({ id });
  if (!parsed.success) {
    return fail(new AppError("ID inválido", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await supabase
    .from("appointments")
    .update({ 
      status: "canceled_by_studio"
    })
    .eq("id", id)
    .eq("tenant_id", FIXED_TENANT_ID);

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath("/");
  revalidatePath("/caixa"); // Atualiza também o caixa se precisar
  return ok({ id });
}
