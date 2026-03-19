import { NextRequest, NextResponse } from "next/server";
import { AppError } from "../../../../../src/shared/errors/AppError";
import { getDashboardAccessForCurrentUser } from "../../../../../src/modules/auth/dashboard-access";
import { assertTenantPermission } from "../../../../../src/modules/auth/tenant-permissions";
import { getTenantOperationalOverview } from "../../../../../src/modules/tenancy/overview";

function resolveTenantId(request: NextRequest, fallbackTenantId: string) {
  const requestedTenantId = request.nextUrl.searchParams.get("tenantId")?.trim() ?? "";
  return requestedTenantId || fallbackTenantId;
}

export async function GET(request: NextRequest) {
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertTenantPermission({
      role: access.data.role,
      module: "whitelabel",
      action: "read",
    });

    const tenantId = resolveTenantId(request, access.data.tenantId);
    if (tenantId !== access.data.tenantId) {
      throw new AppError(
        "Acesso entre tenants não permitido neste endpoint.",
        "UNAUTHORIZED",
        403
      );
    }

    const overview = await getTenantOperationalOverview(tenantId);
    return NextResponse.json({ ok: true, overview });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: error.status || 500 }
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao carregar overview operacional do tenant.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
