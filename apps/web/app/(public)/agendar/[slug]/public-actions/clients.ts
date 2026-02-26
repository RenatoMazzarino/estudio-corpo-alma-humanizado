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
  cpf: string | null;
  public_first_name: string | null;
  public_last_name: string | null;
  internal_reference: string | null;
  address_cep: string | null;
  address_logradouro: string | null;
  address_numero: string | null;
  address_complemento: string | null;
  address_bairro: string | null;
  address_cidade: string | null;
  address_estado: string | null;
}

function normalizeCpfValue(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function normalizeEmailValue(value: string) {
  return value.trim().toLowerCase();
}

function isValidLookupEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type LookupParams = {
  tenantId: string;
  phone?: string;
  email?: string;
  cpf?: string;
};

type PhoneRow = {
  client_id: string;
  number_raw: string | null;
  number_e164: string | null;
  is_primary?: boolean | null;
};

type EmailRow = {
  client_id: string;
  email: string | null;
  is_primary?: boolean | null;
  created_at?: string | null;
};

function buildPhonePatterns(phoneDigits: string) {
  if (!(phoneDigits.length === 10 || phoneDigits.length === 11)) return [];
  const shortDigits = phoneDigits.length > 8 ? phoneDigits.slice(-8) : phoneDigits;
  const shortDigits9 = phoneDigits.length > 9 ? phoneDigits.slice(-9) : phoneDigits;
  return Array.from(
    new Set([phoneDigits, shortDigits9, shortDigits].filter((value) => value && value.length >= 8))
  );
}

function matchPhoneCandidate(
  phone: string | null | undefined,
  variants: string[],
  extraPhones: Array<{ number_raw: string | null; number_e164: string | null }>
) {
  if (phoneMatchesAny(phone, variants)) return true;
  return extraPhones.some(
    (entry) => phoneMatchesAny(entry.number_raw, variants) || phoneMatchesAny(entry.number_e164, variants)
  );
}

function matchCpfCandidate(cpf: string | null | undefined, targetDigits: string) {
  if (targetDigits.length !== 11) return false;
  return normalizeCpfValue(cpf ?? "") === targetDigits;
}

function matchEmailCandidate(
  email: string | null | undefined,
  targetEmail: string,
  extraEmails: Array<{ email: string | null }>
) {
  if (!targetEmail) return false;
  if (normalizeEmailValue(email ?? "") === targetEmail) return true;
  return extraEmails.some((entry) => normalizeEmailValue(entry.email ?? "") === targetEmail);
}

export async function lookupClientIdentity({
  tenantId,
  phone,
  email,
  cpf,
}: LookupParams): Promise<ActionResult<{ client: ClientLookupResult | null }>> {
  const phoneDigits = normalizePhoneValue(phone ?? "");
  const cpfDigits = normalizeCpfValue(cpf ?? "");
  const emailNormalized = normalizeEmailValue(email ?? "");

  const validPhone = phoneDigits.length === 10 || phoneDigits.length === 11;
  const validCpf = cpfDigits.length === 11;
  const validEmail = emailNormalized.length > 0 && isValidLookupEmail(emailNormalized);

  if (!validPhone && !validCpf && !validEmail) {
    return ok({ client: null });
  }

  const supabase = createServiceClient();
  const baseClientSelect =
    "id, name, phone, email, cpf, public_first_name, public_last_name, internal_reference, address_cep, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado";

  const phonePatterns = buildPhonePatterns(phoneDigits);
  const phoneLoosePatterns = phonePatterns.map((value) => `%${value.split("").join("%")}%`);
  const phoneFilters = [
    ...phonePatterns.map((value) => `phone.ilike.%${sanitizeIlike(value)}%`),
    ...phoneLoosePatterns.map((pattern) => `phone.ilike.${pattern}`),
  ]
    .filter(Boolean)
    .join(",");

  const emailFilter = validEmail ? `email.ilike.${sanitizeIlike(emailNormalized)}` : "";
  const cpfFilter = validCpf ? `cpf.ilike.%${cpfDigits}%` : "";
  const combinedClientOrFilters = [phoneFilters, emailFilter, cpfFilter].filter(Boolean).join(",");

  const { data: clientsData, error: clientsError } = combinedClientOrFilters
    ? await supabase
        .from("clients")
        .select(baseClientSelect)
        .eq("tenant_id", tenantId)
        .or(combinedClientOrFilters)
        .limit(200)
    : await supabase.from("clients").select(baseClientSelect).eq("tenant_id", tenantId).limit(2000);

  if (clientsError) {
    return fail(new AppError("Não foi possível buscar clientes.", "SUPABASE_ERROR", 500, clientsError));
  }

  const initialCandidates = (clientsData ?? []) as ClientLookupResult[];
  const candidateIds = new Set(initialCandidates.map((client) => client.id));

  let phoneRows: PhoneRow[] = [];
  if (validPhone) {
    const phoneMatchFilters = [
      ...phonePatterns.map((value) => `number_e164.ilike.%${sanitizeIlike(value)}%`),
      ...phonePatterns.map((value) => `number_raw.ilike.%${sanitizeIlike(value)}%`),
      ...phoneLoosePatterns.map((pattern) => `number_raw.ilike.${pattern}`),
      ...phoneLoosePatterns.map((pattern) => `number_e164.ilike.${pattern}`),
    ]
      .filter(Boolean)
      .join(",");

    const { data, error } = phoneMatchFilters
      ? await supabase
          .from("client_phones")
          .select("client_id, number_raw, number_e164, is_primary")
          .eq("tenant_id", tenantId)
          .or(phoneMatchFilters)
          .limit(200)
      : await supabase
          .from("client_phones")
          .select("client_id, number_raw, number_e164, is_primary")
          .eq("tenant_id", tenantId)
          .limit(200);

    if (error) {
      return fail(new AppError("Não foi possível buscar clientes.", "SUPABASE_ERROR", 500, error));
    }
    phoneRows = (data ?? []) as PhoneRow[];
    phoneRows.forEach((row) => candidateIds.add(row.client_id));
  }

  let emailRows: EmailRow[] = [];
  if (validEmail) {
    const { data, error } = await supabase
      .from("client_emails")
      .select("client_id, email, is_primary, created_at")
      .eq("tenant_id", tenantId)
      .ilike("email", emailNormalized)
      .limit(100);

    if (error) {
      return fail(new AppError("Não foi possível buscar clientes.", "SUPABASE_ERROR", 500, error));
    }
    emailRows = (data ?? []) as EmailRow[];
    emailRows.forEach((row) => candidateIds.add(row.client_id));
  }

  const clientMap = new Map<string, ClientLookupResult>();
  initialCandidates.forEach((client) => clientMap.set(client.id, client));

  const missingIds = Array.from(candidateIds).filter((id) => !clientMap.has(id));
  if (missingIds.length > 0) {
    const { data: extraClients, error: extraError } = await supabase
      .from("clients")
      .select(baseClientSelect)
      .eq("tenant_id", tenantId)
      .in("id", missingIds);

    if (extraError) {
      return fail(new AppError("Não foi possível buscar clientes.", "SUPABASE_ERROR", 500, extraError));
    }
    (extraClients ?? []).forEach((client) => {
      clientMap.set(client.id, client as ClientLookupResult);
    });
  }

  if (clientMap.size === 0) {
    if (validCpf) {
      const { data: cpfFallbackClients, error: cpfFallbackError } = await supabase
        .from("clients")
        .select(baseClientSelect)
        .eq("tenant_id", tenantId)
        .not("cpf", "is", null)
        .limit(5000);
      if (cpfFallbackError) {
        return fail(
          new AppError("Não foi possível buscar clientes.", "SUPABASE_ERROR", 500, cpfFallbackError)
        );
      }
      (cpfFallbackClients ?? []).forEach((client) => clientMap.set(client.id, client as ClientLookupResult));
    }
    if (clientMap.size === 0) {
      return ok({ client: null });
    }
  }

  const phonesByClient = new Map<string, Array<{ number_raw: string | null; number_e164: string | null }>>();
  phoneRows.forEach((row) => {
    const list = phonesByClient.get(row.client_id) ?? [];
    list.push({ number_raw: row.number_raw, number_e164: row.number_e164 });
    phonesByClient.set(row.client_id, list);
  });

  const emailsByClient = new Map<string, Array<{ email: string | null }>>();
  emailRows.forEach((row) => {
    const list = emailsByClient.get(row.client_id) ?? [];
    list.push({ email: row.email });
    emailsByClient.set(row.client_id, list);
  });

  const validCriteriaCount = [validPhone, validCpf, validEmail].filter(Boolean).length;

  const rankedCandidates = Array.from(clientMap.values())
    .map((client) => {
      const phoneMatched = validPhone
        ? matchPhoneCandidate(client.phone, phonePatterns, phonesByClient.get(client.id) ?? [])
        : false;
      const cpfMatched = validCpf ? matchCpfCandidate(client.cpf, cpfDigits) : false;
      const emailMatched = validEmail
        ? matchEmailCandidate(client.email, emailNormalized, emailsByClient.get(client.id) ?? [])
        : false;
      const score = [phoneMatched, cpfMatched, emailMatched].filter(Boolean).length;
      return { client, phoneMatched, cpfMatched, emailMatched, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (rankedCandidates.length === 0) {
    return ok({ client: null });
  }

  if (validCriteriaCount > 1) {
    const strictMatch = rankedCandidates.find((entry) => entry.score === validCriteriaCount)?.client ?? null;
    return ok({ client: strictMatch });
  }

  return ok({ client: rankedCandidates[0]?.client ?? null });
}

export async function lookupClientByPhone({
  tenantId,
  phone,
}: {
  tenantId: string;
  phone: string;
}): Promise<ActionResult<{ client: ClientLookupResult | null }>> {
  return lookupClientIdentity({ tenantId, phone });
}
