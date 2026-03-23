"use client";

import { formatBrazilPhone } from "../../../../../src/shared/phone";
import { formatCpf } from "../../../../../src/shared/cpf";

type NewClientMinorSectionProps = {
  isMinor: boolean;
  guardianName: string;
  guardianPhone: string;
  guardianCpf: string;
  onChangeIsMinorAction: (value: boolean) => void;
  onChangeGuardianNameAction: (value: string) => void;
  onChangeGuardianPhoneAction: (value: string) => void;
  onChangeGuardianCpfAction: (value: string) => void;
};

export function NewClientMinorSection({
  isMinor,
  guardianName,
  guardianPhone,
  guardianCpf,
  onChangeIsMinorAction,
  onChangeGuardianNameAction,
  onChangeGuardianPhoneAction,
  onChangeGuardianCpfAction,
}: NewClientMinorSectionProps) {
  return (
    <section className="wl-surface-card overflow-hidden">
      <div className="flex h-10 items-center gap-2 border-b border-line px-3 wl-surface-card-header">
        <p className="wl-typo-card-name-sm font-bold text-studio-text">Responsavel legal</p>
      </div>

      <div className="space-y-3 px-3 py-3">
        <label className="flex items-center justify-between rounded-xl border border-line wl-surface-card-body px-3 py-2">
          <span className="text-sm font-semibold text-studio-text">Cliente menor de idade</span>
          <input
            type="checkbox"
            name="is_minor"
            checked={isMinor}
            onChange={(event) => onChangeIsMinorAction(event.target.checked)}
            className="h-4 w-4"
          />
        </label>

        {isMinor ? (
          <div className="space-y-2">
            <input
              name="guardian_name"
              value={guardianName}
              onChange={(event) => onChangeGuardianNameAction(event.target.value)}
              placeholder="Nome do responsavel"
              className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
            />
            <input
              name="guardian_phone"
              value={guardianPhone}
              onChange={(event) => onChangeGuardianPhoneAction(formatBrazilPhone(event.target.value))}
              placeholder="Telefone do responsavel"
              className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
            />
            <input
              name="guardian_cpf"
              value={guardianCpf}
              onChange={(event) => onChangeGuardianCpfAction(formatCpf(event.target.value))}
              placeholder="CPF do responsavel"
              className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
