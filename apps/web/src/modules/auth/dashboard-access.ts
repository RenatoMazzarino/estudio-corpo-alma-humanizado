import type { User } from "@supabase/supabase-js";
import { createClient as createServerClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";

export type DashboardAccessRole = "owner" | "admin" | "staff" | "viewer";

export type DashboardAccessContext = {
  userId: string;
  email: string;
  tenantId: string;
  role: DashboardAccessRole;
  membershipId: string;
};

type DashboardAccessFailureReason =
  | "unauthenticated"
  | "missing_email"
  | "not_allowed"
  | "account_conflict"
  | "system_error";

type DashboardAccessResult =
  | { ok: true; data: DashboardAccessContext }
  | { ok: false; reason: DashboardAccessFailureReason };

type DashboardAccessRow = {
  id: string;
  tenant_id: string;
  email: string;
  role: DashboardAccessRole;
  is_active: boolean;
  auth_user_id: string | null;
};

type QueryResult<T> = {
  data: T | null;
  error: { message?: string } | null;
};

type DashboardAccessQueryChain = {
  eq: (column: string, value: unknown) => DashboardAccessQueryChain;
  select: (columns: string) => DashboardAccessQueryChain;
  maybeSingle: () => Promise<QueryResult<DashboardAccessRow>>;
  single: () => Promise<QueryResult<DashboardAccessRow>>;
};

type DashboardAccessTableChain = {
  select: (columns: string) => DashboardAccessQueryChain;
  upsert: (payload: unknown, options?: { onConflict?: string }) => DashboardAccessQueryChain;
  update: (payload: unknown) => DashboardAccessQueryChain;
};

type DashboardAccessSupabaseClient = {
  from: (table: "dashboard_access_users") => DashboardAccessTableChain;
};

function getDashboardAccessTableClient(): DashboardAccessSupabaseClient {
  return createServiceClient() as unknown as DashboardAccessSupabaseClient;
}

function normalizeEmail(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function sanitizeInternalPath(raw: string | null | undefined, fallback = "/") {
  const value = (raw ?? "").trim();
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\") || value.includes("\0")) return fallback;
  return value;
}

function getAllowedBootstrapEmailsFromEnv() {
  const raw = process.env.DASHBOARD_ALLOWED_GOOGLE_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => normalizeEmail(email))
      .filter((email): email is string => Boolean(email))
  );
}

async function findDashboardAccessByEmail(email: string) {
  const supabase = getDashboardAccessTableClient();
  const { data, error } = await supabase
    .from("dashboard_access_users")
    .select("id, tenant_id, email, role, is_active, auth_user_id")
    .eq("tenant_id", FIXED_TENANT_ID)
    .eq("email", email)
    .maybeSingle();

  return { data: (data ?? null) as DashboardAccessRow | null, error };
}

async function createDashboardAccessBootstrap(email: string) {
  const allowed = getAllowedBootstrapEmailsFromEnv();
  if (!allowed.has(email)) {
    return { data: null as DashboardAccessRow | null, error: null };
  }

  const role: DashboardAccessRole = email.includes("janaina") ? "owner" : "admin";
  const supabase = getDashboardAccessTableClient();
  const { data, error } = await supabase
    .from("dashboard_access_users")
    .upsert(
      {
        tenant_id: FIXED_TENANT_ID,
        email,
        role,
        is_active: true,
      },
      { onConflict: "tenant_id,email" }
    )
    .select("id, tenant_id, email, role, is_active, auth_user_id")
    .single();

  return { data: (data ?? null) as DashboardAccessRow | null, error };
}

async function linkAuthUserToDashboardAccess(row: DashboardAccessRow, user: User) {
  const supabase = getDashboardAccessTableClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("dashboard_access_users")
    .update({
      auth_user_id: user.id,
      linked_at: row.auth_user_id ? undefined : now,
      last_login_at: now,
      updated_at: now,
    })
    .eq("id", row.id)
    .eq("tenant_id", row.tenant_id)
    .select("id, tenant_id, email, role, is_active, auth_user_id")
    .single();

  return { data: (data ?? null) as DashboardAccessRow | null, error };
}

async function touchDashboardAccessLastLogin(row: DashboardAccessRow) {
  const supabase = getDashboardAccessTableClient();
  const now = new Date().toISOString();
  await supabase
    .from("dashboard_access_users")
    .update({ last_login_at: now, updated_at: now })
    .eq("id", row.id)
    .eq("tenant_id", row.tenant_id);
}

async function authorizeSupabaseUser(user: User): Promise<DashboardAccessResult> {
  const email = normalizeEmail(user.email);
  if (!email) {
    return { ok: false, reason: "missing_email" };
  }

  let lookup = await findDashboardAccessByEmail(email);
  if (!lookup.data && !lookup.error) {
    lookup = await createDashboardAccessBootstrap(email);
  }

  if (lookup.error) {
    return { ok: false, reason: "system_error" };
  }
  if (!lookup.data || !lookup.data.is_active) {
    return { ok: false, reason: "not_allowed" };
  }

  if (lookup.data.auth_user_id && lookup.data.auth_user_id !== user.id) {
    return { ok: false, reason: "account_conflict" };
  }

  let membership = lookup.data;
  if (!membership.auth_user_id) {
    const linked = await linkAuthUserToDashboardAccess(membership, user);
    if (linked.error || !linked.data) {
      return { ok: false, reason: "system_error" };
    }
    membership = linked.data;
  } else {
    void touchDashboardAccessLastLogin(membership);
  }

  return {
    ok: true,
    data: {
      userId: user.id,
      email,
      tenantId: membership.tenant_id,
      role: membership.role,
      membershipId: membership.id,
    },
  };
}

export async function getDashboardAccessForCurrentUser(): Promise<DashboardAccessResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, reason: "unauthenticated" };
  }

  return authorizeSupabaseUser(user);
}

export function getDashboardAuthRedirectPath(params?: {
  next?: string | null;
  reason?: DashboardAccessFailureReason | "signed_out" | "oauth_error" | "forbidden";
}) {
  const next = sanitizeInternalPath(params?.next, "/");
  const search = new URLSearchParams();
  if (next && next !== "/") {
    search.set("next", next);
  }
  if (params?.reason && params.reason !== "unauthenticated") {
    search.set("reason", params.reason);
  }
  const qs = search.toString();
  return qs ? `/auth/login?${qs}` : "/auth/login";
}

export function sanitizeDashboardNextPath(raw: string | null | undefined, fallback = "/") {
  return sanitizeInternalPath(raw, fallback);
}
