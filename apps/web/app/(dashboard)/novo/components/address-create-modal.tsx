import { Search, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { AddressModalStep, AddressSearchResult } from "../appointment-form.types";

type CepLookupResult = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
};

interface AddressCreateModalProps {
  portalTarget: HTMLElement | null;
  open: boolean;
  step: AddressModalStep;
  resolvedClientId: string | null;
  labelClass: string;
  inputClass: string;
  inputWithIconClass: string;
  addressSaveError: string | null;
  addressLabel: string;
  onAddressLabelChange: (value: string) => void;
  clientAddressesCount: number;
  addressIsPrimaryDraft: boolean;
  onAddressIsPrimaryDraftChange: (checked: boolean) => void;
  cep: string;
  onCepChange: (value: string) => void;
  logradouro: string;
  onLogradouroChange: (value: string) => void;
  numero: string;
  onNumeroChange: (value: string) => void;
  complemento: string;
  onComplementoChange: (value: string) => void;
  bairro: string;
  onBairroChange: (value: string) => void;
  cidade: string;
  onCidadeChange: (value: string) => void;
  estado: string;
  onEstadoChange: (value: string) => void;
  addressSavePending: boolean;
  cepDraft: string;
  cepDraftStatus: "idle" | "loading" | "error" | "success";
  onCepDraftChange: (value: string) => void;
  onCepDraftLookup: () => Promise<CepLookupResult | null>;
  onApplyAddressDraftFields: (value: CepLookupResult) => void;
  addressSearchQuery: string;
  onAddressSearchQueryChange: (value: string) => void;
  addressSearchResults: AddressSearchResult[];
  addressSearchLoading: boolean;
  addressSearchError: string | null;
  onSelectAddressSearchResult: (result: AddressSearchResult) => Promise<boolean>;
  onClose: () => void;
  onBackToChooser: () => void;
  onOpenCepStep: () => void;
  onOpenSearchStep: () => void;
  onOpenFormStep: () => void;
  onSave: () => void;
}

