"use client";

import { MapPin } from "lucide-react";
import { StepTabs } from "./step-tabs";
import type { DisplacementEstimate } from "../booking-flow.types";

type AddressMode = "cep" | "text" | null;

type LocationStepProps = {
  label: string;
  isHomeVisit: boolean;
  homeVisitAllowed: boolean;
  selectedServicePrice: number;
  totalPrice: number;
  displacementEstimate: DisplacementEstimate | null;
  displacementStatus: "idle" | "loading" | "error";
  hasSuggestedAddress: boolean;
  useSuggestedAddress: boolean | null;
  suggestedAddressSummary: string;
  addressMode: AddressMode;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  mapsQuery: string;
  onSelectStudio: () => void;
  onSelectHomeVisit: () => void;
  onUseSuggestedAddress: () => void;
  onChooseOtherAddress: () => void;
  onSelectAddressMode: (mode: Exclude<AddressMode, null>) => void;
  onChangeCep: (value: string) => void;
  onLookupCep: () => void;
  onOpenSearchModal: () => void;
  onChangeLogradouro: (value: string) => void;
  onChangeNumero: (value: string) => void;
  onChangeComplemento: (value: string) => void;
  onChangeBairro: (value: string) => void;
  onChangeCidade: (value: string) => void;
  onChangeEstado: (value: string) => void;
};

