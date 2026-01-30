import { FIXED_TENANT_ID } from "../../lib/tenant-context";
import { Service } from "../../types/service";
import { CatalogoView } from "./catalogo-view";
import { listServices } from "../../src/modules/services/repository";

export const dynamic = 'force-dynamic';

export default async function CatalogoPage() {
  const { data } = await listServices(FIXED_TENANT_ID);

  const services = (data as Service[]) || [];

  return (
    <CatalogoView initialServices={services} />
  );
}
