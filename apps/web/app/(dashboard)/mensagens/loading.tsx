import { PageSkeleton, TableSkeleton } from "../../../components/ui/loading-system";

export default function MensagensLoading() {
  return (
    <div className="space-y-4 p-4">
      <PageSkeleton title="Carregando módulo de mensagens..." sections={1} />
      <TableSkeleton rows={6} columns={6} />
    </div>
  );
}
