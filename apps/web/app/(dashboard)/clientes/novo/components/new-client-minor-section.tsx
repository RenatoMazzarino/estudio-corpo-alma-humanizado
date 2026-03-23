"use client";

import { ShieldAlert } from "lucide-react";
import {
  appointmentFormSectionHeaderPrimaryClass,
  appointmentFormSectionHeaderTextClass,
} from "../../../novo/appointment-form.styles";
import { formatBrazilPhone } from "../../../../../src/shared/phone";
import { formatCpf } from "../../../../../src/shared/cpf";

type NewClientMinorSectionProps = {
  isMinor: boolean;
  isMinorAuto: boolean;
  isMinorOverride: boolean | null;
  guardianName: string;
  guardianPhone: string;
  guardianCpf: string;
  guardianRelationship: string;
  onChangeIsMinorOverrideAction: (value: boolean | null) => void;
  onChangeGuardianNameAction: (value: string) => void;
  onChangeGuardianPhoneAction: (value: string) => void;
  onChangeGuardianCpfAction: (value: string) => void;
  onChangeGuardianRelationshipAction: (value: string) => void;
};

export function NewClientMinorSection({
  isMinor,
  isMinorAuto,
  isMinorOverride,
  guardianName,
  guardianPhone,
  guardianCpf,
  guardianRelationship,
  onChangeIsMinorOverrideAction,
  onChangeGuardianNameAction,
  onChangeGuardianPhoneAction,
  onChangeGuardianCpfAction,
  onChangeGuardianRelationshipAction,
}: NewClientMinorSectionProps) {
  return (
    <section className="wl-surface-card overflow-hidden">
      <div className={appointmentFormSectionHeaderPrimaryClass}>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-studio-green" />
          <h3 className={appointmentFormSectionHeaderTextClass}>Responsavel legal</h3>
        </div>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div className="rounded-xl border border-line wl-surface-card-body px-3 py-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
            Cliente menor de idade
          </p>
          <p className="mt-1 text-sm font-semibold text-studio-text">
            {isMinorAuto ? "Automatico: Sim (pela data de nascimento)" : "Automatico: Nao (pela data de nascimento)"}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onChangeIsMinorOverrideAction(null)}
              className={`rounded-xl border px-2 py-2 text-xs font-bold uppercase tracking-wider ${
                isMinorOverride === null
                  ? "border-studio-green bg-studio-green text-white"
                  : "border-line bg-white text-muted"
              }`}
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => onChangeIsMinorOverrideAction(true)}
              className={`rounded-xl border px-2 py-2 text-xs font-bold uppercase tracking-wider ${
                isMinorOverride === true
                  ? "border-studio-green bg-studio-green text-white"
                  : "border-line bg-white text-muted"
              }`}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => onChangeIsMinorOverrideAction(false)}
              className={`rounded-xl border px-2 py-2 text-xs font-bold uppercase tracking-wider ${
                isMinorOverride === false
                  ? "border-studio-green bg-studio-green text-white"
                  : "border-line bg-white text-muted"
              }`}
            >
              Nao
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Resultado aplicado no cadastro: <span className="font-semibold text-studio-text">{isMinor ? "Menor" : "Maior"}</span>
          </p>
        </div>

        {isMinor ? (
          <div className="space-y-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-muted">
              Nome do responsavel *
            </label>
            <input
              name="guardian_name"
              value={guardianName}
              onChange={(event) => onChangeGuardianNameAction(event.target.value)}
              placeholder="Nome do responsavel"
              className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
              required={isMinor}
            />
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-muted">
              Telefone do responsavel *
            </label>
            <input
              name="guardian_phone"
              value={guardianPhone}
              onChange={(event) => onChangeGuardianPhoneAction(formatBrazilPhone(event.target.value))}
              placeholder="Telefone do responsavel"
              className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
              required={isMinor}
            />
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-muted">
              CPF do responsavel
            </label>
            <input
              name="guardian_cpf"
              value={guardianCpf}
              onChange={(event) => onChangeGuardianCpfAction(formatCpf(event.target.value))}
              placeholder="CPF do responsavel"
              className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
            />
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-muted">
              Relacao com o cliente
            </label>
            <input
              name="guardian_relationship"
              value={guardianRelationship}
              onChange={(event) => onChangeGuardianRelationshipAction(event.target.value)}
              placeholder="Relacao com o cliente (mae, pai, responsavel...)"
              className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
