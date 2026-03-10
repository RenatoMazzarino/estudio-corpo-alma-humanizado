import { PageSkeleton, TableSkeleton } from "../../../components/ui/loading-system";

export default function ClientesLoading() {
  return (
    <div className="space-y-4 p-4">
      <PageSkeleton title="Carregando clientes..." sections={1} />
      <TableSkeleton rows={8} columns={4} />
    </div>
  );
}
