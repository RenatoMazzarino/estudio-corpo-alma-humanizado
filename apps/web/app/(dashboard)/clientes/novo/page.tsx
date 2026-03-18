import { createEmptyClientFormInitialData, ClientFormScreen } from "../components/client-form-screen";
import { createClientAction, searchClientsByName } from "./actions";

export default function NewClientPage() {
  return (
    <ClientFormScreen
      mode="create"
      title="Novo Cliente"
      subtitle="Cadastre o cliente e mantenha o histórico sempre atualizado."
      submitLabel="Salvar cliente"
      backHref="/clientes"
      submitMode="form-action"
      initialData={createEmptyClientFormInitialData()}
      submitAction={createClientAction}
      searchClientsByNameAction={searchClientsByName}
    />
  );
}
