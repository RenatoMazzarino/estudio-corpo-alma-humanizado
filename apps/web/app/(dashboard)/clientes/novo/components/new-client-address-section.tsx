"use client";

import { MapPin, Plus, Trash2 } from "lucide-react";
import {
  appointmentFormHeaderIconButtonClass,
  appointmentFormSectionHeaderPrimaryClass,
  appointmentFormSectionHeaderTextClass,
} from "../../../novo/appointment-form.styles";
import { formatCep } from "../../../../../src/shared/address/cep";
import type { AddressEntry } from "./new-client.types";

type CepStatus = "idle" | "loading" | "error" | "success";

type NewClientAddressSectionProps = {
  addresses: AddressEntry[];
  cepStatusByAddressId: Record<string, CepStatus>;
  onAddAddressAction: () => void;
  onRemoveAddressAction: (id: string) => void;
  onChangeAddressAction: (id: string, next: AddressEntry) => void;
  onSetPrimaryAddressAction: (id: string) => void;
  onLookupCepAction: (id: string) => void;
};

export function NewClientAddressSection({
  addresses,
  cepStatusByAddressId,
  onAddAddressAction,
  onRemoveAddressAction,
  onChangeAddressAction,
  onSetPrimaryAddressAction,
  onLookupCepAction,
}: NewClientAddressSectionProps) {
  return (
    <section className="wl-surface-card overflow-hidden">
      <div className={appointmentFormSectionHeaderPrimaryClass}>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-studio-green" />
          <h3 className={appointmentFormSectionHeaderTextClass}>Enderecos cadastrados</h3>
        </div>
        <button
          type="button"
          onClick={onAddAddressAction}
          className={appointmentFormHeaderIconButtonClass}
          aria-label="Adicionar endereco"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 px-3 py-3">
        {addresses.map((address) => {
          const cepStatus = cepStatusByAddressId[address.id] ?? "idle";
          return (
            <div key={address.id} className="space-y-3 rounded-xl border border-line wl-surface-card-body p-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted" />
                <select
                  value={address.label}
                  onChange={(event) =>
                    onChangeAddressAction(address.id, {
                      ...address,
                      label: event.target.value as AddressEntry["label"],
                    })
                  }
                  className="flex-1 rounded-xl border border-line wl-surface-input px-3 py-2 text-xs"
                >
                  <option value="principal">Principal</option>
                  <option value="casa">Casa</option>
                  <option value="trabalho">Trabalho</option>
                  <option value="outro">Outro</option>
                </select>
                <label
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-wider ${
                    address.isPrimary
                      ? "border-studio-green bg-studio-green text-white"
                      : "border-line bg-white text-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={address.isPrimary}
                    onChange={(event) => {
                      if (event.target.checked) onSetPrimaryAddressAction(address.id);
                    }}
                    className="h-4 w-4 accent-[var(--color-studio-green)]"
                  />
                  Principal
                </label>
                <button
                  type="button"
                  onClick={() => onRemoveAddressAction(address.id)}
                  className={appointmentFormHeaderIconButtonClass}
                  aria-label="Remover endereco"
                  disabled={addresses.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">CEP</label>
                  <input
                    value={address.cep}
                    onChange={(event) =>
                      onChangeAddressAction(address.id, { ...address, cep: formatCep(event.target.value) })
                    }
                    inputMode="numeric"
                    className="mt-1 w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onLookupCepAction(address.id)}
                  className="mt-[22px] h-12 rounded-xl border border-studio-green/10 bg-studio-light text-xs font-bold uppercase tracking-wider text-studio-green"
                >
                  {cepStatus === "loading" ? "Buscando" : "Buscar"}
                </button>
              </div>

              <input
                value={address.logradouro}
                onChange={(event) => onChangeAddressAction(address.id, { ...address, logradouro: event.target.value })}
                placeholder="Rua / Avenida"
                className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
              />

              <div className="grid grid-cols-3 gap-3">
                <input
                  value={address.numero}
                  onChange={(event) => onChangeAddressAction(address.id, { ...address, numero: event.target.value })}
                  placeholder="Numero"
                  className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
                />
                <input
                  value={address.complemento}
                  onChange={(event) =>
                    onChangeAddressAction(address.id, { ...address, complemento: event.target.value })
                  }
                  placeholder="Complemento"
                  className="col-span-2 w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={address.bairro}
                  onChange={(event) => onChangeAddressAction(address.id, { ...address, bairro: event.target.value })}
                  placeholder="Bairro"
                  className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
                />
                <input
                  value={address.cidade}
                  onChange={(event) => onChangeAddressAction(address.id, { ...address, cidade: event.target.value })}
                  placeholder="Cidade"
                  className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
                />
              </div>

              <input
                value={address.estado}
                onChange={(event) =>
                  onChangeAddressAction(address.id, { ...address, estado: event.target.value.toUpperCase() })
                }
                placeholder="UF"
                className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm uppercase"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
