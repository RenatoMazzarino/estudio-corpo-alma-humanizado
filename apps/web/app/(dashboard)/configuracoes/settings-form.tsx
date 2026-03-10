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
import { BusinessHoursForm } from "./components/business-hours-form";
import { SpotifySettingsCard } from "./components/spotify-settings-card";
import { PixKeysSettingsCard } from "./components/pix-keys-settings-card";
import { AttendanceChecklistSettingsCard } from "./components/attendance-checklist-settings-card";
import { PointSettingsCard } from "./components/point-settings-card";
import { OnlineBookingRulesCard } from "./components/online-booking-rules-card";
import { PushNotificationsSettingsCard } from "./components/push-notifications-settings-card";
import type { BusinessHourItem, PixKeyItem, PixKeyType, PointDeviceItem } from "./components/settings-form.types";

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
  pixPaymentKeys: PixKeyItem[];
  attendanceChecklistEnabled: boolean;
  attendanceChecklistItems: string[];
  pushConfigured: boolean;
}

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
  pushConfigured,
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
  const [pixKeyTypeValue, setPixKeyTypeValue] = useState<PixKeyType>("cnpj");
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

  const formatPixTypeLabel = (type: PixKeyType) => {
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
      <BusinessHoursForm
        businessHours={businessHours}
        dayLabels={dayLabels}
        onSubmitAction={async (formData) => {
          const result = await saveBusinessHours(formData);
          if (!result.ok) {
            showToast(feedbackFromError(result.error, "generic"));
            return;
          }
          showToast(feedbackById("generic_saved", { tone: "success", message: "Horários atualizados." }));
        }}
      />

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
        <OnlineBookingRulesCard
          cutoffBeforeCloseMinutes={publicBookingCutoffBeforeCloseMinutes}
          lastSlotBeforeCloseMinutes={publicBookingLastSlotBeforeCloseMinutes}
        />
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

        <SpotifySettingsCard
          enabled={spotifyEnabledValue}
          playlistUrl={spotifyPlaylistUrlValue}
          connected={spotifyConnectedValue}
          accountName={spotifyAccountNameValue}
          disconnecting={spotifyDisconnecting}
          onEnabledChangeAction={setSpotifyEnabledValue}
          onPlaylistUrlChangeAction={setSpotifyPlaylistUrlValue}
          onDisconnectAction={() => void handleDisconnectSpotify()}
        />

        <PixKeysSettingsCard
          pixKeys={pixKeysValue}
          keyType={pixKeyTypeValue}
          keyValue={pixKeyInputValue}
          keyLabel={pixKeyLabelValue}
          saving={pixSaving}
          onKeyTypeChangeAction={setPixKeyTypeValue}
          onKeyValueChangeAction={setPixKeyInputValue}
          onKeyLabelChangeAction={setPixKeyLabelValue}
          onAddKeyAction={() => void handleAddPixKey()}
          onActivateKeyAction={(keyId) => void handleActivatePixKey(keyId)}
          onRemoveKeyAction={(keyId) => void handleRemovePixKey(keyId)}
          formatPixTypeLabelAction={formatPixTypeLabel}
        />

        <AttendanceChecklistSettingsCard
          enabled={attendanceChecklistEnabledValue}
          itemsText={attendanceChecklistItemsValue}
          onEnabledChangeAction={setAttendanceChecklistEnabledValue}
          onItemsTextChangeAction={setAttendanceChecklistItemsValue}
        />

        <PushNotificationsSettingsCard pushConfigured={pushConfigured} />

        <input type="hidden" name="mp_point_terminal_id" value={pointTerminalIdValue} />
        <input type="hidden" name="mp_point_terminal_name" value={pointTerminalNameValue} />
        <input type="hidden" name="mp_point_terminal_model" value={pointTerminalModelValue} />

        <PointSettingsCard
          enabled={pointEnabledValue}
          pointDevices={pointDevices}
          terminalId={pointTerminalIdValue}
          terminalExternalId={pointTerminalExternalIdValue}
          loadingDevices={pointLoading}
          configuring={pointConfigLoading}
          onEnabledChangeAction={setPointEnabledValue}
          onFetchDevicesAction={() => void handleFetchPointDevices()}
          onConfigureAction={() => void handleConfigurePoint()}
          onSelectDeviceAction={handleSelectPointDevice}
          onTerminalIdChangeAction={setPointTerminalIdValue}
          onTerminalExternalIdChangeAction={setPointTerminalExternalIdValue}
        />

        <button className="w-full bg-studio-green text-white font-bold py-3 rounded-2xl">Salvar configurações</button>
      </form>
    </div>
  );
}
