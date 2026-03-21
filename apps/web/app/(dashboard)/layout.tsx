import { Suspense } from "react";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { AppShell } from "../../components/app-shell";
import { PageSkeleton } from "../../components/ui/loading-system";
import { OneSignalBootstrap } from "../../components/push/one-signal-bootstrap";
import { getDashboardAccessForCurrentUser, getDashboardAuthRedirectPath } from "../../src/modules/auth/dashboard-access";
import { resolveOneSignalTenantConfig } from "../../src/modules/tenancy/provider-config";
import { getTenantRuntimeConfigById } from "../../src/modules/tenancy/runtime";
import { buildTenantThemeCssVars } from "../../src/modules/tenancy/theme-vars";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  noStore();
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    redirect(getDashboardAuthRedirectPath({ reason: access.reason }));
  }
  const [oneSignalConfig, tenantRuntime] = await Promise.all([
    resolveOneSignalTenantConfig(access.data.tenantId).catch(() => null),
    getTenantRuntimeConfigById(access.data.tenantId).catch(() => null),
  ]);
  const tenantThemeStyle = buildTenantThemeCssVars(tenantRuntime);

  return (
    <Suspense fallback={<PageSkeleton title="Carregando painel..." sections={2} />}>
      <AppShell themeStyle={tenantThemeStyle}>
        <OneSignalBootstrap
          externalId={access.data.userId}
          tenantId={access.data.tenantId}
          appId={oneSignalConfig?.appId ?? null}
          safariWebId={oneSignalConfig?.safariWebId ?? null}
        />
        {children}
      </AppShell>
    </Suspense>
  );
}
