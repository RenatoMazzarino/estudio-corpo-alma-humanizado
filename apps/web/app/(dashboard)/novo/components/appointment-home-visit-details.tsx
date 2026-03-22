"use client";

import { MapPin, Plus } from "lucide-react";
import type { ClientAddress, DisplacementEstimate } from "../appointment-form.types";
import { buildAddressQuery, formatClientAddress } from "../appointment-form.helpers";
import { GoogleMapsAddressButton } from "./google-maps-address-button";

type AppointmentHomeVisitDetailsProps = {
  visible: boolean;
  clientAddresses: ClientAddress[];
  addressMode: "none" | "existing" | "new";
  showAddressSelectionList: boolean;
  selectedAddressId: string | null;
  selectedAddress: ClientAddress | null;
  addressLabel: string;
  mapsQuery: string;
  addressConfirmed: boolean;
  displacementStatus: "idle" | "loading" | "error";
  displacementEstimate: DisplacementEstimate | null;
  displacementError: string | null;
  manualDisplacementFee: string;
  onManualDisplacementFeeChangeAction: (value: string) => void;
  onZeroDisplacementFeeAction: () => void;
  onSelectExistingAddressAction: (id: string) => void;
  onOpenAddressCreateModalAction: () => void;
  onShowAddressSelectionListAction: (value: boolean) => void;
};

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 rounded-xl border border-line bg-white px-3 text-[10px] font-extrabold uppercase tracking-wide text-studio-text transition hover:bg-paper"
    >
      {label}
    </button>
  );
}

export function AppointmentHomeVisitDetails({
  visible,
  clientAddresses,
  addressMode,
  showAddressSelectionList,
  selectedAddressId,
  selectedAddress,
  addressLabel,
  mapsQuery,
  addressConfirmed,
  displacementStatus,
  displacementEstimate,
  displacementError,
  manualDisplacementFee,
  onManualDisplacementFeeChangeAction,
  onZeroDisplacementFeeAction,
  onSelectExistingAddressAction,
  onOpenAddressCreateModalAction,
  onShowAddressSelectionListAction,
}: AppointmentHomeVisitDetailsProps) {
  const hasSavedAddresses = clientAddresses.length > 0;
  const isManualSelected = addressMode === "new" && addressConfirmed;
  const showAddressTable =
    hasSavedAddresses && (addressMode === "existing" || showAddressSelectionList || !addressConfirmed);
  const showManualAddress = isManualSelected && !showAddressSelectionList;
  const manualAddressTitle = addressLabel || selectedAddress?.label || "Principal";
  const manualAddressText = mapsQuery || (selectedAddress ? formatClientAddress(selectedAddress) : "") || "Endereco informado";

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ${
        visible ? "mt-6 max-h-200 opacity-100" : "mt-0 max-h-0 opacity-0"
      }`}
    >
      <div className="wl-surface-card">
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5 wl-surface-card-header">
          <div className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-studio-text" />
            <p className="wl-typo-label text-studio-text">
              {showAddressTable ? "Enderecos cadastrados" : "Endereco do atendimento"}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAddressCreateModalAction}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-studio-green transition hover:bg-paper"
            aria-label="Cadastrar novo endereco"
            title="Cadastrar novo endereco"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-3 wl-surface-card-body">
          {showAddressTable ? (
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              {clientAddresses.map((address, index) => {
                const isSelected = address.id === selectedAddressId;
                const addressMapsQuery = buildAddressQuery({
                  logradouro: address.address_logradouro ?? "",
                  numero: address.address_numero ?? "",
                  complemento: address.address_complemento ?? "",
                  bairro: address.address_bairro ?? "",
                  cidade: address.address_cidade ?? "",
                  estado: address.address_estado ?? "",
                  cep: address.address_cep ?? "",
                });

                return (
                  <button
                    key={address.id}
                    type="button"
                    onClick={() => onSelectExistingAddressAction(address.id)}
                    className="flex w-full items-start gap-3 border-b border-line px-3 py-3 text-left last:border-b-0 hover:bg-paper"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-studio-green"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="wl-typo-body-sm-strong text-studio-text">
                        {index + 1}. {address.label || "Principal"}
                        {address.is_primary ? " - Principal" : ""}
                      </p>
                      <p className="wl-typo-body-sm pt-1 text-muted leading-snug">
                        {formatClientAddress(address) || "Endereco cadastrado"}
                      </p>
                    </div>

                    <GoogleMapsAddressButton query={addressMapsQuery} />
                  </button>
                );
              })}
            </div>
          ) : null}

          {showManualAddress ? (
            <div className="rounded-xl border border-line bg-white px-3 py-3">
              <p className="wl-typo-body-sm-strong text-studio-text">{manualAddressTitle}</p>
              <p className="wl-typo-body-sm pt-1 text-muted leading-snug">{manualAddressText}</p>
              <div className="mt-2 flex justify-end">
                <GoogleMapsAddressButton query={manualAddressText} />
              </div>
            </div>
          ) : null}

          {!hasSavedAddresses && !showManualAddress ? (
            <div className="rounded-xl border border-dashed border-line bg-white px-3 py-3">
              <p className="wl-typo-body-sm text-muted">
                Nenhum endereco cadastrado para este cliente. Use o botao + para cadastrar.
              </p>
            </div>
          ) : null}

          {!showAddressTable && hasSavedAddresses && !showManualAddress ? (
            <div className="flex">
              <ActionButton label="Ver enderecos cadastrados" onClick={() => onShowAddressSelectionListAction(true)} />
            </div>
          ) : null}

          {showManualAddress && hasSavedAddresses ? (
            <div className="flex">
              <ActionButton label="Usar cadastrado" onClick={() => onShowAddressSelectionListAction(true)} />
            </div>
          ) : null}

          <div className="border-t border-line pt-3">
            <div className="rounded-xl border border-line bg-studio-bg px-3 py-3">
              <p className="wl-typo-label text-studio-text">Taxa de deslocamento</p>

              {displacementStatus === "loading" ? (
                <p className="wl-typo-body-sm pt-2 text-studio-text">Calculando taxa de deslocamento...</p>
              ) : null}

              {displacementStatus !== "loading" && displacementEstimate ? (
                <p className="wl-typo-body-sm pt-2 text-muted">
                  Distancia estimada: {displacementEstimate.distanceKm.toFixed(2)} km.
                </p>
              ) : null}

              {displacementStatus === "error" && displacementError ? (
                <p className="wl-typo-body-sm pt-2 text-red-600">{displacementError}</p>
              ) : null}

              {displacementStatus === "idle" && !displacementEstimate ? (
                <p className="wl-typo-body-sm pt-2 text-muted">
                  Informe ou selecione um endereco para calcular a taxa recomendada.
                </p>
              ) : null}

              <div className="mt-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-serif text-muted">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={manualDisplacementFee}
                    onChange={(event) => onManualDisplacementFeeChangeAction(event.target.value)}
                    placeholder={displacementEstimate?.fee.toFixed(2).replace(".", ",") ?? "0,00"}
                    className="h-10 w-full rounded-xl border border-line wl-surface-input pl-9 pr-3 text-sm font-medium text-studio-text outline-none focus:border-studio-green focus:ring-1 focus:ring-studio-green/35"
                  />
                </div>

                <button
                  type="button"
                  onClick={onZeroDisplacementFeeAction}
                  className="h-10 rounded-xl border border-line bg-white px-3 text-[10px] font-extrabold uppercase tracking-wide text-studio-text hover:bg-paper"
                >
                  Zerar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
