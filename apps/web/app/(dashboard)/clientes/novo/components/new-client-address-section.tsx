"use client";

import { formatCep } from "../../../../../src/shared/address/cep";
import type { AddressEntry } from "./new-client.types";

type CepStatus = "idle" | "loading" | "error" | "success";

type NewClientAddressSectionProps = {
  address: AddressEntry;
  cepStatus: CepStatus;
  onChangeAddressAction: (next: AddressEntry) => void;
  onLookupCepAction: () => void;
};

export function NewClientAddressSection({
  address,
  cepStatus,
  onChangeAddressAction,
  onLookupCepAction,
}: NewClientAddressSectionProps) {
  return (
    <section className="wl-surface-card overflow-hidden">
      <div className="flex h-10 items-center gap-2 border-b border-line px-3 wl-surface-card-header">
        <p className="wl-typo-card-name-sm font-bold text-studio-text">Endereco principal</p>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">CEP</label>
            <input
              name="address_cep"
              value={address.cep}
              onChange={(event) => onChangeAddressAction({ ...address, cep: formatCep(event.target.value) })}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={onLookupCepAction}
            className="mt-[22px] h-12 rounded-xl border border-studio-green/10 bg-studio-light text-xs font-bold uppercase tracking-wider text-studio-green"
          >
            {cepStatus === "loading" ? "Buscando" : "Buscar"}
          </button>
        </div>

        <input
          name="address_logradouro"
          value={address.logradouro}
          onChange={(event) => onChangeAddressAction({ ...address, logradouro: event.target.value })}
          placeholder="Rua / Avenida"
          className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
        />

        <div className="grid grid-cols-3 gap-3">
          <input
            name="address_numero"
            value={address.numero}
            onChange={(event) => onChangeAddressAction({ ...address, numero: event.target.value })}
            placeholder="Numero"
            className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
          />
          <input
            name="address_complemento"
            value={address.complemento}
            onChange={(event) => onChangeAddressAction({ ...address, complemento: event.target.value })}
            placeholder="Complemento"
            className="col-span-2 w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            name="address_bairro"
            value={address.bairro}
            onChange={(event) => onChangeAddressAction({ ...address, bairro: event.target.value })}
            placeholder="Bairro"
            className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
          />
          <input
            name="address_cidade"
            value={address.cidade}
            onChange={(event) => onChangeAddressAction({ ...address, cidade: event.target.value })}
            placeholder="Cidade"
            className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
          />
        </div>

        <input
          name="address_estado"
          value={address.estado}
          onChange={(event) => onChangeAddressAction({ ...address, estado: event.target.value.toUpperCase() })}
          placeholder="UF"
          className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm uppercase"
        />
      </div>
    </section>
  );
}
