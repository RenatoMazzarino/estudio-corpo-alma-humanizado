"use client";

import { useState } from "react";
import {
  activatePixKey,
  addPixKey,
  configurePointTerminal,
  disconnectSpotify,
  fetchPointDevices,
  removePixKey,
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
  publicBookingCutoffBeforeCloseMinutes: number;
  publicBookingLastSlotBeforeCloseMinutes: number;
  publicBaseUrl: string;
  pointEnabled: boolean;
  pointTerminalId: string;
  pointTerminalName: string;
  pointTerminalModel: string;
  pointTerminalExternalId: string;
  spotifyEnabled: boolean;
  spotifyPlaylistUrl: string;
  spotifyConnected: boolean;
  spotifyAccountName: string;
  pixPaymentKeys: Array<{
    id: string;
    keyType: "cnpj" | "cpf" | "email" | "phone" | "evp";
    keyValue: string;
    label: string;
    isActive: boolean;
  }>;
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
  publicBookingCutoffBeforeCloseMinutes,
  publicBookingLastSlotBeforeCloseMinutes,
  publicBaseUrl,
  pointEnabled,
  pointTerminalId,
  pointTerminalName,
  pointTerminalModel,
  pointTerminalExternalId,
  spotifyEnabled,
  spotifyPlaylistUrl,
  spotifyConnected,
  spotifyAccountName,
  pixPaymentKeys,
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
  const [spotifyEnabledValue, setSpotifyEnabledValue] = useState(spotifyEnabled);
  const [spotifyPlaylistUrlValue, setSpotifyPlaylistUrlValue] = useState(spotifyPlaylistUrl);
  const [spotifyConnectedValue, setSpotifyConnectedValue] = useState(spotifyConnected);
  const [spotifyAccountNameValue, setSpotifyAccountNameValue] = useState(spotifyAccountName);
  const [spotifyDisconnecting, setSpotifyDisconnecting] = useState(false);
  const [pixKeysValue, setPixKeysValue] = useState(pixPaymentKeys);
  const [pixKeyTypeValue, setPixKeyTypeValue] = useState<"cnpj" | "cpf" | "email" | "phone" | "evp">("cnpj");
  const [pixKeyInputValue, setPixKeyInputValue] = useState("");
  const [pixKeyLabelValue, setPixKeyLabelValue] = useState("");
  const [pixSaving, setPixSaving] = useState(false);
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

  const handleDisconnectSpotify = async () => {
    setSpotifyDisconnecting(true);
    const result = await disconnectSpotify();
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "generic"));
      setSpotifyDisconnecting(false);
      return;
    }
    setSpotifyConnectedValue(false);
    setSpotifyAccountNameValue("");
    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: "Spotify desconectado com sucesso.",
      })
    );
    setSpotifyDisconnecting(false);
  };

  const handleAddPixKey = async () => {
    setPixSaving(true);
    const result = await addPixKey({
      keyType: pixKeyTypeValue,
      keyValue: pixKeyInputValue,
      label: pixKeyLabelValue,
      makeActive: pixKeysValue.length === 0,
    });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "generic"));
      setPixSaving(false);
      return;
    }

    setPixKeysValue(
      result.data.keys.map((item) => ({
        id: item.id,
        keyType: item.key_type,
        keyValue: item.key_value,
        label: item.label ?? "",
        isActive: item.is_active,
      }))
    );
    setPixKeyInputValue("");
    setPixKeyLabelValue("");
    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: "Chave Pix cadastrada.",
      })
    );
    setPixSaving(false);
  };

  const handleActivatePixKey = async (keyId: string) => {
    setPixSaving(true);
    const result = await activatePixKey({ keyId });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "generic"));
      setPixSaving(false);
      return;
    }
    setPixKeysValue(
      result.data.keys.map((item) => ({
        id: item.id,
        keyType: item.key_type,
        keyValue: item.key_value,
        label: item.label ?? "",
        isActive: item.is_active,
      }))
    );
    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: "Chave Pix ativa atualizada.",
      })
    );
    setPixSaving(false);
  };

  const handleRemovePixKey = async (keyId: string) => {
    setPixSaving(true);
    const result = await removePixKey({ keyId });
    if (!result.ok) {
      showToast(feedbackFromError(result.error, "generic"));
      setPixSaving(false);
      return;
    }
    setPixKeysValue(
      result.data.keys.map((item) => ({
        id: item.id,
        keyType: item.key_type,
        keyValue: item.key_value,
        label: item.label ?? "",
        isActive: item.is_active,
      }))
    );
    showToast(
      feedbackById("generic_saved", {
        tone: "success",
        message: "Chave Pix removida.",
      })
    );
    setPixSaving(false);
  };

  const formatPixTypeLabel = (type: "cnpj" | "cpf" | "email" | "phone" | "evp") => {
    switch (type) {
      case "cnpj":
        return "CNPJ";
      case "cpf":
        return "CPF";
      case "email":
        return "E-mail";
      case "phone":
        return "Telefone";
      case "evp":
        return "Aleatória";
      default:
        return "Chave";
    }
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
        <div className="rounded-2xl border border-stone-200 p-4 space-y-3 bg-stone-50/60">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Regras do agendamento online
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">
                Bloquear no dia a partir de (min antes de fechar)
              </label>
              <input
                type="number"
                name="public_booking_cutoff_before_close_minutes"
                min={0}
                step={1}
                defaultValue={publicBookingCutoffBeforeCloseMinutes}
                className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm"
              />
              <p className="mt-1 text-[10px] text-gray-500">
                Ex.: 60 = após faltar 1h para fechar, não aceita novo agendamento online no mesmo dia.
              </p>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">
                Último horário online (min antes de fechar)
              </label>
              <input
                type="number"
                name="public_booking_last_slot_before_close_minutes"
                min={0}
                step={1}
                defaultValue={publicBookingLastSlotBeforeCloseMinutes}
                className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm"
              />
              <p className="mt-1 text-[10px] text-gray-500">
                Ex.: 30 = se fecha às 18:00, último horário online fica 17:30.
              </p>
            </div>
          </div>
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
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Spotify (atendimento)</h3>
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                name="spotify_enabled"
                checked={spotifyEnabledValue}
                onChange={(event) => setSpotifyEnabledValue(event.target.checked)}
              />
              Habilitado
            </label>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Playlist padrão</label>
            <input
              type="text"
              name="spotify_playlist_url"
              value={spotifyPlaylistUrlValue}
              onChange={(event) => setSpotifyPlaylistUrlValue(event.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
              className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm"
            />
            <p className="mt-1 text-[10px] text-gray-500">
              Usada como fallback quando não existir playback ativo.
            </p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white px-3 py-2">
            <p className="text-[11px] font-bold text-gray-600">
              Status: {spotifyConnectedValue ? "Conectado" : "Desconectado"}
            </p>
            <p className="text-[10px] text-gray-500">
              {spotifyConnectedValue
                ? `Conta: ${spotifyAccountNameValue || "Conta conectada"}`
                : "Clique em Conectar Spotify para autorizar a conta."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href="/api/integrations/spotify/connect?returnTo=/configuracoes"
              className="h-10 rounded-xl border border-studio-green bg-studio-green text-xs font-bold text-white inline-flex items-center justify-center"
            >
              Conectar Spotify
            </a>
            <button
              type="button"
              onClick={handleDisconnectSpotify}
              disabled={!spotifyConnectedValue || spotifyDisconnecting}
              className="h-10 rounded-xl border border-stone-200 bg-white text-xs font-bold text-gray-700 disabled:opacity-50"
            >
              {spotifyDisconnecting ? "Desconectando..." : "Desconectar"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 p-4 space-y-3 bg-stone-50/60">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Pix por chave (checkout interno)</h3>
            <span className="text-[11px] text-gray-500">
              {pixKeysValue.find((item) => item.isActive)?.label || "Nenhuma chave ativa"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={pixKeyTypeValue}
              onChange={(event) =>
                setPixKeyTypeValue(event.target.value as "cnpj" | "cpf" | "email" | "phone" | "evp")
              }
              className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm"
            >
              <option value="cnpj">CNPJ</option>
              <option value="cpf">CPF</option>
              <option value="email">E-mail</option>
              <option value="phone">Telefone</option>
              <option value="evp">Aleatória (EVP)</option>
            </select>
            <input
              type="text"
              value={pixKeyInputValue}
              onChange={(event) => setPixKeyInputValue(event.target.value)}
              placeholder="Digite a chave"
              className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm sm:col-span-2"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={pixKeyLabelValue}
              onChange={(event) => setPixKeyLabelValue(event.target.value)}
              placeholder="Rótulo (ex.: CNPJ principal)"
              className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm"
            />
            <button
              type="button"
              onClick={handleAddPixKey}
              disabled={pixSaving}
              className="h-10 rounded-xl border border-studio-green bg-studio-green text-xs font-bold text-white disabled:opacity-60"
            >
              {pixSaving ? "Salvando..." : "Adicionar chave"}
            </button>
          </div>

          <div className="space-y-2">
            {pixKeysValue.length === 0 ? (
              <p className="text-[11px] text-gray-500">Nenhuma chave cadastrada.</p>
            ) : (
              pixKeysValue.map((pixKey) => (
                <div
                  key={pixKey.id}
                  className={`rounded-xl border px-3 py-2 ${
                    pixKey.isActive ? "border-studio-green bg-white" : "border-stone-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-studio-text truncate">
                        {pixKey.label || `${formatPixTypeLabel(pixKey.keyType)} sem rótulo`}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {formatPixTypeLabel(pixKey.keyType)}: {pixKey.keyValue}
                      </p>
                    </div>
                    {pixKey.isActive ? (
                      <span className="rounded-full border border-studio-green/30 bg-studio-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-studio-green">
                        Ativa
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {!pixKey.isActive ? (
                      <button
                        type="button"
                        onClick={() => void handleActivatePixKey(pixKey.id)}
                        disabled={pixSaving}
                        className="h-8 rounded-lg border border-studio-green px-3 text-[10px] font-bold uppercase tracking-wide text-studio-green disabled:opacity-60"
                      >
                        Usar esta chave
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleRemovePixKey(pixKey.id)}
                      disabled={pixSaving}
                      className="h-8 rounded-lg border border-stone-200 px-3 text-[10px] font-bold uppercase tracking-wide text-gray-600 disabled:opacity-60"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="text-[11px] text-gray-500">
            A chave ativa será usada no checkout interno em &quot;PIX Chave&quot;.
          </p>
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
