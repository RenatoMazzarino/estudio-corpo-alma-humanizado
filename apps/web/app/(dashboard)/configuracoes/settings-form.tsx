"use client";

import { saveBusinessHours, saveSettings } from "./actions";
import { Toast, useToast } from "../../../components/ui/toast";
import { feedbackById, feedbackFromError } from "../../../src/shared/feedback/user-feedback";

interface BusinessHourItem {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean | null;
}

interface SettingsFormProps {
  businessHours: BusinessHourItem[];
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  signalPercentage: number;
  publicBaseUrl: string;
}

const dayLabels = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function SettingsForm({
  businessHours,
  bufferBeforeMinutes,
  bufferAfterMinutes,
  signalPercentage,
  publicBaseUrl,
}: SettingsFormProps) {
  const { toast, showToast } = useToast();

  return (
    <div className="space-y-6">
      <Toast toast={toast} />
      <form
        action={async (formData) => {
          const result = await saveBusinessHours(formData);
          if (!result.ok) {
            showToast(feedbackFromError(result.error, "generic"));
            return;
          }
          showToast(feedbackById("generic_saved", { tone: "success", message: "Horarios atualizados." }));
        }}
        className="bg-white p-6 rounded-3xl border border-stone-100 space-y-4"
      >
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

      <form
        action={async (formData) => {
          const result = await saveSettings(formData);
          if (!result.ok) {
            showToast(feedbackFromError(result.error, "generic"));
            return;
          }
          showToast(feedbackById("generic_saved", { tone: "success", message: "Configuracoes atualizadas." }));
        }}
        className="bg-white p-6 rounded-3xl border border-stone-100 space-y-4"
      >
        <h2 className="text-sm font-bold text-gray-700">Buffers de Atendimento</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Antes (min)</label>
            <input
              type="number"
              name="buffer_before_minutes"
              defaultValue={bufferBeforeMinutes}
              className="w-full bg-stone-50 border border-stone-100 rounded-xl py-2 px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Depois (min)</label>
            <input
              type="number"
              name="buffer_after_minutes"
              defaultValue={bufferAfterMinutes}
              className="w-full bg-stone-50 border border-stone-100 rounded-xl py-2 px-3 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Percentual do sinal (%)</label>
          <input
            type="number"
            name="signal_percentage"
            min={0}
            max={100}
            step={1}
            defaultValue={signalPercentage}
            className="w-full bg-stone-50 border border-stone-100 rounded-xl py-2 px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">URL pública (para links no WhatsApp)</label>
          <input
            type="text"
            name="public_base_url"
            defaultValue={publicBaseUrl}
            placeholder="https://seu-dominio.com"
            className="w-full bg-stone-50 border border-stone-100 rounded-xl py-2 px-3 text-sm"
          />
        </div>
        <button className="w-full bg-studio-green text-white font-bold py-3 rounded-2xl">Salvar configurações</button>
      </form>
    </div>
  );
}
