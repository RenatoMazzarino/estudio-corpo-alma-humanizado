"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { AppError } from "../../shared/errors/AppError";
import { mapSupabaseError } from "../../shared/errors/mapSupabaseError";
import { fail, ok, type ActionResult } from "../../shared/errors/result";
import { createClientSchema, updateClientNotesSchema, updateClientSchema } from "../../shared/validation/clients";
import { z } from "zod";
import { createClient, updateClient, deleteClient as deleteClientRepo } from "./repository";

export async function createClientAction(formData: FormData): Promise<void> {
  const name = formData.get("name") as string | null;
  const phone = (formData.get("phone") as string | null) || null;
  const observacoes_gerais = (formData.get("observacoes_gerais") as string | null) || null;
  const email = (formData.get("email") as string | null) || null;
  const data_nascimento = (formData.get("data_nascimento") as string | null) || null;
  const cpf = (formData.get("cpf") as string | null) || null;
  const endereco_completo = (formData.get("endereco_completo") as string | null) || null;
  const profissao = (formData.get("profissao") as string | null) || null;
  const como_conheceu = (formData.get("como_conheceu") as string | null) || null;
  const healthTagsRaw = (formData.get("health_tags") as string | null) || null;
  const health_tags =
    healthTagsRaw && healthTagsRaw.trim().length > 0
      ? healthTagsRaw
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : null;

  const parsed = createClientSchema.safeParse({
    name,
    phone,
    observacoes_gerais,
    email,
    data_nascimento,
    cpf,
    endereco_completo,
    profissao,
    como_conheceu,
    health_tags,
  });
  if (!parsed.success) {
    throw new AppError("Dados inválidos para cliente", "VALIDATION_ERROR", 400, parsed.error);
  }

  const { data, error } = await createClient({
    name: parsed.data.name,
    phone: parsed.data.phone,
    observacoes_gerais: parsed.data.observacoes_gerais,
    email: parsed.data.email,
    data_nascimento: parsed.data.data_nascimento,
    cpf: parsed.data.cpf,
    endereco_completo: parsed.data.endereco_completo,
    profissao: parsed.data.profissao,
    como_conheceu: parsed.data.como_conheceu,
    health_tags: parsed.data.health_tags,
    initials: parsed.data.name.slice(0, 2).toUpperCase(),
    tenant_id: FIXED_TENANT_ID,
  });

  const mappedError = mapSupabaseError(error);
  if (mappedError) throw mappedError;
  if (!data) throw new AppError("Cliente não criado", "UNKNOWN", 500);

  redirect("/clientes");
}

export async function updateClientNotes(clientId: string, notes: string): Promise<ActionResult<{ id: string }>> {
  const parsed = updateClientNotesSchema.safeParse({ clientId, notes });
  if (!parsed.success) {
    return fail(new AppError("Dados inválidos para observações", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await updateClient(FIXED_TENANT_ID, clientId, {
    observacoes_gerais: parsed.data.notes || null,
  });

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath(`/clientes/${clientId}`);
  return ok({ id: clientId });
}

export async function updateClientProfileAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const clientId = formData.get("clientId") as string | null;
  const name = formData.get("name") as string | null;
  const phone = (formData.get("phone") as string | null) || null;
  const observacoes_gerais = (formData.get("observacoes_gerais") as string | null) || null;
  const email = (formData.get("email") as string | null) || null;
  const data_nascimento = (formData.get("data_nascimento") as string | null) || null;
  const cpf = (formData.get("cpf") as string | null) || null;
  const endereco_completo = (formData.get("endereco_completo") as string | null) || null;
  const profissao = (formData.get("profissao") as string | null) || null;
  const como_conheceu = (formData.get("como_conheceu") as string | null) || null;
  const healthTagsRaw = (formData.get("health_tags") as string | null) || null;
  const health_tags =
    healthTagsRaw && healthTagsRaw.trim().length > 0
      ? healthTagsRaw
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : null;

  const parsed = updateClientSchema.safeParse({
    clientId,
    name,
    phone,
    observacoes_gerais,
    email,
    data_nascimento,
    cpf,
    endereco_completo,
    profissao,
    como_conheceu,
    health_tags,
  });

  if (!parsed.success) {
    return fail(new AppError("Dados inválidos para cliente", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await updateClient(FIXED_TENANT_ID, parsed.data.clientId, {
    name: parsed.data.name,
    phone: parsed.data.phone,
    observacoes_gerais: parsed.data.observacoes_gerais,
    email: parsed.data.email,
    data_nascimento: parsed.data.data_nascimento,
    cpf: parsed.data.cpf,
    endereco_completo: parsed.data.endereco_completo,
    profissao: parsed.data.profissao,
    como_conheceu: parsed.data.como_conheceu,
    health_tags: parsed.data.health_tags,
    initials: parsed.data.name.slice(0, 2).toUpperCase(),
  });

  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath(`/clientes/${parsed.data.clientId}`);
  return ok({ id: parsed.data.clientId });
}

export async function deleteClientAction(clientId: string): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({ clientId: z.string().uuid() }).safeParse({ clientId });
  if (!parsed.success) {
    return fail(new AppError("Cliente inválido", "VALIDATION_ERROR", 400, parsed.error));
  }

  const { error } = await deleteClientRepo(FIXED_TENANT_ID, parsed.data.clientId);
  const mappedError = mapSupabaseError(error);
  if (mappedError) return fail(mappedError);

  revalidatePath("/clientes");
  return ok({ id: parsed.data.clientId });
}
