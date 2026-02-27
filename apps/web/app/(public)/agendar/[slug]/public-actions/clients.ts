"use server";

import crypto from "crypto";
import { headers } from "next/headers";
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
  securitySessionId?: string;
  captchaToken?: string;
  captchaAnswer?: string;
};

type LookupGuardStatus = "ok" | "captcha_required" | "cooldown" | "blocked";

type LookupGuardPayload = {
  status: LookupGuardStatus;
  cycle: number;
  attemptsInCycle: number;
  cooldownUntil: string | null;
  hardBlockUntil: string | null;
  captcha: { prompt: string; token: string } | null;
  shouldResetToStart?: boolean;
  shouldLogAlert?: boolean;
};

type LookupGuardRow = {
  id: string;
  tenant_id: string;
  actor_key_hash: string;
  phone_hash: string;
  phone_last4: string | null;
  completed_cycles: number;
  attempts_in_cycle: number;
  cooldown_until: string | null;
  hard_block_until: string | null;
  last_attempt_at: string | null;
  last_success_at: string | null;
};

type UntypedSupabaseBuilder = {
  eq: (column: string, value: unknown) => UntypedSupabaseBuilder;
  select: (columns: string) => UntypedSupabaseBuilder;
  insert: (payload: Record<string, unknown>) => UntypedSupabaseBuilder;
  update: (payload: Record<string, unknown>) => UntypedSupabaseBuilder;
  maybeSingle: () => Promise<{ data: unknown }>;
  single: () => Promise<{ data: unknown }>;
};

type UntypedSupabaseClient = {
  from: (table: string) => UntypedSupabaseBuilder;
};

const LOOKUP_MAX_ATTEMPTS_PER_CYCLE = 3;
const LOOKUP_MAX_CYCLES = 2;
const LOOKUP_COOLDOWN_MINUTES = 10;
const LOOKUP_HARD_BLOCK_HOURS = 24;
const CAPTCHA_TTL_MINUTES = 10;

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

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getCaptchaSecret() {
  const configuredSecret =
    process.env.PUBLIC_BOOKING_LOOKUP_CAPTCHA_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.WHATSAPP_AUTOMATION_PROCESSOR_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (configuredSecret) return configuredSecret;
  if (process.env.NODE_ENV !== "production") {
    return "public-booking-lookup-captcha-dev-secret";
  }

  throw new AppError(
    "Configuração obrigatória ausente: defina PUBLIC_BOOKING_LOOKUP_CAPTCHA_SECRET (ou CRON_SECRET) para validação de segurança do agendamento online.",
    "CONFIG_ERROR",
    500
  );
}

function signCaptchaPayload(payload: string) {
  return crypto.createHmac("sha256", getCaptchaSecret()).update(payload).digest("hex");
}

function createLookupCaptchaChallenge(seed: string) {
  const hash = sha256Hex(`${seed}|${Date.now()}|${Math.random()}`);
  const a = (parseInt(hash.slice(0, 2), 16) % 8) + 2;
  const b = (parseInt(hash.slice(2, 4), 16) % 8) + 2;
  const exp = Date.now() + CAPTCHA_TTL_MINUTES * 60 * 1000;
  const nonce = hash.slice(4, 20);
  const answer = String(a + b);
  const payload = `${nonce}.${exp}.${answer}`;
  const signature = signCaptchaPayload(payload);
  const token = Buffer.from(`${nonce}.${exp}.${signature}`).toString("base64url");
  return {
    prompt: `Verificação rápida: quanto é ${a} + ${b}?`,
    token,
  };
}

function verifyLookupCaptchaChallenge(token?: string, answerRaw?: string) {
  if (!token || !answerRaw) return false;
  let decoded = "";
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return false;
  }
  const [nonce, expRaw, signature] = decoded.split(".");
  if (!nonce || !expRaw || !signature) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const answer = (answerRaw ?? "").replace(/\D/g, "").slice(0, 2);
  if (!answer) return false;
  const payload = `${nonce}.${exp}.${answer}`;
  const expected = signCaptchaPayload(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

async function getLookupActorFingerprint(sessionId?: string) {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0]?.trim() || store.get("x-real-ip") || "unknown";
  const userAgent = store.get("user-agent") || "unknown";
  const session = (sessionId ?? "").trim() || "anonymous";
  return { ip, userAgent, session };
}

function buildLookupActorHashes(params: {
  tenantId: string;
  phoneDigits: string;
  ip: string;
  userAgent: string;
  session: string;
}) {
  const phoneHash = sha256Hex(`${params.tenantId}|phone|${params.phoneDigits}`);
  const actorKeyHash = sha256Hex(`${params.tenantId}|${params.ip}|${params.userAgent}|${params.session}`);
  return {
    phoneHash,
    actorKeyHash,
    phoneLast4: params.phoneDigits.slice(-4) || null,
  };
}

