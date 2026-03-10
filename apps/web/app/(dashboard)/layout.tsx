import { Suspense } from "react";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { AppShell } from "../../components/app-shell";
import { PageSkeleton } from "../../components/ui/loading-system";
import { OneSignalBootstrap } from "../../components/push/one-signal-bootstrap";
import { getDashboardAccessForCurrentUser, getDashboardAuthRedirectPath } from "../../src/modules/auth/dashboard-access";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  noStore();
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    redirect(getDashboardAuthRedirectPath({ reason: access.reason }));
  }

  return (
    <Suspense fallback={<PageSkeleton title="Carregando painel..." sections={2} />}>
      <AppShell>
        <OneSignalBootstrap externalId={access.data.userId} tenantId={access.data.tenantId} />
        {children}
      </AppShell>
    </Suspense>
  );
}
