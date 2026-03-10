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
    <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Menor de idade</p>
        <h2 className="text-lg font-serif text-studio-text">Responsável</h2>
      </div>

      <label className="flex items-center gap-2 text-xs font-extrabold text-studio-text">
        <input
          type="checkbox"
          name="is_minor"
          checked={isMinor}
          onChange={(event) => onChangeIsMinorAction(event.target.checked)}
          className="w-4 h-4"
        />
        Cliente é menor de idade
      </label>

      {isMinor && (
        <div className="space-y-3">
          <input
            name="guardian_name"
            value={guardianName}
            onChange={(event) => onChangeGuardianNameAction(event.target.value)}
            placeholder="Nome do responsável"
            className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
          />
          <input
            name="guardian_phone"
            value={guardianPhone}
            onChange={(event) => onChangeGuardianPhoneAction(formatBrazilPhone(event.target.value))}
            placeholder="Telefone do responsável"
            className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
          />
          <input
            name="guardian_cpf"
            value={guardianCpf}
            onChange={(event) => onChangeGuardianCpfAction(formatCpf(event.target.value))}
            placeholder="CPF do responsável"
            className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
          />
        </div>
      )}
    </section>
  );
}
