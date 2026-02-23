import { NextRequest, NextResponse } from "next/server";
import {
  getDashboardAccessForCurrentUser,
  getDashboardAuthRedirectPath,
  sanitizeDashboardNextPath,
} from "../../../../src/modules/auth/dashboard-access";

function resolveNextFromReferer(request: NextRequest, fallback = "/") {
  const referer = request.headers.get("referer")?.trim();
  if (!referer) return fallback;

  try {
    const refererUrl = new URL(referer);
    if (refererUrl.origin !== request.nextUrl.origin) {
      return fallback;
    }
    return sanitizeDashboardNextPath(`${refererUrl.pathname}${refererUrl.search}`, fallback);
  } catch {
    return fallback;
  }
}

export async function getDashboardApiAccess(request: NextRequest, fallbackNext = "/") {
  const access = await getDashboardAccessForCurrentUser();
  const next = resolveNextFromReferer(request, fallbackNext);
  const loginPath = getDashboardAuthRedirectPath({ next, reason: "forbidden" });

  return {
    access,
    next,
    loginPath,
    loginUrl: new URL(loginPath, request.nextUrl.origin),
  };
}

export function buildDashboardUnauthorizedJson(
  request: NextRequest,
  params: {
    loginPath: string;
    message?: string;
    extra?: Record<string, unknown>;
  }
) {
  return NextResponse.json(
    {
      ok: false,
      message: params.message ?? "Faça login para continuar.",
      loginRequired: true,
      loginUrl: new URL(params.loginPath, request.nextUrl.origin).toString(),
      ...params.extra,
    },
    { status: 401 }
  );
}

export function buildDashboardLoginRedirect(request: NextRequest, loginPath: string) {
  return NextResponse.redirect(new URL(loginPath, request.nextUrl.origin));
}

