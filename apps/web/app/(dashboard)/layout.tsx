import { Suspense } from "react";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { AppShell } from "../../components/app-shell";
import { getDashboardAccessForCurrentUser, getDashboardAuthRedirectPath } from "../../src/modules/auth/dashboard-access";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  noStore();
  const access = await getDashboardAccessForCurrentUser();
  if (!access.ok) {
    redirect(getDashboardAuthRedirectPath({ reason: access.reason }));
  }

  return (
    <Suspense fallback={null}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
