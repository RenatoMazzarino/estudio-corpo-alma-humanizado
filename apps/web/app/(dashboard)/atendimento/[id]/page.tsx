import { notFound } from "next/navigation";
import { FIXED_TENANT_ID } from "../../../../lib/tenant-context";
import { AttendancePage } from "./attendance-page";
import { getAttendanceOverview } from "../../../../lib/attendance/attendance-repository";
import { getSettings, listPixPaymentKeys } from "../../../../src/modules/settings/repository";
import { DEFAULT_PUBLIC_BASE_URL } from "../../../../src/shared/config";
import { getAutoMessageTemplates } from "../../../../src/shared/auto-messages";

interface PageProps {
  params: Promise<{ id: string }>;
}

const PIX_KEY_TYPES = ["cnpj", "cpf", "email", "phone", "evp"] as const;

export default async function AtendimentoPage(props: PageProps) {
  const params = await props.params;
  const [attendance, settingsResult, pixKeysResult] = await Promise.all([
    getAttendanceOverview(FIXED_TENANT_ID, params.id),
    getSettings(FIXED_TENANT_ID),
    listPixPaymentKeys(FIXED_TENANT_ID),
  ]);

  if (!attendance) {
    return notFound();
  }

  const settings = settingsResult.data;
  const pixKeys = pixKeysResult.data ?? [];
  const activePixKey = pixKeys.find((item) => item.is_active) ?? pixKeys[0] ?? null;
  const activePixKeyType =
    activePixKey && PIX_KEY_TYPES.includes(activePixKey.key_type as (typeof PIX_KEY_TYPES)[number])
      ? (activePixKey.key_type as (typeof PIX_KEY_TYPES)[number])
      : null;
  const messageTemplates = getAutoMessageTemplates();

  return (
    <AttendancePage
      data={attendance}
      pointEnabled={settings?.mp_point_enabled ?? false}
      pointTerminalName={settings?.mp_point_terminal_name ?? ""}
      pointTerminalModel={settings?.mp_point_terminal_model ?? ""}
      checklistEnabled={settings?.attendance_checklist_enabled ?? true}
      publicBaseUrl={settings?.public_base_url ?? DEFAULT_PUBLIC_BASE_URL}
      pixKeyValue={activePixKey?.key_value ?? ""}
      pixKeyType={activePixKeyType}
      messageTemplates={messageTemplates}
    />
  );
}
