import { notFound } from "next/navigation";

import { ModulePage } from "../../../../components/ui/module-page";
import { requireDashboardAccessForPage } from "../../../../src/modules/auth/dashboard-access";
import { getClientDetailSnapshot } from "../../../../src/modules/clients/profile-data";
import { ClientProfile } from "./client-profile";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientProfilePage(props: PageProps) {
  const { tenantId } = await requireDashboardAccessForPage("/clientes");
  const params = await props.params;
  const snapshot = await getClientDetailSnapshot(tenantId, params.id);

  if (!snapshot) {
    notFound();
  }

  return (
    <ModulePage header={null} contentClassName="flex-1">
      <ClientProfile snapshot={snapshot} />
    </ModulePage>
  );
}
