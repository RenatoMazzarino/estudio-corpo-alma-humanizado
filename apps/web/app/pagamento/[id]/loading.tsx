import { PageSkeleton } from "../../../components/ui/loading-system";

export default function PagamentoLoading() {
  return <PageSkeleton title="Carregando checkout..." sections={2} />;
}
