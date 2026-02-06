import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { Service } from "../../../types/service";
import { CatalogoView } from "./catalogo-view";
import { listServices } from "../../../src/modules/services/repository";
import { getSettings } from "../../../src/modules/settings/repository";

export const dynamic = 'force-dynamic';

export default async function CatalogoPage() {
  const [{ data }, { data: settings }] = await Promise.all([
    listServices(FIXED_TENANT_ID),
    getSettings(FIXED_TENANT_ID),
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
