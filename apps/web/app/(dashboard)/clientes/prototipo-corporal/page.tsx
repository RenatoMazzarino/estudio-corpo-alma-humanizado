import { requireDashboardAccessForPage } from "../../../../src/modules/auth/dashboard-access";
import { PatientsBodymapPathsDemo } from "./patients-bodymap-paths-demo";

export default async function ClientesBodymapPrototypePage() {
  await requireDashboardAccessForPage("/clientes");

  return <PatientsBodymapPathsDemo />;
}
