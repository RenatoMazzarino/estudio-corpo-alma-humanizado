"use client";

import type { PointDeviceItem } from "./settings-form.types";

type PointSettingsCardProps = {
  enabled: boolean;
  pointDevices: PointDeviceItem[];
  terminalId: string;
  terminalExternalId: string;
  loadingDevices: boolean;
  configuring: boolean;
  onEnabledChange: (value: boolean) => void;
  onFetchDevices: () => void;
  onConfigure: () => void;
  onSelectDevice: (deviceId: string) => void;
  onTerminalIdChange: (value: string) => void;
  onTerminalExternalIdChange: (value: string) => void;
};

export function PointSettingsCard({
  enabled,
  pointDevices,
  terminalId,
  terminalExternalId,
  loadingDevices,
  configuring,
  onEnabledChange,
  onFetchDevices,
  onConfigure,
  onSelectDevice,
  onTerminalIdChange,
  onTerminalExternalIdChange,
}: PointSettingsCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 p-4 space-y-3 bg-stone-50/60">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Maquininha Point</h3>
        <label className="inline-flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            name="mp_point_enabled"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
          />
          Habilitada
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onFetchDevices}
          disabled={loadingDevices}
          className="h-10 rounded-xl border border-stone-200 bg-white text-xs font-bold text-studio-green disabled:opacity-60"
        >
          {loadingDevices ? "Buscando..." : "Buscar maquininhas"}
        </button>
        <button
          type="button"
          onClick={onConfigure}
          disabled={configuring}
          className="h-10 rounded-xl border border-studio-green bg-studio-green text-xs font-bold text-white disabled:opacity-60"
        >
          {configuring ? "Configurando..." : "Configurar modo PDV"}
        </button>
      </div>

      {pointDevices.length > 0 && (
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-gray-500 uppercase">Selecionar maquininha padrão</label>
          <select
            value={terminalId}
            onChange={(event) => onSelectDevice(event.target.value)}
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
            value={terminalId}
            onChange={(event) => onTerminalIdChange(event.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm"
            placeholder="Ex.: PAX12345"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase">Identificador externo (PDV)</label>
          <input
            type="text"
            name="mp_point_terminal_external_id"
            value={terminalExternalId}
            onChange={(event) => onTerminalExternalIdChange(event.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm"
            placeholder="Ex.: studio-sala-1"
          />
        </div>
      </div>

      <p className="text-[11px] text-gray-500">
        Status: {terminalId ? "maquininha selecionada" : "nenhuma maquininha selecionada"}.
      </p>
    </div>
  );
}
