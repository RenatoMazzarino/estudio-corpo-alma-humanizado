import { notFound } from "next/navigation";
import { FIXED_TENANT_ID } from "../../../../lib/tenant-context";
import { AttendancePage } from "./attendance-page";
import { getAttendanceOverview } from "../../../../lib/attendance/attendance-repository";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ stage?: string }>;
}

export default async function AtendimentoPage(props: PageProps) {
  const params = await props.params;
  const resolvedSearchParams = await props.searchParams;
  const attendance = await getAttendanceOverview(FIXED_TENANT_ID, params.id);
  if (!attendance) {
    return notFound();
  }

  const stageParam = resolvedSearchParams?.stage;
  const initialStage =
    stageParam === "session" || stageParam === "checkout" || stageParam === "post"
      ? stageParam
      : "session";

  return <AttendancePage data={attendance} initialStage={initialStage} />;
}