export function AddressCreateModal({
  portalTarget,
  open,
  step,
  resolvedClientId,
  labelClass,
  inputClass,
  inputWithIconClass,
  addressSaveError,
  addressLabel,
  onAddressLabelChange,
  clientAddressesCount,
  addressIsPrimaryDraft,
  onAddressIsPrimaryDraftChange,
  cep,
  onCepChange,
  logradouro,
  onLogradouroChange,
  numero,
  onNumeroChange,
  complemento,
  onComplementoChange,
  bairro,
  onBairroChange,
  cidade,
  onCidadeChange,
  estado,
  onEstadoChange,
  addressSavePending,
  cepDraft,
  cepDraftStatus,
  onCepDraftChange,
  onCepDraftLookup,
  onApplyAddressDraftFields,
  addressSearchQuery,
  onAddressSearchQueryChange,
  addressSearchResults,
  addressSearchLoading,
  addressSearchError,
  onSelectAddressSearchResult,
  onClose,
  onBackToChooser,
  onOpenCepStep,
  onOpenSearchStep,
  onOpenFormStep,
  onSave,
}: AddressCreateModalProps) {
  if (!portalTarget || !open) return null;

  const isFormStep = step === "form";
  const activeLookupStep = step === "search" ? "search" : "cep";

  return createPortal(
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-contain bg-black/45 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl wl-surface-modal shadow-float">
        <div className="wl-sheet-header-surface flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/85">Endereco</p>
            <h3 className="wl-typo-card-name-sm truncate text-white">
              {isFormStep ? "Confirmar endereco" : "Buscar endereco"}
            </h3>
            <p className="pt-1 text-xs text-white/85">
              {isFormStep
                ? resolvedClientId
                  ? "Revise os dados e salve para este cliente."
                  : "Revise os dados e continue o agendamento."
                : "Selecione o modo de busca e complete os dados."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-studio-green transition hover:bg-paper"
            aria-label="Fechar"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[72vh] space-y-4 overflow-y-auto px-4 py-4 wl-surface-modal-body">
          {!isFormStep ? (
            <>
              <div className="flex items-center gap-5 border-b border-line">
                <button
                  type="button"
                  onClick={onOpenCepStep}
                  className={`relative pb-2 text-[13px] font-semibold transition-colors ${
                    activeLookupStep === "cep" ? "text-studio-green" : "text-muted hover:text-studio-green"
                  }`}
                >
                  Buscar por CEP
                  <span
                    className={`absolute inset-x-0 -bottom-px h-0.5 bg-studio-green transition-opacity ${
                      activeLookupStep === "cep" ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={onOpenSearchStep}
                  className={`relative pb-2 text-[13px] font-semibold transition-colors ${
                    activeLookupStep === "search" ? "text-studio-green" : "text-muted hover:text-studio-green"
                  }`}
                >
                  Buscar por endereco
                  <span
                    className={`absolute inset-x-0 -bottom-px h-0.5 bg-studio-green transition-opacity ${
                      activeLookupStep === "search" ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </button>
              </div>

              {activeLookupStep === "cep" ? (
                <div>
                  <div className="mb-4">
                    <label className={labelClass}>CEP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cepDraft}
                      onChange={(event) => onCepDraftChange(event.target.value)}
                      className={inputClass}
                    />
                    {cepDraftStatus === "error" ? (
                      <p className="ml-1 mt-2 text-[11px] text-red-600">CEP invalido. Verifique e tente novamente.</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const found = await onCepDraftLookup();
                      if (!found) return;
                      onApplyAddressDraftFields(found);
                      onOpenFormStep();
                    }}
                    disabled={cepDraftStatus === "loading"}
                    className="wl-typo-button h-11 w-full rounded-xl bg-studio-green text-white shadow-lg shadow-studio-green/30 disabled:opacity-70"
                  >
                    {cepDraftStatus === "loading" ? "Buscando..." : "Buscar CEP"}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-3">
                    <label className={labelClass}>Endereco</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                      <input
                        type="text"
                        value={addressSearchQuery}
                        onChange={(event) => onAddressSearchQueryChange(event.target.value)}
                        className={inputWithIconClass}
                      />
                    </div>
                    <p className="ml-1 mt-2 text-[10px] text-muted">Ex: Rua das Acacias, 120, Moema</p>
                    {addressSearchError ? <p className="ml-1 mt-2 text-[11px] text-red-600">{addressSearchError}</p> : null}
                  </div>

                  <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                    {addressSearchLoading ? <p className="text-[11px] text-muted">Buscando enderecos...</p> : null}
                    {!addressSearchLoading && addressSearchQuery.trim().length < 3 ? (
                      <p className="text-[11px] text-muted">Digite pelo menos 3 caracteres para iniciar.</p>
                    ) : null}
                    {!addressSearchLoading && addressSearchQuery.trim().length >= 3 && addressSearchResults.length === 0 ? (
                      <p className="text-[11px] text-muted">Nenhum endereco encontrado.</p>
                    ) : null}

                    {addressSearchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={async () => {
                          const ok = await onSelectAddressSearchResult(result);
                          if (ok) onOpenFormStep();
                        }}
                        className="w-full rounded-xl border border-line bg-white px-4 py-3 text-left transition hover:bg-paper"
                      >
                        <p className="text-sm font-semibold text-studio-text">{result.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {addressSaveError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{addressSaveError}</div>
              ) : null}

              <div>
                <label className={labelClass}>Identificacao</label>
                <input
                  type="text"
                  value={addressLabel}
                  onChange={(event) => onAddressLabelChange(event.target.value)}
                  className={inputClass}
                  placeholder="Principal"
                />
              </div>

              <div className="rounded-xl border border-line bg-studio-bg px-4 py-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={clientAddressesCount === 0 ? true : addressIsPrimaryDraft}
                    onChange={(event) => onAddressIsPrimaryDraftChange(event.target.checked)}
                    disabled={clientAddressesCount === 0}
                    className="h-4 w-4 rounded border-stone-300 text-studio-green focus:ring-studio-green"
                  />
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-studio-text">Definir como principal</p>
                    <p className="text-[10px] text-muted">
                      {clientAddressesCount === 0
                        ? "Primeiro endereco sera principal automaticamente."
                        : "Endereco principal sera usado por padrao nos proximos agendamentos."}
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className={labelClass}>CEP</label>
                <input type="text" value={cep} onChange={(event) => onCepChange(event.target.value)} inputMode="numeric" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Rua / Avenida</label>
                <input type="text" value={logradouro} onChange={(event) => onLogradouroChange(event.target.value)} className={inputClass} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelClass}>Numero</label>
                  <input type="text" value={numero} onChange={(event) => onNumeroChange(event.target.value)} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Complemento</label>
                  <input type="text" value={complemento} onChange={(event) => onComplementoChange(event.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Bairro</label>
                  <input type="text" value={bairro} onChange={(event) => onBairroChange(event.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Cidade</label>
                  <input type="text" value={cidade} onChange={(event) => onCidadeChange(event.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Estado (UF)</label>
                <input
                  type="text"
                  value={estado}
                  onChange={(event) => onEstadoChange(event.target.value)}
                  maxLength={2}
                  className={`${inputClass} uppercase`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onBackToChooser}
                  disabled={addressSavePending}
                  className="wl-typo-button h-11 w-full rounded-xl border border-line bg-white text-studio-text disabled:opacity-70"
                >
                  Voltar para busca
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={addressSavePending}
                  className="wl-typo-button h-11 w-full rounded-xl bg-studio-green text-white shadow-lg shadow-studio-green/30 disabled:opacity-70"
                >
                  {addressSavePending ? "Salvando..." : "Salvar endereco"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    portalTarget
  );
}
