import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { FIXED_TENANT_ID } from "../../../../lib/tenant-context";
import { getAppointmentById } from "../../../../src/modules/appointments/repository";
import { AppointmentDetailsPage } from "./appointment-details-page";
import { AttendanceV4Page } from "./attendance-v4-page";
import { getAttendanceOverview } from "../../../../lib/attendance/attendance-repository";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ stage?: string }>;
}

export default async function AtendimentoPage(props: PageProps) {
  const params = await props.params;
  const resolvedSearchParams = await props.searchParams;
  const useV4 = process.env.NEXT_PUBLIC_ATTENDANCE_UIV4 === "1";

  if (useV4) {
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

  const { data: appointment } = await getAppointmentById(FIXED_TENANT_ID, params.id);

  if (!appointment) {
    return notFound();
  }

  const serviceDuration =
    (appointment as { services?: { duration_minutes: number | null } | null }).services?.duration_minutes ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 bg-white rounded-full text-gray-600 shadow-sm border border-stone-100">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-800">Atendimento</h1>
          <p className="text-xs text-gray-500">Detalhes, evolução e checkout</p>
        </div>
      </div>

      <AppointmentDetailsPage
        appointment={{
          ...appointment,
          service_duration_minutes: serviceDuration,
        }}
      />
    </div>
  );
}
