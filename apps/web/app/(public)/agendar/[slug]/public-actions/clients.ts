"use server";

import { createServiceClient } from "../../../../../lib/supabase/service";
import { AppError } from "../../../../../src/shared/errors/AppError";
import { fail, ok, type ActionResult } from "../../../../../src/shared/errors/result";
import { normalizePhoneValue, phoneMatchesAny, sanitizeIlike } from "./helpers";

interface ClientLookupResult {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address_cep: string | null;
  address_logradouro: string | null;
  address_numero: string | null;
  address_complemento: string | null;
  address_bairro: string | null;
  address_cidade: string | null;
  address_estado: string | null;
}

export async function lookupClientByPhone({
  tenantId,
  phone,
}: {
  tenantId: string;
  phone: string;
}): Promise<ActionResult<{ client: ClientLookupResult | null }>> {
  const digits = normalizePhoneValue(phone);
  if (digits.length < 10) {
    return ok({ client: null });
  }

  const supabase = createServiceClient();
  const shortDigits = digits.length > 8 ? digits.slice(-8) : digits;
  const shortDigits9 = digits.length > 9 ? digits.slice(-9) : digits;

  const patterns = Array.from(
    new Set([digits, shortDigits9, shortDigits].filter((value) => value && value.length >= 8))
  );

  const loosePatterns = patterns.map((value) => `%${value.split("").join("%")}%`);

  const phoneFilters = [
    ...patterns.map((value) => `phone.ilike.%${sanitizeIlike(value)}%`),
    ...loosePatterns.map((pattern) => `phone.ilike.${pattern}`),
  ]
    .filter(Boolean)
    .join(",");

  const { data: clientsByPhone, error: clientsError } = phoneFilters
    ? await supabase
        .from("clients")
        .select(
          "id, name, phone, email, address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado"
        )
        .eq("tenant_id", tenantId)
        .or(phoneFilters)
    : await supabase
        .from("clients")
        .select(
          "id, name, phone, email, address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado"
        )
        .eq("tenant_id", tenantId);

  const phoneMatchFilters = [
    ...patterns.map((value) => `number_e164.ilike.%${sanitizeIlike(value)}%`),
    ...patterns.map((value) => `number_raw.ilike.%${sanitizeIlike(value)}%`),
    ...loosePatterns.map((pattern) => `number_raw.ilike.${pattern}`),
    ...loosePatterns.map((pattern) => `number_e164.ilike.${pattern}`),
  ]
    .filter(Boolean)
    .join(",");

  const { data: clientPhones, error: phonesError } = phoneMatchFilters
    ? await supabase
        .from("client_phones")
        .select("client_id, number_raw, number_e164, is_primary")
        .eq("tenant_id", tenantId)
        .or(phoneMatchFilters)
    : await supabase
        .from("client_phones")
        .select("client_id, number_raw, number_e164, is_primary")
        .eq("tenant_id", tenantId);

  if (clientsError || phonesError) {
    const { data: fallbackClients, error: fallbackError } = await supabase
      .from("clients")
      .select(
        "id, name, phone, email, address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado"
      )
      .eq("tenant_id", tenantId)
      .not("phone", "is", null)
      .limit(1000);

    if (fallbackError) {
      return fail(new AppError("Não foi possível buscar clientes.", "SUPABASE_ERROR", 500, fallbackError));
    }

    const fallbackClient =
      (fallbackClients ?? []).find((client) => phoneMatchesAny(client.phone, patterns)) ?? null;

    return ok({ client: fallbackClient });
  }

  const candidateIds = new Set<string>();
  (clientsByPhone ?? []).forEach((client) => candidateIds.add(client.id));
  (clientPhones ?? []).forEach((phoneEntry) => candidateIds.add(phoneEntry.client_id));

  if (candidateIds.size === 0) {
    return ok({ client: null });
  }

  const clientMap = new Map<string, ClientLookupResult>();
  (clientsByPhone ?? []).forEach((client) => {
    clientMap.set(client.id, client as ClientLookupResult);
  });

  const missingIds = Array.from(candidateIds).filter((id) => !clientMap.has(id));
  if (missingIds.length > 0) {
    const { data: extraClients, error: extraError } = await supabase
      .from("clients")
      .select(
        "id, name, phone, email, address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado"
      )
      .eq("tenant_id", tenantId)
      .in("id", missingIds);
    if (extraError) {
      return fail(new AppError("Não foi possível buscar clientes.", "SUPABASE_ERROR", 500, extraError));
    }
    (extraClients ?? []).forEach((client) => {
      clientMap.set(client.id, client as ClientLookupResult);
    });
  }

  const phonesByClient = new Map<string, { number_raw: string | null; number_e164: string | null }[]>();
  (clientPhones ?? []).forEach((phoneEntry) => {
    const list = phonesByClient.get(phoneEntry.client_id) ?? [];
    list.push({ number_raw: phoneEntry.number_raw, number_e164: phoneEntry.number_e164 });
    phonesByClient.set(phoneEntry.client_id, list);
  });

  const { data: clientEmails, error: emailsError } = await supabase
    .from("client_emails")
    .select("client_id, email, is_primary, created_at")
    .eq("tenant_id", tenantId)
    .in("client_id", Array.from(candidateIds));

  if (emailsError) {
    return fail(new AppError("Não foi possível buscar clientes.", "SUPABASE_ERROR", 500, emailsError));
  }

  const emailByClient = new Map<string, string>();
  (clientEmails ?? [])
    .sort((a, b) => {
      if (a.is_primary === b.is_primary) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return a.is_primary ? -1 : 1;
    })
    .forEach((entry) => {
      if (!entry.email) return;
      if (emailByClient.has(entry.client_id)) return;
      emailByClient.set(entry.client_id, entry.email);
    });

  const candidates = Array.from(candidateIds)
    .map((id) => {
      const client = clientMap.get(id);
      if (!client) return null;
      return {
        ...client,
        email: client.email ?? emailByClient.get(id) ?? null,
      };
    })
    .filter(Boolean) as ClientLookupResult[];

  const matchedClient =
    candidates.find((client) => phoneMatchesAny(client.phone, patterns)) ||
    candidates.find((client) =>
      (phonesByClient.get(client.id) ?? []).some(
        (phoneEntry) =>
          phoneMatchesAny(phoneEntry.number_raw, patterns) ||
          phoneMatchesAny(phoneEntry.number_e164, patterns)
      )
    ) ||
    null;

  if (matchedClient) {
    return ok({ client: matchedClient });
  }

  const { data: fallbackClients, error: fallbackClientsError } = await supabase
    .from("clients")
    .select(
      "id, name, phone, email, address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado"
    )
    .eq("tenant_id", tenantId)
    .not("phone", "is", null)
    .limit(500);

  if (fallbackClientsError) {
    return fail(
      new AppError("Não foi possível buscar clientes.", "SUPABASE_ERROR", 500, fallbackClientsError)
    );
  }

  const fallbackClient =
    (fallbackClients ?? []).find((client) => phoneMatchesAny(client.phone, patterns)) ?? null;

  return ok({ client: fallbackClient });
}
