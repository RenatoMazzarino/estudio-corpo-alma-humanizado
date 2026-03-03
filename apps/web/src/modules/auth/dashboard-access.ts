import type { User } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "../../../lib/supabase/server";
import { createServiceClient } from "../../../lib/supabase/service";


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

async function listDashboardAccessByEmail(email: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("dashboard_access_users")
    .select("id, tenant_id, email, role, is_active, auth_user_id, updated_at")
    .eq("email", email)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(25);

  return {
    data: (data ?? []) as Array<DashboardAccessRow & { updated_at?: string | null }>,
    error: error as { message?: string } | null,
  };
}

function resolveMembershipCandidate(
  rows: Array<DashboardAccessRow & { updated_at?: string | null }>,
  userId: string
) {
  const linkedToUser = rows.find((row) => row.auth_user_id === userId);
  if (linkedToUser) return linkedToUser;

  const anyUnlinked = rows.find((row) => !row.auth_user_id);
  if (anyUnlinked) return anyUnlinked;

  return rows[0] ?? null;
}

async function ensureDashboardAccessRow(email: string, userId: string) {
  const listResult = await listDashboardAccessByEmail(email);
  if (listResult.error) return { data: null as DashboardAccessRow | null, error: listResult.error };

  const chosen = resolveMembershipCandidate(listResult.data, userId);
  return { data: (chosen ?? null) as DashboardAccessRow | null, error: null };
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

export async function authorizeDashboardSupabaseUser(user: User): Promise<DashboardAccessResult> {
  const email = normalizeEmail(user.email);
  if (!email) {
    return { ok: false, reason: "missing_email" };
  }

  const lookup = await ensureDashboardAccessRow(email, user.id);

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

  return authorizeDashboardSupabaseUser(user);
}

export function getDashboardAuthRedirectPath(params?: {
  next?: string | null;
  reason?:
    | DashboardAccessFailureReason
    | "signed_out"
    | "oauth_error"
    | "forbidden"
    | "dev_login_error"
    | "dev_login_disabled";
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

export async function requireDashboardAccessForPage(next: string = "/") {
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    redirect(getDashboardAuthRedirectPath({ next, reason: "forbidden" }));
  }
  return access.data;
}

export async function requireDashboardAccessForServerAction(next: string = "/") {
  let resolvedNext = next;
  try {
    const headerStore = await headers();
    const referer = headerStore.get("referer")?.trim();
    if (referer) {
      const refererUrl = new URL(referer);
      resolvedNext = sanitizeDashboardNextPath(`${refererUrl.pathname}${refererUrl.search}`, next);
    }
  } catch {
    resolvedNext = next;
  }

  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    redirect(getDashboardAuthRedirectPath({ next: resolvedNext, reason: "forbidden" }));
  }
  return access.data;
}
