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

function buildAddressLine(payload: {
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}) {
  const parts = [
    payload.logradouro?.trim(),
    payload.numero?.trim(),
    payload.complemento?.trim(),
    payload.bairro?.trim(),
    payload.cidade?.trim(),
    payload.estado?.trim(),
    payload.cep?.trim(),
  ].filter((value) => value && value.length > 0);

  return parts.length > 0 ? parts.join(", ") : null;
}

export async function createClientAction(formData: FormData): Promise<void> {
  const name = formData.get("name") as string | null;
  const phone = (formData.get("phone") as string | null) || null;
  const observacoes_gerais = (formData.get("observacoes_gerais") as string | null) || null;
  const email = (formData.get("email") as string | null) || null;
  const data_nascimento = (formData.get("data_nascimento") as string | null) || null;
  const cpf = (formData.get("cpf") as string | null) || null;
  const endereco_completo = (formData.get("endereco_completo") as string | null) || null;
  const address_cep = (formData.get("address_cep") as string | null) || null;
  const address_logradouro = (formData.get("address_logradouro") as string | null) || null;
  const address_numero = (formData.get("address_numero") as string | null) || null;
  const address_complemento = (formData.get("address_complemento") as string | null) || null;
  const address_bairro = (formData.get("address_bairro") as string | null) || null;
  const address_cidade = (formData.get("address_cidade") as string | null) || null;
  const address_estado = (formData.get("address_estado") as string | null) || null;
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
    address_cep,
    address_logradouro,
    address_numero,
    address_complemento,
    address_bairro,
    address_cidade,
    address_estado,
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
    endereco_completo:
      buildAddressLine({
        cep: parsed.data.address_cep,
        logradouro: parsed.data.address_logradouro,
        numero: parsed.data.address_numero,
        complemento: parsed.data.address_complemento,
        bairro: parsed.data.address_bairro,
        cidade: parsed.data.address_cidade,
        estado: parsed.data.address_estado,
      }) ?? parsed.data.endereco_completo,
    address_cep: parsed.data.address_cep,
    address_logradouro: parsed.data.address_logradouro,
    address_numero: parsed.data.address_numero,
    address_complemento: parsed.data.address_complemento,
    address_bairro: parsed.data.address_bairro,
    address_cidade: parsed.data.address_cidade,
    address_estado: parsed.data.address_estado,
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
  const address_cep = (formData.get("address_cep") as string | null) || null;
  const address_logradouro = (formData.get("address_logradouro") as string | null) || null;
  const address_numero = (formData.get("address_numero") as string | null) || null;
  const address_complemento = (formData.get("address_complemento") as string | null) || null;
  const address_bairro = (formData.get("address_bairro") as string | null) || null;
  const address_cidade = (formData.get("address_cidade") as string | null) || null;
  const address_estado = (formData.get("address_estado") as string | null) || null;
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
    address_cep,
    address_logradouro,
    address_numero,
    address_complemento,
    address_bairro,
    address_cidade,
    address_estado,
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
    endereco_completo:
      buildAddressLine({
        cep: parsed.data.address_cep,
        logradouro: parsed.data.address_logradouro,
        numero: parsed.data.address_numero,
        complemento: parsed.data.address_complemento,
        bairro: parsed.data.address_bairro,
        cidade: parsed.data.address_cidade,
        estado: parsed.data.address_estado,
      }) ?? parsed.data.endereco_completo,
    address_cep: parsed.data.address_cep,
    address_logradouro: parsed.data.address_logradouro,
    address_numero: parsed.data.address_numero,
    address_complemento: parsed.data.address_complemento,
    address_bairro: parsed.data.address_bairro,
    address_cidade: parsed.data.address_cidade,
    address_estado: parsed.data.address_estado,
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
