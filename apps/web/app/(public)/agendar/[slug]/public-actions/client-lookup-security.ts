import crypto from "crypto";
import { headers } from "next/headers";
import { createServiceClient } from "../../../../../lib/supabase/service";
import { AppError } from "../../../../../src/shared/errors/AppError";
import { getServerEnv } from "../../../../../src/shared/env/server-env";

export type LookupGuardStatus = "ok" | "captcha_required" | "cooldown" | "blocked";

export type LookupGuardPayload = {
  status: LookupGuardStatus;
  cycle: number;
  attemptsInCycle: number;
  cooldownUntil: string | null;
  hardBlockUntil: string | null;
  captcha: { prompt: string; token: string } | null;
  shouldResetToStart?: boolean;
  shouldLogAlert?: boolean;
};

export type LookupGuardRow = {
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

const CAPTCHA_TTL_MINUTES = 10;

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getCaptchaSecret() {
  const configuredSecret = getServerEnv().BOOKING_LOOKUP_CAPTCHA_SECRET?.trim();

  if (configuredSecret) return configuredSecret;

  throw new AppError(
    "Configuração obrigatória ausente: defina BOOKING_LOOKUP_CAPTCHA_SECRET para validação de segurança do agendamento online.",
    "CONFIG_ERROR",
    500
  );
}

function signCaptchaPayload(payload: string) {
  return crypto.createHmac("sha256", getCaptchaSecret()).update(payload).digest("hex");
}

export function createLookupCaptchaChallenge(seed: string) {
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

export function verifyLookupCaptchaChallenge(token?: string, answerRaw?: string) {
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

export async function getLookupActorFingerprint(sessionId?: string) {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0]?.trim() || store.get("x-real-ip") || "unknown";
  const userAgent = store.get("user-agent") || "unknown";
  const session = (sessionId ?? "").trim() || "anonymous";
  return { ip, userAgent, session };
}

export function buildLookupActorHashes(params: {
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

export function buildGuardPayload(row: LookupGuardRow, overrides?: Partial<LookupGuardPayload>): LookupGuardPayload {
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

export function isFutureIso(value?: string | null) {
  if (!value) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && ms > Date.now();
}

export function requiresCaptchaForAttempt(row: LookupGuardRow) {
  const cycle = row.completed_cycles + 1;
  const nextAttempt = row.attempts_in_cycle + 1;
  if (cycle <= 1) {
    return nextAttempt >= 2;
  }
  return cycle === 2;
}

export async function logLookupSecurityEvent(params: {
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

export async function ensureLookupGuardRow(params: {
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

export async function updateLookupGuardRow(rowId: string, patch: Partial<LookupGuardRow>) {
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
