import { notFound } from "next/navigation";

import { ModulePage } from "../../../../../components/ui/module-page";
import { requireDashboardAccessForPage } from "../../../../../src/modules/auth/dashboard-access";
import { getClientDetailSnapshot } from "../../../../../src/modules/clients/profile-data";
import { createClientFormInitialDataFromSnapshot } from "../../components/client-form-data";
import { ClientFormScreen } from "../../components/client-form-screen";
import { updateClientProfile } from "../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClientPage(props: PageProps) {
  const { tenantId } = await requireDashboardAccessForPage("/clientes");
  const params = await props.params;
  const snapshot = await getClientDetailSnapshot(tenantId, params.id);

  if (!snapshot) {
    notFound();
  }

  return (
    <ModulePage header={null} contentClassName="flex-1">
      <ClientFormScreen
        mode="edit"
        title="Editar Cliente"
        subtitle="Mantenha o cadastro completo e alinhado com o prontuário e o agendamento."
        submitLabel="Salvar alterações"
        backHref={`/clientes/${snapshot.client.id}`}
        submitMode="imperative"
        initialData={createClientFormInitialDataFromSnapshot(snapshot)}
        submitActionAction={updateClientProfile}
        successRedirectHref={`/clientes/${snapshot.client.id}`}
      />
    </ModulePage>
  );
}
