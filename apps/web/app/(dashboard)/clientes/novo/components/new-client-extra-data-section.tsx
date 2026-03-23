"use client";

import { Briefcase } from "lucide-react";
import {
  appointmentFormSectionHeaderPrimaryClass,
  appointmentFormSectionHeaderTextClass,
} from "../../../novo/appointment-form.styles";

type NewClientExtraDataSectionProps = {
  profession: string;
  referralSource: string;
  onChangeProfessionAction: (value: string) => void;
  onChangeReferralSourceAction: (value: string) => void;
};

export function NewClientExtraDataSection({
  profession,
  referralSource,
  onChangeProfessionAction,
  onChangeReferralSourceAction,
}: NewClientExtraDataSectionProps) {
  return (
    <section className="wl-surface-card overflow-hidden">
      <div className={appointmentFormSectionHeaderPrimaryClass}>
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-studio-green" />
          <h3 className={appointmentFormSectionHeaderTextClass}>Dados adicionais</h3>
        </div>
      </div>
      <div className="space-y-2 px-3 py-3">
        <input
          name="profissao"
          value={profession}
          onChange={(event) => onChangeProfessionAction(event.target.value)}
          placeholder="Profissao"
          className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
        />
        <input
          name="como_conheceu"
          value={referralSource}
          onChange={(event) => onChangeReferralSourceAction(event.target.value)}
          placeholder="Como conheceu?"
          className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
        />
      </div>
    </section>
  );
}
