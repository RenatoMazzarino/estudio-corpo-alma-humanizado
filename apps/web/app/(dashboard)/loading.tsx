import { PageSkeleton } from "../../components/ui/loading-system";

export default function DashboardLoading() {
  return <PageSkeleton title="Carregando dashboard..." sections={3} />;
}
