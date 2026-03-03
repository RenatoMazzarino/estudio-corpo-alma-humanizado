"use client";

import { formatCep } from "../../../../../src/shared/address/cep";
import type { AddressEntry } from "./new-client.types";

type CepStatus = "idle" | "loading" | "error" | "success";

type NewClientAddressSectionProps = {
  address: AddressEntry;
  cepStatus: CepStatus;
  onChangeAddress: (next: AddressEntry) => void;
  onLookupCep: () => void;
};

export function NewClientAddressSection({
  address,
  cepStatus,
  onChangeAddress,
  onLookupCep,
}: NewClientAddressSectionProps) {
  return (
    <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Endereço</p>
        <h2 className="text-lg font-serif text-studio-text">Principal</h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="text-[10px] font-extrabold text-muted uppercase tracking-widest">CEP</label>
          <input
            name="address_cep"
            value={address.cep}
            onChange={(event) => onChangeAddress({ ...address, cep: formatCep(event.target.value) })}
            inputMode="numeric"
            className="mt-2 w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
          />
        </div>
        <button
          type="button"
          onClick={onLookupCep}
          className="mt-6 h-11.5 rounded-2xl bg-studio-light text-studio-green font-extrabold text-xs border border-studio-green/10"
        >
          {cepStatus === "loading" ? "Buscando" : "Buscar"}
        </button>
      </div>

      <input
        name="address_logradouro"
        value={address.logradouro}
        onChange={(event) => onChangeAddress({ ...address, logradouro: event.target.value })}
        placeholder="Rua / Avenida"
        className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
      />

      <div className="grid grid-cols-3 gap-3">
        <input
          name="address_numero"
          value={address.numero}
          onChange={(event) => onChangeAddress({ ...address, numero: event.target.value })}
          placeholder="Número"
          className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
        />
        <input
          name="address_complemento"
          value={address.complemento}
          onChange={(event) => onChangeAddress({ ...address, complemento: event.target.value })}
          placeholder="Complemento"
          className="col-span-2 w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          name="address_bairro"
          value={address.bairro}
          onChange={(event) => onChangeAddress({ ...address, bairro: event.target.value })}
          placeholder="Bairro"
          className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
        />
        <input
          name="address_cidade"
          value={address.cidade}
          onChange={(event) => onChangeAddress({ ...address, cidade: event.target.value })}
          placeholder="Cidade"
          className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
        />
      </div>

      <input
        name="address_estado"
        value={address.estado}
        onChange={(event) => onChangeAddress({ ...address, estado: event.target.value.toUpperCase() })}
        placeholder="UF"
        className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm uppercase"
      />
    </section>
  );
}
