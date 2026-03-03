import { Service } from "../../../types/service";
import { CatalogoView } from "./catalogo-view";
import { listServices } from "../../../src/modules/services/repository";
import { getSettings } from "../../../src/modules/settings/repository";
import { requireDashboardAccessForPage } from "../../../src/modules/auth/dashboard-access";

export const dynamic = 'force-dynamic';

export default async function CatalogoPage() {
  const { tenantId } = await requireDashboardAccessForPage("/catalogo");
  const [{ data }, { data: settings }] = await Promise.all([
    listServices(tenantId),
    getSettings(tenantId),
  ]);

  const services = (data as Service[]) || [];

  return (
    <CatalogoView
      initialServices={services}
      defaultBufferBefore={settings?.buffer_before_minutes ?? null}
      defaultBufferAfter={settings?.buffer_after_minutes ?? null}
    />
  );
}