function buildGuardPayload(row: LookupGuardRow, overrides?: Partial<LookupGuardPayload>): LookupGuardPayload {
  return {
    status: "ok",
    cycle: row.completed_cycles + 1,
    attemptsInCycle: row.attempts_in_cycle,
    cooldownUntil: row.cooldown_until,
    hardBlockUntil: row.hard_block_until,
    captcha: null,
    ...overrides,
  };
}

function isFutureIso(value?: string | null) {
  if (!value) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && ms > Date.now();
}

function requiresCaptchaForAttempt(row: LookupGuardRow) {
  const cycle = row.completed_cycles + 1;
  const nextAttempt = row.attempts_in_cycle + 1;
  if (cycle <= 1) {
    return nextAttempt >= 2;
  }
  return cycle === 2;
}

async function logLookupSecurityEvent(params: {
  tenantId: string;
  actorKeyHash: string;
  phoneHash: string;
  phoneLast4: string | null;
  eventType: string;
  details?: Record<string, unknown>;
}) {
  const supabase = createServiceClient() as unknown as UntypedSupabaseClient;
  await (
    supabase.from("public_booking_identity_lookup_events").insert({
      tenant_id: params.tenantId,
      actor_key_hash: params.actorKeyHash,
      phone_hash: params.phoneHash,
      phone_last4: params.phoneLast4,
      event_type: params.eventType,
      details: params.details ?? {},
    }) as unknown as Promise<unknown>
  );
}

async function ensureLookupGuardRow(params: {
  tenantId: string;
  actorKeyHash: string;
  phoneHash: string;
  phoneLast4: string | null;
}) {
  const supabase = createServiceClient() as unknown as UntypedSupabaseClient;
  const { data: existing } = await supabase
    .from("public_booking_identity_lookup_guards")
    .select("*")
    .eq("tenant_id", params.tenantId)
    .eq("actor_key_hash", params.actorKeyHash)
    .eq("phone_hash", params.phoneHash)
    .maybeSingle();

  if (existing) return existing as LookupGuardRow;

  const payload = {
    tenant_id: params.tenantId,
    actor_key_hash: params.actorKeyHash,
    phone_hash: params.phoneHash,
    phone_last4: params.phoneLast4,
  };
  const { data: inserted } = await supabase
    .from("public_booking_identity_lookup_guards")
    .insert(payload)
    .select("*")
    .single();

  return inserted as LookupGuardRow;
}

async function updateLookupGuardRow(rowId: string, patch: Partial<LookupGuardRow>) {
  const supabase = createServiceClient() as unknown as UntypedSupabaseClient;
  const updatePayload = {
    ...patch,
    updated_at: new Date().toISOString(),
  };
  const { data } = await supabase
    .from("public_booking_identity_lookup_guards")
    .update(updatePayload)
    .eq("id", rowId)
    .select("*")
    .single();
  return data as LookupGuardRow;
}

