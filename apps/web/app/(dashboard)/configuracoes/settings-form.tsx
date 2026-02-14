"use client";

import { useState } from "react";
import {
  configurePointTerminal,
  fetchPointDevices,
  saveBusinessHours,
  saveSettings,
} from "./actions";
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
  pointEnabled: boolean;
  pointTerminalId: string;
  pointTerminalName: string;
  pointTerminalModel: string;
  pointTerminalExternalId: string;
  attendanceChecklistEnabled: boolean;
  attendanceChecklistItems: string[];
}

type PointDeviceItem = {
  id: string;
  name: string;
  model: string | null;
  external_id: string | null;
  status: string | null;
};

const dayLabels = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function SettingsForm({
  businessHours,
  bufferBeforeMinutes,
  bufferAfterMinutes,
  signalPercentage,
  publicBaseUrl,
  pointEnabled,
  pointTerminalId,
  pointTerminalName,
  pointTerminalModel,
  pointTerminalExternalId,
  attendanceChecklistEnabled,
  attendanceChecklistItems,
}: SettingsFormProps) {
  const { toast, showToast } = useToast();
  const [pointDevices, setPointDevices] = useState<PointDeviceItem[]>([]);
  const [pointLoading, setPointLoading] = useState(false);
  const [pointConfigLoading, setPointConfigLoading] = useState(false);
  const [pointEnabledValue, setPointEnabledValue] = useState(pointEnabled);
  const [pointTerminalIdValue, setPointTerminalIdValue] = useState(pointTerminalId);
  const [pointTerminalNameValue, setPointTerminalNameValue] = useState(pointTerminalName);
  const [pointTerminalModelValue, setPointTerminalModelValue] = useState(pointTerminalModel);
  const [pointTerminalExternalIdValue, setPointTerminalExternalIdValue] = useState(pointTerminalExternalId);
  const [attendanceChecklistEnabledValue, setAttendanceChecklistEnabledValue] = useState(
    attendanceChecklistEnabled
  );
  const [attendanceChecklistItemsValue, setAttendanceChecklistItemsValue] = useState(
    attendanceChecklistItems.join("\n")
  );

  const handleFetchPointDevices = async () => {
    setPointLoading(true);
    const result = await fetchPointDevices();
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "generic"));
      setPointLoading(false);
      return;
    }
    setPointDevices(result.data.devices);
    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: `${result.data.devices.length} maquininha(s) encontrada(s).`,
      })
    );
    setPointLoading(false);
  };

  const handleSelectPointDevice = (deviceId: string) => {
    const selected = pointDevices.find((item) => item.id === deviceId);
    if (!selected) return;
    setPointTerminalIdValue(selected.id);
    setPointTerminalNameValue(selected.name);
    setPointTerminalModelValue(selected.model ?? "");
    if (!pointTerminalExternalIdValue && selected.external_id) {
      setPointTerminalExternalIdValue(selected.external_id);
    }
  };

  const handleConfigurePoint = async () => {
    if (!pointTerminalIdValue.trim()) {
      showToast(
        feedbackById("validation_required_fields", {
          message: "Selecione uma maquininha antes de configurar.",
        })
      );
      return;
    }
    if (!pointTerminalExternalIdValue.trim()) {
      showToast(
        feedbackById("validation_required_fields", {
          message: "Preencha o identificador externo (PDV) da maquininha.",
        })
      );
      return;
    }

    setPointConfigLoading(true);
    const result = await configurePointTerminal({
      terminalId: pointTerminalIdValue,
      externalId: pointTerminalExternalIdValue,
      terminalName: pointTerminalNameValue,
      terminalModel: pointTerminalModelValue,
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "generic"));
      setPointConfigLoading(false);
      return;
    }
    setPointEnabledValue(true);
    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: "Maquininha configurada em modo PDV.",
      })
    );
    setPointConfigLoading(false);
  };

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
          showToast(feedbackById("generic_saved", { tone: "success", message: "Horários atualizados." }));
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
          showToast(feedbackById("generic_saved", { tone: "success", message: "Configurações atualizadas." }));
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

        <div className="rounded-2xl border border-stone-200 p-4 space-y-3 bg-stone-50/60">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Checklist do atendimento</h3>
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                name="attendance_checklist_enabled"
                checked={attendanceChecklistEnabledValue}
                onChange={(event) => setAttendanceChecklistEnabledValue(event.target.checked)}
              />
              Exibir no atendimento
            </label>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Itens padrão (1 por linha)</label>
            <textarea
              name="attendance_checklist_items"
              value={attendanceChecklistItemsValue}
              onChange={(event) => setAttendanceChecklistItemsValue(event.target.value)}
              readOnly={!attendanceChecklistEnabledValue}
              rows={5}
              className={`mt-1 w-full border border-stone-200 rounded-xl py-2 px-3 text-sm ${
                attendanceChecklistEnabledValue ? "bg-white" : "bg-stone-100 text-gray-500"
              }`}
              placeholder={"Separar materiais e itens de higiene\nConfirmar endereço/portaria\nRever restrições (anamnese)"}
            />
          </div>

          <p className="text-[11px] text-gray-500">
            Quando desativado, o checklist não aparece na tela de atendimento.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 p-4 space-y-3 bg-stone-50/60">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Maquininha Point</h3>
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                name="mp_point_enabled"
                checked={pointEnabledValue}
                onChange={(event) => setPointEnabledValue(event.target.checked)}
              />
              Habilitada
            </label>
          </div>

          <input type="hidden" name="mp_point_terminal_id" value={pointTerminalIdValue} />
          <input type="hidden" name="mp_point_terminal_name" value={pointTerminalNameValue} />
          <input type="hidden" name="mp_point_terminal_model" value={pointTerminalModelValue} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleFetchPointDevices}
              disabled={pointLoading}
              className="h-10 rounded-xl border border-stone-200 bg-white text-xs font-bold text-studio-green disabled:opacity-60"
            >
              {pointLoading ? "Buscando..." : "Buscar maquininhas"}
            </button>
            <button
              type="button"
              onClick={handleConfigurePoint}
              disabled={pointConfigLoading}
              className="h-10 rounded-xl border border-studio-green bg-studio-green text-xs font-bold text-white disabled:opacity-60"
            >
              {pointConfigLoading ? "Configurando..." : "Configurar modo PDV"}
            </button>
          </div>

          {pointDevices.length > 0 && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase">Selecionar maquininha padrão</label>
              <select
                value={pointTerminalIdValue}
                onChange={(event) => handleSelectPointDevice(event.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm"
              >
                <option value="">Selecione...</option>
                {pointDevices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name} ({device.model ?? "Modelo não informado"}) {device.status ? `- ${device.status}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase">Terminal ID</label>
              <input
                type="text"
                value={pointTerminalIdValue}
                onChange={(event) => setPointTerminalIdValue(event.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm"
                placeholder="Ex.: PAX12345"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase">Identificador externo (PDV)</label>
              <input
                type="text"
                name="mp_point_terminal_external_id"
                value={pointTerminalExternalIdValue}
                onChange={(event) => setPointTerminalExternalIdValue(event.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm"
                placeholder="Ex.: studio-sala-1"
              />
            </div>
          </div>

          <p className="text-[11px] text-gray-500">
            Status: {pointTerminalIdValue ? "maquininha selecionada" : "nenhuma maquininha selecionada"}.
          </p>
        </div>

        <button className="w-full bg-studio-green text-white font-bold py-3 rounded-2xl">Salvar configurações</button>
      </form>
    </div>
  );
}
