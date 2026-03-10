import { PageSkeleton } from "../../../../components/ui/loading-system";

export default function ComprovantePagamentoLoading() {
  return <PageSkeleton title="Carregando recibo de pagamento..." sections={1} />;
}
