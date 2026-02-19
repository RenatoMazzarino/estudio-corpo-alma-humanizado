import { ChevronLeft, Settings } from "lucide-react";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { getSettings, listBusinessHours, listPixPaymentKeys } from "../../../src/modules/settings/repository";
import { DEFAULT_PUBLIC_BASE_URL } from "../../../src/shared/config";
import { SettingsForm } from "./settings-form";

const PIX_KEY_TYPES = ["cnpj", "cpf", "email", "phone", "evp"] as const;

export default async function ConfiguracoesPage() {
  noStore();
  const [{ data: businessHoursData }, { data: settingsData }, { data: pixKeysData }] = await Promise.all([
    listBusinessHours(FIXED_TENANT_ID),
    getSettings(FIXED_TENANT_ID),
    listPixPaymentKeys(FIXED_TENANT_ID),
  ]);

  const normalized = new Map<number, { open_time: string; close_time: string; is_closed: boolean | null }>();
  (businessHoursData ?? []).forEach((item) => {
    if (item.day_of_week === null || item.day_of_week === undefined) return;
    normalized.set(item.day_of_week, {
      open_time: item.open_time,
      close_time: item.close_time,
      is_closed: item.is_closed,
    });
  });

  const businessHours = Array.from({ length: 7 }, (_, day) => {
    const existing = normalized.get(day);
    return {
      day_of_week: day,
      open_time: existing?.open_time ?? "08:00",
      close_time: existing?.close_time ?? "18:00",
      is_closed: existing?.is_closed ?? false,
    };
  });

  const attendanceChecklistItems = Array.isArray(settingsData?.attendance_checklist_items)
    ? settingsData.attendance_checklist_items
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/menu" className="p-2 bg-white rounded-full text-gray-600 shadow-sm border border-stone-100">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex items-center gap-2 text-gray-800">
          <Settings size={18} className="text-studio-green" />
          <h1 className="text-lg font-bold">Configurações</h1>
        </div>
      </div>

      <SettingsForm
        businessHours={businessHours}
        bufferBeforeMinutes={
          settingsData?.buffer_before_minutes ??
          settingsData?.default_studio_buffer ??
          30
        }
        bufferAfterMinutes={
          settingsData?.buffer_after_minutes ??
          settingsData?.default_studio_buffer ??
          30
        }
        signalPercentage={settingsData?.signal_percentage ?? 30}
        publicBaseUrl={settingsData?.public_base_url ?? DEFAULT_PUBLIC_BASE_URL}
        pointEnabled={settingsData?.mp_point_enabled ?? false}
        pointTerminalId={settingsData?.mp_point_terminal_id ?? ""}
        pointTerminalName={settingsData?.mp_point_terminal_name ?? ""}
        pointTerminalModel={settingsData?.mp_point_terminal_model ?? ""}
        pointTerminalExternalId={settingsData?.mp_point_terminal_external_id ?? ""}
        spotifyEnabled={settingsData?.spotify_enabled ?? false}
        spotifyPlaylistUrl={settingsData?.spotify_playlist_url ?? ""}
        spotifyConnected={Boolean(settingsData?.spotify_account_id || settingsData?.spotify_refresh_token)}
        spotifyAccountName={settingsData?.spotify_account_name ?? ""}
        pixPaymentKeys={
          (pixKeysData ?? []).map((key) => ({
            id: key.id,
            keyType: PIX_KEY_TYPES.includes(key.key_type as (typeof PIX_KEY_TYPES)[number])
              ? (key.key_type as (typeof PIX_KEY_TYPES)[number])
              : "cnpj",
            keyValue: key.key_value,
            label: key.label ?? "",
            isActive: key.is_active,
          }))
        }
        attendanceChecklistEnabled={settingsData?.attendance_checklist_enabled ?? true}
        attendanceChecklistItems={attendanceChecklistItems}
      />
    </div>
  );
}
