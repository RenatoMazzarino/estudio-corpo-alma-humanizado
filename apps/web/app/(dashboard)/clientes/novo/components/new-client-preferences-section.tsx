"use client";

import { Sparkles } from "lucide-react";
import {
  appointmentFormSectionHeaderPrimaryClass,
  appointmentFormSectionHeaderTextClass,
} from "../../../novo/appointment-form.styles";

type NewClientPreferencesSectionProps = {
  isVip: boolean;
  needsAttention: boolean;
  marketingOptIn: boolean;
  onChangeIsVipAction: (value: boolean) => void;
  onChangeNeedsAttentionAction: (value: boolean) => void;
  onChangeMarketingOptInAction: (value: boolean) => void;
};

export function NewClientPreferencesSection({
  isVip,
  needsAttention,
  marketingOptIn,
  onChangeIsVipAction,
  onChangeNeedsAttentionAction,
  onChangeMarketingOptInAction,
}: NewClientPreferencesSectionProps) {
  return (
    <section className="wl-surface-card overflow-hidden">
      <div className={appointmentFormSectionHeaderPrimaryClass}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-studio-green" />
          <h3 className={appointmentFormSectionHeaderTextClass}>Comercial e relacionamento</h3>
        </div>
      </div>

      <div className="space-y-2 px-3 py-3">
        <label className="flex items-center justify-between rounded-xl border border-line wl-surface-card-body px-3 py-2">
          <span className="text-sm font-semibold text-studio-text">Cliente VIP</span>
          <input type="checkbox" name="is_vip" checked={isVip} onChange={(event) => onChangeIsVipAction(event.target.checked)} className="h-4 w-4" />
        </label>

        <label className="flex items-center justify-between rounded-xl border border-line wl-surface-card-body px-3 py-2">
          <span className="text-sm font-semibold text-studio-text">Marcar atencao</span>
          <input type="checkbox" name="needs_attention" checked={needsAttention} onChange={(event) => onChangeNeedsAttentionAction(event.target.checked)} className="h-4 w-4" />
        </label>

        <label className="flex items-center justify-between rounded-xl border border-line wl-surface-card-body px-3 py-2">
          <span className="text-sm font-semibold text-studio-text">Aceita novidades</span>
          <input type="checkbox" name="marketing_opt_in" checked={marketingOptIn} onChange={(event) => onChangeMarketingOptInAction(event.target.checked)} className="h-4 w-4" />
        </label>
      </div>
    </section>
  );
}
