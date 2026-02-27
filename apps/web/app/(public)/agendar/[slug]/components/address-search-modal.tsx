"use client";

import type { AddressSearchResult } from "../booking-flow.types";

type AddressSearchModalProps = {
  open: boolean;
  query: string;
  results: AddressSearchResult[];
  loading: boolean;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onSelectResult: (result: AddressSearchResult) => void;
};

export function AddressSearchModal({
  open,
  query,
  results,
  loading,
  onClose,
  onQueryChange,
  onSelectResult,
}: AddressSearchModalProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 rounded-t-4xl bg-white p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-studio-text">Buscar endereço</h3>
            <p className="text-xs text-gray-400">Digite rua, número, bairro...</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-50 text-gray-400 hover:bg-stone-100"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="w-full rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 text-sm font-medium text-gray-700"
            placeholder="Digite o endereço"
          />

          {loading && <p className="text-xs text-gray-400">Buscando endereços...</p>}
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {results.map((result) => (
              <button
                key={result.placeId}
                type="button"
                onClick={() => onSelectResult(result)}
                className="w-full rounded-2xl border border-stone-100 bg-white px-4 py-3 text-left text-sm text-gray-600 transition hover:border-studio-green hover:text-studio-green"
              >
                {result.label}
              </button>
            ))}
            {!loading && query.trim().length >= 3 && results.length === 0 && (
              <p className="text-xs text-gray-400">Nenhum endereço encontrado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
