import { ClientFormScreen } from "../components/client-form-screen";
import { createEmptyClientFormInitialData } from "../components/client-form-data";
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
      submitActionAction={createClientAction}
      searchClientsByNameAction={searchClientsByName}
    />
  );
}
