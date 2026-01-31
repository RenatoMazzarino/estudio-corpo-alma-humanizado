import { ChevronLeft, Settings } from "lucide-react";
import Link from "next/link";
import { FIXED_TENANT_ID } from "../../../lib/tenant-context";
import { getSettings, listBusinessHours } from "../../../src/modules/settings/repository";
import { SettingsForm } from "./settings-form";

export default async function ConfiguracoesPage() {
  const { data: businessHoursData } = await listBusinessHours(FIXED_TENANT_ID);
  const { data: settingsData } = await getSettings(FIXED_TENANT_ID);

  const businessHours = (businessHoursData ?? []).map((item) => ({
    day_of_week: item.day_of_week,
    open_time: item.open_time,
    close_time: item.close_time,
    is_closed: item.is_closed,
  }));

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
        defaultStudioBuffer={settingsData?.default_studio_buffer ?? 30}
        defaultHomeBuffer={settingsData?.default_home_buffer ?? 60}
      />
    </div>
  );
}
