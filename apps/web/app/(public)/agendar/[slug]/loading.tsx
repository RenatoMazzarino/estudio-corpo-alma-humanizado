import { PageSkeleton } from "../../../../components/ui/loading-system";

export default function AgendarLoading() {
  return <PageSkeleton title="Preparando agendamento..." sections={2} />;
}
