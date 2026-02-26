"use server";

import { z } from "zod";
import { createServiceClient } from "../../../lib/supabase/service";
import {
  createAppointment as createAppointmentImpl,
  updateInternalAppointment as updateAppointmentImpl,
} from "../../../src/modules/appointments/actions";
import { listClientAddresses } from "../../../src/modules/clients/repository";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { requireDashboardAccessForServerAction } from "../../../src/modules/auth/dashboard-access";

export async function createAppointment(formData: FormData): Promise<void> {

  await requireDashboardAccessForServerAction();
  return createAppointmentImpl(formData);
}

export async function updateAppointment(formData: FormData): Promise<void> {

  await requireDashboardAccessForServerAction();
  return updateAppointmentImpl(formData);
}

export async function getClientAddresses(clientId: string): Promise<{ data: unknown[]; error?: string | null }> {

  await requireDashboardAccessForServerAction();
  const parsed = z.object({ clientId: z.string().uuid() }).safeParse({ clientId });
  if (!parsed.success) {
    return { data: [], error: "Cliente inválido" };
  }

  const { data, error } = await listClientAddresses(FIXED_TENANT_ID, parsed.data.clientId);
  return { data: (data as unknown[] | null) ?? [], error: error?.message ?? null };
}

export async function saveClientAddress(input: {
  clientId: string;
  label: string;
  isPrimary?: boolean;
  addressCep?: string | null;
  addressLogradouro?: string | null;
  addressNumero?: string | null;
  addressComplemento?: string | null;
  addressBairro?: string | null;
  addressCidade?: string | null;
  addressEstado?: string | null;
}): Promise<{ data: { id: string } | null; error?: string | null }> {
  await requireDashboardAccessForServerAction();

  const parsed = z
    .object({
      clientId: z.string().uuid(),
      label: z.string().trim().min(1).max(80),
      isPrimary: z.boolean().optional(),
      addressCep: z.string().trim().max(20).nullish(),
      addressLogradouro: z.string().trim().min(1).max(255),
      addressNumero: z.string().trim().max(50).nullish(),
      addressComplemento: z.string().trim().max(255).nullish(),
      addressBairro: z.string().trim().max(255).nullish(),
      addressCidade: z.string().trim().min(1).max(255),
      addressEstado: z.string().trim().min(2).max(2),
    })
    .safeParse({
      clientId: input.clientId,
      label: input.label,
      isPrimary: input.isPrimary,
      addressCep: input.addressCep ?? null,
      addressLogradouro: input.addressLogradouro,
      addressNumero: input.addressNumero ?? null,
      addressComplemento: input.addressComplemento ?? null,
      addressBairro: input.addressBairro ?? null,
      addressCidade: input.addressCidade,
      addressEstado: input.addressEstado?.toUpperCase(),
    });

  if (!parsed.success) {
    return { data: null, error: "Dados de endereço inválidos." };
  }

  const supabase = createServiceClient();
  const { data: existingRows, error: existingError } = await supabase
    .from("client_addresses")
    .select("id, is_primary")
    .eq("tenant_id", FIXED_TENANT_ID)
    .eq("client_id", parsed.data.clientId);

  if (existingError) {
    return { data: null, error: "Não foi possível verificar os endereços do cliente." };
  }

  const hasExistingAddresses = (existingRows?.length ?? 0) > 0;
  const shouldBePrimary = !hasExistingAddresses || parsed.data.isPrimary === true;

  if (shouldBePrimary) {
    const { error: clearPrimaryError } = await supabase
      .from("client_addresses")
      .update({ is_primary: false })
      .eq("tenant_id", FIXED_TENANT_ID)
      .eq("client_id", parsed.data.clientId);

    if (clearPrimaryError) {
      return { data: null, error: "Não foi possível atualizar o endereço principal." };
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("client_addresses")
    .insert({
      tenant_id: FIXED_TENANT_ID,
      client_id: parsed.data.clientId,
      label: parsed.data.label,
      is_primary: shouldBePrimary,
      address_cep: parsed.data.addressCep || null,
      address_logradouro: parsed.data.addressLogradouro,
      address_numero: parsed.data.addressNumero || null,
      address_complemento: parsed.data.addressComplemento || null,
      address_bairro: parsed.data.addressBairro || null,
      address_cidade: parsed.data.addressCidade,
      address_estado: parsed.data.addressEstado,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { data: null, error: "Não foi possível salvar o endereço." };
  }

  return { data: { id: inserted.id }, error: null };
}
