import { ChevronLeft, Settings } from "lucide-react";
import Link from "next/link";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { getSettings, listBusinessHours } from "../../../src/modules/settings/repository";
import { SettingsForm } from "./settings-form";

export default async function ConfiguracoesPage() {
  const { data: businessHoursData } = await listBusinessHours(FIXED_TENANT_ID);
  const { data: settingsData } = await getSettings(FIXED_TENANT_ID);

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
      />
    </div>
  );
}
