"use client";

import type { BusinessHourItem } from "./settings-form.types";

type BusinessHoursFormProps = {
  businessHours: BusinessHourItem[];
  dayLabels: string[];
  onSubmitAction: (formData: FormData) => Promise<void>;
};

export function BusinessHoursForm({ businessHours, dayLabels, onSubmitAction }: BusinessHoursFormProps) {
  return (
    <form action={onSubmitAction} className="bg-white p-6 rounded-3xl border border-stone-100 space-y-4">
      <h2 className="text-sm font-bold text-gray-700">Horários de Funcionamento</h2>
      <div className="space-y-3">
        {businessHours.map((day) => (
          <div key={day.day_of_week} className="grid grid-cols-4 gap-3 items-center">
            <div className="text-sm font-medium text-gray-600">{dayLabels[day.day_of_week]}</div>
            <input
              type="time"
              name={`day_${day.day_of_week}_open`}
              defaultValue={day.open_time}
              className="w-full bg-stone-50 border border-stone-100 rounded-xl py-2 px-3 text-sm"
            />
            <input
              type="time"
              name={`day_${day.day_of_week}_close`}
              defaultValue={day.close_time}
              className="w-full bg-stone-50 border border-stone-100 rounded-xl py-2 px-3 text-sm"
            />
            <label className="flex items-center gap-2 text-xs text-gray-500">
              <input
                type="checkbox"
                name={`day_${day.day_of_week}_closed`}
                defaultChecked={Boolean(day.is_closed)}
              />
              Fechado
            </label>
          </div>
        ))}
      </div>
      <button className="w-full bg-studio-green text-white font-bold py-3 rounded-2xl">Salvar horários</button>
    </form>
  );
}
