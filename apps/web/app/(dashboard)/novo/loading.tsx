import { PageSkeleton } from "../../../components/ui/loading-system";

export default function NovoAgendamentoLoading() {
  return <PageSkeleton title="Carregando novo agendamento..." sections={2} />;
}