export async function lookupClientIdentity({
  tenantId,
  phone,
  email,
  cpf,
  securitySessionId,
  captchaToken,
  captchaAnswer,
}: LookupParams): Promise<ActionResult<{ client: ClientLookupResult | null; guard?: LookupGuardPayload }>> {
  const phoneDigits = normalizePhoneValue(phone ?? "");
  const cpfDigits = normalizeCpfValue(cpf ?? "");
  const emailNormalized = normalizeEmailValue(email ?? "");

  const validPhone = phoneDigits.length === 10 || phoneDigits.length === 11;
  const validCpf = cpfDigits.length === 11;
  const validEmail = emailNormalized.length > 0 && isValidLookupEmail(emailNormalized);

  if (!validPhone && !validCpf && !validEmail) {
    return ok({ client: null });
  }

  let guardRow: LookupGuardRow | null = null;
  let guardMeta:
    | {
        actorKeyHash: string;
        phoneHash: string;
        phoneLast4: string | null;
      }
    | null = null;
  const isCpfVerificationFlow = validPhone && validCpf;

  if (isCpfVerificationFlow) {
    const actor = await getLookupActorFingerprint(securitySessionId);
    guardMeta = buildLookupActorHashes({
      tenantId,
      phoneDigits,
      ip: actor.ip,
      userAgent: actor.userAgent,
      session: actor.session,
    });
    guardRow = await ensureLookupGuardRow({
      tenantId,
      actorKeyHash: guardMeta.actorKeyHash,
      phoneHash: guardMeta.phoneHash,
      phoneLast4: guardMeta.phoneLast4,
    });

    if (guardRow.completed_cycles >= 1 && guardRow.attempts_in_cycle === 0) {
      await logLookupSecurityEvent({
        tenantId,
        actorKeyHash: guardMeta.actorKeyHash,
        phoneHash: guardMeta.phoneHash,
        phoneLast4: guardMeta.phoneLast4,
        eventType: "second_cycle_started",
        details: {
          completedCycles: guardRow.completed_cycles,
        },
      });
      console.warn(
        "[public-booking][security] início de 2º ciclo de validação de CPF",
        JSON.stringify({
          tenantId,
          phoneLast4: guardMeta.phoneLast4,
          completedCycles: guardRow.completed_cycles,
        })
      );
    }

    if (isFutureIso(guardRow.hard_block_until)) {
      return ok({
        client: null,
        guard: buildGuardPayload(guardRow, {
          status: "blocked",
          shouldResetToStart: true,
        }),
      } as { client: ClientLookupResult | null; guard: LookupGuardPayload });
    }

    if (isFutureIso(guardRow.cooldown_until)) {
      return ok({
        client: null,
        guard: buildGuardPayload(guardRow, {
          status: "cooldown",
          shouldResetToStart: true,
        }),
      } as { client: ClientLookupResult | null; guard: LookupGuardPayload });
    }

    if (guardRow.completed_cycles >= LOOKUP_MAX_CYCLES) {
      const hardBlockUntil = new Date(Date.now() + LOOKUP_HARD_BLOCK_HOURS * 60 * 60 * 1000).toISOString();
      guardRow = await updateLookupGuardRow(guardRow.id, {
        hard_block_until: hardBlockUntil,
      });
      return ok({
        client: null,
        guard: buildGuardPayload(guardRow, {
          status: "blocked",
          shouldResetToStart: true,
        }),
      } as { client: ClientLookupResult | null; guard: LookupGuardPayload });
    }

    const captchaRequired = requiresCaptchaForAttempt(guardRow);
    if (captchaRequired && !verifyLookupCaptchaChallenge(captchaToken, captchaAnswer)) {
      return ok({
        client: null,
        guard: buildGuardPayload(guardRow, {
          status: "captcha_required",
          captcha: createLookupCaptchaChallenge(
            `${tenantId}|${guardMeta.actorKeyHash}|${guardMeta.phoneHash}|${guardRow.completed_cycles}|${guardRow.attempts_in_cycle}`
          ),
        }),
      } as { client: ClientLookupResult | null; guard: LookupGuardPayload });
    }
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
    if (guardRow && guardMeta) {
      const nextAttempts = guardRow.attempts_in_cycle + 1;
      let nextCompletedCycles = guardRow.completed_cycles;
      let cooldownUntil: string | null = null;
      let hardBlockUntil: string | null = guardRow.hard_block_until;
      let shouldResetToStart = false;
      let status: LookupGuardStatus = "ok";

      if (nextAttempts >= LOOKUP_MAX_ATTEMPTS_PER_CYCLE) {
        nextCompletedCycles += 1;
        shouldResetToStart = true;
        if (nextCompletedCycles >= LOOKUP_MAX_CYCLES) {
          hardBlockUntil = new Date(Date.now() + LOOKUP_HARD_BLOCK_HOURS * 60 * 60 * 1000).toISOString();
          status = "blocked";
        } else {
          cooldownUntil = new Date(Date.now() + LOOKUP_COOLDOWN_MINUTES * 60 * 1000).toISOString();
          status = "cooldown";
        }
      }

      const updated = await updateLookupGuardRow(guardRow.id, {
        attempts_in_cycle: nextAttempts >= LOOKUP_MAX_ATTEMPTS_PER_CYCLE ? 0 : nextAttempts,
        completed_cycles: nextCompletedCycles,
        cooldown_until: cooldownUntil,
        hard_block_until: hardBlockUntil,
        last_attempt_at: new Date().toISOString(),
      });

      await logLookupSecurityEvent({
        tenantId,
        actorKeyHash: guardMeta.actorKeyHash,
        phoneHash: guardMeta.phoneHash,
        phoneLast4: guardMeta.phoneLast4,
        eventType:
          status === "blocked"
            ? "cpf_mismatch_hard_block"
            : status === "cooldown"
              ? "cpf_mismatch_cycle_exhausted"
              : "cpf_mismatch",
        details: {
          attemptsInCycle: updated.attempts_in_cycle,
          completedCycles: updated.completed_cycles,
          cooldownUntil: updated.cooldown_until,
          hardBlockUntil: updated.hard_block_until,
        },
      });

      return ok({
        client: null,
        guard: buildGuardPayload(updated, {
          status,
          shouldResetToStart,
        }),
      } as { client: ClientLookupResult | null; guard: LookupGuardPayload });
    }
    return ok({ client: null });
  }

  if (validCriteriaCount > 1) {
    const strictMatch = rankedCandidates.find((entry) => entry.score === validCriteriaCount)?.client ?? null;
    if (guardRow && guardMeta && strictMatch) {
      const updated = await updateLookupGuardRow(guardRow.id, {
        attempts_in_cycle: 0,
        completed_cycles: 0,
        cooldown_until: null,
        hard_block_until: null,
        last_attempt_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
      });
      await logLookupSecurityEvent({
        tenantId,
        actorKeyHash: guardMeta.actorKeyHash,
        phoneHash: guardMeta.phoneHash,
        phoneLast4: guardMeta.phoneLast4,
        eventType: "cpf_verified",
        details: {},
      });
      return ok({
        client: strictMatch,
        guard: buildGuardPayload(updated, { status: "ok" }),
      } as { client: ClientLookupResult | null; guard: LookupGuardPayload });
    }
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
