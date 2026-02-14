import { notFound } from "next/navigation";
import { FIXED_TENANT_ID } from "../../../../lib/tenant-context";
import { AttendancePage } from "./attendance-page";
import { getAttendanceOverview } from "../../../../lib/attendance/attendance-repository";
import { getSettings } from "../../../../src/modules/settings/repository";
import { DEFAULT_PUBLIC_BASE_URL } from "../../../../src/shared/config";
import { getAutoMessageTemplates } from "../../../../src/shared/auto-messages";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AtendimentoPage(props: PageProps) {
  const params = await props.params;
  const [attendance, settingsResult] = await Promise.all([
    getAttendanceOverview(FIXED_TENANT_ID, params.id),
    getSettings(FIXED_TENANT_ID),
  ]);

  if (!attendance) {
    return notFound();
  }

  const settings = settingsResult.data;
  const messageTemplates = getAutoMessageTemplates();

  return (
    <AttendancePage
      data={attendance}
      pointEnabled={settings?.mp_point_enabled ?? false}
      pointTerminalName={settings?.mp_point_terminal_name ?? ""}
      pointTerminalModel={settings?.mp_point_terminal_model ?? ""}
      checklistEnabled={settings?.attendance_checklist_enabled ?? true}
      publicBaseUrl={settings?.public_base_url ?? DEFAULT_PUBLIC_BASE_URL}
      messageTemplates={messageTemplates}
    />
  );
}