export function LocationStep({
  label,
  isHomeVisit,
  homeVisitAllowed,
  selectedServicePrice,
  totalPrice,
  displacementEstimate,
  displacementStatus,
  hasSuggestedAddress,
  useSuggestedAddress,
  suggestedAddressSummary,
  addressMode,
  cep,
  logradouro,
  numero,
  complemento,
  bairro,
  cidade,
  estado,
  mapsQuery,
  onSelectStudio,
  onSelectHomeVisit,
  onUseSuggestedAddress,
  onChooseOtherAddress,
  onSelectAddressMode,
  onChangeCep,
  onLookupCep,
  onOpenSearchModal,
  onChangeLogradouro,
  onChangeNumero,
  onChangeComplemento,
  onChangeBairro,
  onChangeCidade,
  onChangeEstado,
}: LocationStepProps) {
  return (
    <section className="no-scrollbar animate-in fade-in slide-in-from-right-6 duration-500 flex flex-1 flex-col overflow-y-auto px-6 pb-24 pt-6">
      <div className="mb-6">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <StepTabs step="LOCATION" />
        <h2 className="mt-2 text-3xl font-serif text-studio-text">Onde será?</h2>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={onSelectStudio}
          className={`w-full rounded-3xl border bg-white p-5 text-left shadow-soft transition ${
            !isHomeVisit ? "border-studio-green bg-green-50/50" : "border-stone-100"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="mb-1 text-lg font-bold text-studio-text">No Estúdio</p>
              <p className="text-xs text-gray-400">Endereço do estúdio</p>
            </div>
            <span className="font-bold text-studio-green">R$ {Number(selectedServicePrice).toFixed(2)}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={onSelectHomeVisit}
          className={`w-full rounded-3xl border bg-white p-5 text-left shadow-soft transition ${
            isHomeVisit ? "border-studio-green bg-green-50/50" : "border-stone-100"
          } ${!homeVisitAllowed ? "cursor-not-allowed opacity-40" : ""}`}
          disabled={!homeVisitAllowed}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="mb-1 text-lg font-bold text-studio-text">Em Domicílio</p>
              <p className="text-xs text-gray-400">Levamos a maca e materiais até você</p>
            </div>
            <div className="text-right">
              <span className="block font-bold text-studio-green">R$ {Number(totalPrice).toFixed(2)}</span>
              <span className="text-[10px] font-bold uppercase text-gray-400">
                {displacementEstimate ? `Taxa R$ ${displacementEstimate.fee.toFixed(2)}` : "Taxa calculada por endereço"}
              </span>
            </div>
          </div>
        </button>

        {isHomeVisit && (
          <div className="animate-in slide-in-from-bottom-4 space-y-4 pt-4 duration-300 fade-in">
            {hasSuggestedAddress && useSuggestedAddress === null && (
              <div className="space-y-3 rounded-2xl border border-stone-100 bg-white p-4 shadow-soft">
                <div className="flex items-center gap-2 text-studio-green">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase">Endereço encontrado</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">{suggestedAddressSummary}</p>
                <p className="text-xs text-gray-400">Deseja usar este endereço?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onUseSuggestedAddress}
                    className="h-10 flex-1 rounded-full bg-studio-green text-xs font-bold uppercase tracking-widest text-white"
                  >
                    Usar este
                  </button>
                  <button
                    type="button"
                    onClick={onChooseOtherAddress}
                    className="h-10 flex-1 rounded-full border border-stone-200 text-xs font-bold uppercase tracking-widest text-gray-500"
                  >
                    Outro
                  </button>
                </div>
              </div>
            )}

            {hasSuggestedAddress && useSuggestedAddress === true && (
              <div className="space-y-2 rounded-2xl border border-stone-100 bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-studio-green">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase">Endereço selecionado</span>
                  </div>
                  <button type="button" onClick={onChooseOtherAddress} className="text-[10px] font-bold uppercase text-gray-400">
                    Alterar
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">
                  {logradouro}
                  {numero ? `, ${numero}` : ""}
                  {bairro ? ` - ${bairro}` : ""}
                </p>
              </div>
            )}

            {(!hasSuggestedAddress || useSuggestedAddress === false) && (
              <div className="space-y-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-[10px] font-bold uppercase text-gray-400">Preencha o Endereço</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectAddressMode("cep")}
                    className={`rounded-2xl border px-4 py-3 text-xs font-bold uppercase ${
                      addressMode === "cep" ? "border-studio-green bg-green-50 text-studio-green" : "border-stone-200 text-gray-500"
                    }`}
                  >
                    Buscar por CEP
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectAddressMode("text")}
                    className={`rounded-2xl border px-4 py-3 text-xs font-bold uppercase ${
                      addressMode === "text" ? "border-studio-green bg-green-50 text-studio-green" : "border-stone-200 text-gray-500"
                    }`}
                  >
                    Buscar endereço
                  </button>
                </div>

                {addressMode === "cep" && (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="ml-1 text-[10px] font-bold uppercase text-gray-400">CEP</label>
                        <input
                          value={cep}
                          onChange={(event) => onChangeCep(event.target.value)}
                          className="w-full rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm font-medium text-gray-700"
                          inputMode="numeric"
                          placeholder="00000-000"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={onLookupCep}
                        className="mt-5 rounded-2xl bg-gray-100 px-4 font-bold text-studio-text transition-colors hover:bg-gray-200"
                      >
                        Buscar
                      </button>
                    </div>
                  </div>
                )}

                {addressMode === "text" && (
                  <div className="rounded-2xl border border-stone-100 bg-white p-4 text-sm text-gray-500">
                    <p>Procure seu endereço completo.</p>
                    <button
                      type="button"
                      onClick={onOpenSearchModal}
                      className="mt-3 text-xs font-bold uppercase tracking-widest text-studio-green"
                    >
                      Buscar endereço
                    </button>
                  </div>
                )}

                {addressMode && (
                  <div className="space-y-3">
                    <div>
                      <label className="ml-1 text-[10px] font-bold uppercase text-gray-400">Rua / Av</label>
                      <input
                        value={logradouro}
                        onChange={(event) => onChangeLogradouro(event.target.value)}
                        className="w-full rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm font-medium text-gray-700"
                        placeholder="Endereço"
                      />
                    </div>

                    <div className="flex gap-3">
                      <div className="w-1/3">
                        <label className="ml-1 text-[10px] font-bold uppercase text-gray-400">Número</label>
                        <input
                          value={numero}
                          onChange={(event) => onChangeNumero(event.target.value)}
                          className="w-full rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm font-medium text-gray-700"
                          placeholder="Nº"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="ml-1 text-[10px] font-bold uppercase text-gray-400">Complemento</label>
                        <input
                          value={complemento}
                          onChange={(event) => onChangeComplemento(event.target.value)}
                          className="w-full rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm font-medium text-gray-700"
                          placeholder="Apto/Bloco"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="ml-1 text-[10px] font-bold uppercase text-gray-400">Bairro</label>
                        <input
                          value={bairro}
                          onChange={(event) => onChangeBairro(event.target.value)}
                          className="w-full rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm font-medium text-gray-700"
                          placeholder="Bairro"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="ml-1 text-[10px] font-bold uppercase text-gray-400">Cidade</label>
                        <input
                          value={cidade}
                          onChange={(event) => onChangeCidade(event.target.value)}
                          className="w-full rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm font-medium text-gray-700"
                          placeholder="Cidade"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="ml-1 text-[10px] font-bold uppercase text-gray-400">Estado</label>
                      <input
                        value={estado}
                        onChange={(event) => onChangeEstado(event.target.value)}
                        maxLength={2}
                        className="w-full rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm font-medium uppercase text-gray-700"
                        placeholder="UF"
                      />
                    </div>

                    {mapsQuery && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-studio-green"
                      >
                        Ver endereço no Maps
                      </a>
                    )}
                  </div>
                )}

                <div className="rounded-2xl border border-stone-100 bg-white p-4">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Taxa de deslocamento</p>
                  {displacementStatus === "loading" && (
                    <p className="text-sm font-semibold text-studio-text">Calculando com base no trajeto de carro...</p>
                  )}
                  {displacementStatus !== "loading" && displacementEstimate && (
                    <div className="space-y-1">
                      <p className="text-base font-bold text-studio-green">R$ {displacementEstimate.fee.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        Distância estimada: {displacementEstimate.distanceKm.toFixed(2)} km ({displacementEstimate.rule === "urban" ? "regra urbana" : "regra rodoviária"}).
                      </p>
                    </div>
                  )}
                  {displacementStatus === "idle" && !displacementEstimate && (
                    <p className="text-xs text-gray-500">Informe o endereço para calcular automaticamente a taxa.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
