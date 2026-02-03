import { notFound } from "next/navigation";
import { FIXED_TENANT_ID } from "../../../../lib/tenant-context";
import { AttendanceV4Page } from "./attendance-v4-page";
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
    stageParam === "pre" || stageParam === "session" || stageParam === "checkout" || stageParam === "post"
      ? stageParam
      : "pre";

  return <AttendanceV4Page data={attendance} initialStage={initialStage} />;
}
