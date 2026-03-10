import { PageSkeleton } from "../../../components/ui/loading-system";

export default function VoucherLoading() {
  return <PageSkeleton title="Carregando voucher..." sections={1} />;
}
