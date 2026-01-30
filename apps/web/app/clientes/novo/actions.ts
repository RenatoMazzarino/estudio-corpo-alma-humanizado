"use server";

import { createServiceClient } from "../../../lib/supabase/service";
import { redirect } from "next/navigation";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { AppError } from "../../../src/shared/errors/AppError";
import { mapSupabaseError } from "../../../src/shared/errors/mapSupabaseError";
import { createClientSchema } from "../../../src/shared/validation/clients";

export async function createClientAction(formData: FormData): Promise<void> {
  const supabase = createServiceClient();
  
  const name = formData.get("name") as string | null;
  const phone = (formData.get("phone") as string | null) || null;
  const observacoes_gerais = (formData.get("observacoes_gerais") as string | null) || null;

  const parsed = createClientSchema.safeParse({ name, phone, observacoes_gerais });
  if (!parsed.success) {
    throw new AppError("Dados inválidos para cliente", "VALIDATION_ERROR", 400, parsed.error);
  }

  const { data, error } = await supabase.from("clients").insert({
    name: parsed.data.name,
    phone: parsed.data.phone,
    observacoes_gerais: parsed.data.observacoes_gerais,
    initials: parsed.data.name.slice(0, 2).toUpperCase(),
    tenant_id: FIXED_TENANT_ID
  }).select("id").single();

  const mappedError = mapSupabaseError(error);
  if (mappedError) throw mappedError;
  if (!data) throw new AppError("Cliente não criado", "UNKNOWN", 500);

  redirect("/clientes");
}
