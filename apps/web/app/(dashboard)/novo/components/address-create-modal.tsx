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

  return createPortal(
    <div className="absolute inset-0 z-50 bg-black/40 flex items-end justify-center px-5 py-5 overflow-hidden overscroll-contain">
      <div className="w-full max-w-md max-h-full overflow-y-auto bg-white rounded-3xl shadow-float border border-line p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[11px] font-extrabold text-muted uppercase tracking-widest">Endereço</p>
            <h3 className="text-lg font-serif text-studio-text">
              {step === "chooser"
                ? "Cadastrar endereço"
                : step === "cep"
                  ? "Buscar por CEP"
                  : step === "search"
                    ? "Buscar por endereço"
                    : "Confirmar endereço"}
            </h3>
            <p className="text-xs text-muted mt-1">
              {step === "chooser"
                ? "Escolha como deseja localizar o endereço."
                : step === "form"
                  ? resolvedClientId
                    ? "Revise os dados e salve o endereço para este cliente."
                    : "Revise os dados. O endereço será salvo junto com o agendamento."
                  : "Preencha e confirme para continuar."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-studio-light text-studio-green flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step !== "chooser" && (
          <button
            type="button"
            onClick={onBackToChooser}
            className="mb-4 text-[11px] font-extrabold uppercase tracking-wide text-dom-strong"
          >
            Voltar
          </button>
        )}

        {step === "chooser" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={onOpenCepStep}
              className="w-full rounded-2xl border border-dom/45 bg-white px-4 py-3 text-left hover:border-dom/55 hover:bg-dom/10 transition"
            >
              <span className="text-[10px] font-extrabold uppercase text-dom-strong tracking-wide">
                Buscar por CEP
              </span>
              <span className="block text-xs text-dom-strong/80 mt-1">
                Digite o CEP e revise os dados antes de salvar.
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenSearchStep}
              className="w-full rounded-2xl border border-dom/45 bg-white px-4 py-3 text-left hover:border-dom/55 hover:bg-dom/10 transition"
            >
              <span className="text-[10px] font-extrabold uppercase text-dom-strong tracking-wide">
                Buscar por endereço
              </span>
              <span className="block text-xs text-dom-strong/80 mt-1">
                Digite rua/bairro e escolha o endereço correto.
              </span>
            </button>
          </div>
        )}

        {step === "cep" && (
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
              {cepDraftStatus === "error" && (
                <p className="text-[11px] text-red-500 mt-2 ml-1">CEP inválido. Verifique e tente novamente.</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  const found = await onCepDraftLookup();
                  if (!found) return;
                  onApplyAddressDraftFields(found);
                  onOpenFormStep();
                }}
                disabled={cepDraftStatus === "loading"}
                className="w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-900/10 disabled:opacity-70"
              >
                {cepDraftStatus === "loading" ? "Buscando..." : "Buscar CEP"}
              </button>
            </div>
          </div>
        )}

        {step === "search" && (
          <div>
            <div className="mb-3">
              <label className={labelClass}>Endereço</label>
              <div className="relative">
                <Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={addressSearchQuery}
                  onChange={(event) => onAddressSearchQueryChange(event.target.value)}
                  className={inputWithIconClass}
                />
              </div>
              <p className="text-[10px] text-muted mt-2 ml-1">Ex: Rua das Acácias, 120, Moema</p>
              {addressSearchError && <p className="text-[11px] text-red-500 mt-2 ml-1">{addressSearchError}</p>}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {addressSearchLoading && <p className="text-[11px] text-muted">Buscando endereços...</p>}
              {!addressSearchLoading && addressSearchQuery.trim().length < 3 && (
                <p className="text-[11px] text-muted">Digite pelo menos 3 caracteres para iniciar.</p>
              )}
              {!addressSearchLoading && addressSearchQuery.trim().length >= 3 && addressSearchResults.length === 0 && (
                <p className="text-[11px] text-muted">Nenhum endereço encontrado.</p>
              )}
              {addressSearchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={async () => {
                    const ok = await onSelectAddressSearchResult(result);
                    if (ok) onOpenFormStep();
                  }}
                  className="w-full text-left px-4 py-3 rounded-2xl border border-stone-100 hover:border-stone-200 hover:bg-stone-50 transition"
                >
                  <p className="text-sm font-semibold text-studio-text">{result.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "form" && (
          <div className="space-y-3">
            {addressSaveError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {addressSaveError}
              </div>
            )}

            <div>
              <label className={labelClass}>Identificação</label>
              <input
                type="text"
                value={addressLabel}
                onChange={(event) => onAddressLabelChange(event.target.value)}
                className={inputClass}
                placeholder="Principal"
              />
            </div>

            <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clientAddressesCount === 0 ? true : addressIsPrimaryDraft}
                  onChange={(event) => onAddressIsPrimaryDraftChange(event.target.checked)}
                  disabled={clientAddressesCount === 0}
                  className="h-4 w-4 rounded border-stone-300 text-studio-green focus:ring-studio-green"
                />
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-studio-text">
                    Definir como endereço principal
                  </p>
                  <p className="text-[10px] text-muted">
                    {clientAddressesCount === 0
                      ? "Primeiro endereço do cliente será principal automaticamente."
                      : "O endereço principal será selecionado por padrão nos próximos agendamentos."}
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className={labelClass}>CEP</label>
              <input
                type="text"
                value={cep}
                onChange={(event) => onCepChange(event.target.value)}
                inputMode="numeric"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Rua / Avenida</label>
              <input
                type="text"
                value={logradouro}
                onChange={(event) => onLogradouroChange(event.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={labelClass}>Número</label>
                <input type="text" value={numero} onChange={(event) => onNumeroChange(event.target.value)} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Complemento</label>
                <input
                  type="text"
                  value={complemento}
                  onChange={(event) => onComplementoChange(event.target.value)}
                  className={inputClass}
                />
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
                className="w-full h-12 rounded-2xl bg-white border border-line text-studio-text font-extrabold text-xs uppercase tracking-wide disabled:opacity-70"
              >
                Buscar novamente
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={addressSavePending}
                className="w-full h-12 rounded-2xl bg-studio-green text-white font-extrabold text-xs uppercase tracking-wide shadow-lg shadow-green-900/10 disabled:opacity-70"
              >
                {addressSavePending ? "Salvando..." : "Salvar endereço"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    portalTarget
  );
}
