import { PageSkeleton, CardSkeleton } from "../../../../components/ui/loading-system";

export default function AtendimentoLoading() {
  return (
    <div className="space-y-4 p-4">
      <PageSkeleton title="Carregando atendimento..." sections={1} />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
