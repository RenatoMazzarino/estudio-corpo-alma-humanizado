"use client";

import { MapPin } from "lucide-react";
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
  return (
    <div
      className={`transition-all duration-300 overflow-hidden ${
        visible ? "max-h-200 opacity-100 mt-6" : "max-h-0 opacity-0 mt-0"
      }`}
    >
      <div className="space-y-4">
        {clientAddresses.length > 1 && addressMode === "existing" && showAddressSelectionList && (
          <div className="bg-dom/20 rounded-2xl border border-dom/35 p-4">
            <div className="flex items-center gap-2 mb-3 text-dom-strong">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-extrabold uppercase tracking-wide">Endereços cadastrados</span>
            </div>
            <div className="space-y-2">
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
                  <div
                    key={address.id}
                    className={`rounded-2xl border p-3 ${
                      isSelected ? "border-dom/55 bg-white" : "border-dom/25 bg-white/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-dom-strong">
                          {index + 1}. {address.label || "Principal"}
                          {address.is_primary ? " • Principal" : ""}
                        </p>
                        <p className="text-sm font-semibold text-studio-text leading-snug">
                          {formatClientAddress(address) || "Endereço cadastrado"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <GoogleMapsAddressButton query={addressMapsQuery} />
                        <button
                          type="button"
                          onClick={() => onSelectExistingAddressAction(address.id)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border ${
                            isSelected
                              ? "bg-dom/15 border-dom/40 text-dom-strong"
                              : "bg-white border-dom/30 text-dom-strong hover:bg-dom/10"
                          }`}
                        >
                          {isSelected ? "Selecionado" : "Usar esse"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={onOpenAddressCreateModalAction}
              className="mt-3 w-full py-3 rounded-2xl border border-dom/35 bg-white text-[11px] font-extrabold uppercase tracking-wide text-dom-strong hover:bg-dom/15 transition"
            >
              Cadastrar novo endereço
            </button>
          </div>
        )}

        {addressMode === "existing" && selectedAddress && (!showAddressSelectionList || clientAddresses.length <= 1) && (
          <div className="bg-dom/20 rounded-2xl border border-dom/35 p-4">
            <div className="flex items-center gap-2 mb-2 text-dom-strong">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-extrabold uppercase tracking-wide">
                {selectedAddress.label || "Principal"}
                {selectedAddress.is_primary ? " • Principal" : ""}
              </span>
            </div>
            <p className="text-sm font-semibold text-studio-text leading-snug">
              {formatClientAddress(selectedAddress) || "Endereço cadastrado"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <GoogleMapsAddressButton
                query={buildAddressQuery({
                  logradouro: selectedAddress.address_logradouro ?? "",
                  numero: selectedAddress.address_numero ?? "",
                  complemento: selectedAddress.address_complemento ?? "",
                  bairro: selectedAddress.address_bairro ?? "",
                  cidade: selectedAddress.address_cidade ?? "",
                  estado: selectedAddress.address_estado ?? "",
                  cep: selectedAddress.address_cep ?? "",
                })}
              />
              {clientAddresses.length > 1 && (
                <button
                  type="button"
                  onClick={() => onShowAddressSelectionListAction(true)}
                  className="px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide bg-white border border-dom/35 text-dom-strong hover:bg-dom/25 transition"
                >
                  Trocar endereço
                </button>
              )}
              <button
                type="button"
                onClick={onOpenAddressCreateModalAction}
                className="px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide bg-white border border-dom/35 text-dom-strong hover:bg-dom/25 transition"
              >
                Cadastrar novo endereço
              </button>
            </div>
          </div>
        )}

        {addressMode === "new" && addressConfirmed && (
          <div className="bg-dom/20 rounded-2xl border border-dom/35 p-4">
            <div className="flex items-center gap-2 mb-2 text-dom-strong">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-extrabold uppercase tracking-wide">{addressLabel || "Principal"}</span>
            </div>
            <p className="text-sm font-semibold text-studio-text leading-snug">{mapsQuery || "Endereço informado"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <GoogleMapsAddressButton query={mapsQuery} />
              <button
                type="button"
                onClick={onOpenAddressCreateModalAction}
                className="px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide bg-white border border-dom/35 text-dom-strong hover:bg-dom/25 transition"
              >
                Trocar endereço
              </button>
              {clientAddresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => onShowAddressSelectionListAction(true)}
                  className="px-3 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide bg-white border border-dom/35 text-dom-strong hover:bg-dom/25 transition"
                >
                  Usar cadastrado
                </button>
              )}
            </div>
          </div>
        )}

        {!addressConfirmed && clientAddresses.length === 0 && (
          <div className="bg-dom/20 rounded-2xl border border-dom/35 p-4">
            <div className="flex items-center gap-2 mb-2 text-dom-strong">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-extrabold uppercase tracking-wide">Endereço do atendimento</span>
            </div>
            <p className="text-xs text-dom-strong/90 mb-4">
              Cadastre o endereço para atendimento domiciliar. Você pode buscar por CEP ou por endereço.
            </p>
            <button
              type="button"
              onClick={onOpenAddressCreateModalAction}
              className="w-full h-12 rounded-2xl bg-white border border-dom/35 text-dom-strong font-extrabold text-xs uppercase tracking-wide hover:bg-dom/15"
            >
              Cadastrar endereço
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-stone-100 bg-white p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">
            Taxa de deslocamento
          </p>
          {displacementStatus === "loading" && (
            <p className="text-sm font-semibold text-studio-text">Calculando taxa de deslocamento...</p>
          )}
          {displacementStatus !== "loading" && displacementEstimate && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">
                Distância estimada: {displacementEstimate.distanceKm.toFixed(2)} km.
              </p>
            </div>
          )}
          {displacementStatus === "error" && <p className="text-xs text-red-500">{displacementError}</p>}
          {displacementStatus === "idle" && !displacementEstimate && (
            <p className="text-xs text-gray-500">Informe/selecione um endereço para calcular a taxa recomendada.</p>
          )}
          <div className="pt-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-serif text-sm">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={manualDisplacementFee}
                  onChange={(event) => onManualDisplacementFeeChangeAction(event.target.value)}
                  placeholder={displacementEstimate?.fee.toFixed(2).replace(".", ",") ?? "0,00"}
                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-stone-50 border border-stone-100 focus:outline-none focus:ring-1 focus:ring-studio-green focus:border-studio-green text-sm text-gray-700 font-medium"
                />
              </div>
              <button
                type="button"
                onClick={onZeroDisplacementFeeAction}
                className="px-3 py-3 rounded-xl border border-dom/45 bg-white text-[10px] font-extrabold uppercase tracking-wide text-dom-strong hover:bg-dom/25"
              >
                Zerar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
