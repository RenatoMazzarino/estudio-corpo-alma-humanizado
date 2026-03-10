"use client";

import type { PixKeyItem, PixKeyType } from "./settings-form.types";

type PixKeysSettingsCardProps = {
  pixKeys: PixKeyItem[];
  keyType: PixKeyType;
  keyValue: string;
  keyLabel: string;
  saving: boolean;
  onKeyTypeChangeAction: (value: PixKeyType) => void;
  onKeyValueChangeAction: (value: string) => void;
  onKeyLabelChangeAction: (value: string) => void;
  onAddKeyAction: () => void;
  onActivateKeyAction: (keyId: string) => void;
  onRemoveKeyAction: (keyId: string) => void;
  formatPixTypeLabelAction: (type: PixKeyType) => string;
};

export function PixKeysSettingsCard({
  pixKeys,
  keyType,
  keyValue,
  keyLabel,
  saving,
  onKeyTypeChangeAction,
  onKeyValueChangeAction,
  onKeyLabelChangeAction,
  onAddKeyAction,
  onActivateKeyAction,
  onRemoveKeyAction,
  formatPixTypeLabelAction,
}: PixKeysSettingsCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 p-4 space-y-3 bg-stone-50/60">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Pix por chave (checkout interno)</h3>
        <span className="text-[11px] text-gray-500">
          {pixKeys.find((item) => item.isActive)?.label || "Nenhuma chave ativa"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select
          value={keyType}
          onChange={(event) => onKeyTypeChangeAction(event.target.value as PixKeyType)}
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
          value={keyValue}
          onChange={(event) => onKeyValueChangeAction(event.target.value)}
          placeholder="Digite a chave"
          className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm sm:col-span-2"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          value={keyLabel}
          onChange={(event) => onKeyLabelChangeAction(event.target.value)}
          placeholder="Rótulo (ex.: CNPJ principal)"
          className="w-full bg-white border border-stone-200 rounded-xl py-2 px-3 text-sm"
        />
        <button
          type="button"
          onClick={onAddKeyAction}
          disabled={saving}
          className="h-10 rounded-xl border border-studio-green bg-studio-green text-xs font-bold text-white disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Adicionar chave"}
        </button>
      </div>

      <div className="space-y-2">
        {pixKeys.length === 0 ? (
          <p className="text-[11px] text-gray-500">Nenhuma chave cadastrada.</p>
        ) : (
          pixKeys.map((pixKey) => (
            <div
              key={pixKey.id}
              className={`rounded-xl border px-3 py-2 ${
                pixKey.isActive ? "border-studio-green bg-white" : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-studio-text truncate">
                    {pixKey.label || `${formatPixTypeLabelAction(pixKey.keyType)} sem rótulo`}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {formatPixTypeLabelAction(pixKey.keyType)}: {pixKey.keyValue}
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
                    onClick={() => onActivateKeyAction(pixKey.id)}
                    disabled={saving}
                    className="h-8 rounded-lg border border-studio-green px-3 text-[10px] font-bold uppercase tracking-wide text-studio-green disabled:opacity-60"
                  >
                    Usar esta chave
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemoveKeyAction(pixKey.id)}
                  disabled={saving}
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
  );
}
