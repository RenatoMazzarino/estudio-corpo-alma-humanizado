"use client";

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
    <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Sinalizações</p>
        <h2 className="text-lg font-serif text-studio-text">Preferências do atendimento</h2>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-xs font-extrabold text-studio-text">
          <input
            type="checkbox"
            name="is_vip"
            checked={isVip}
            onChange={(event) => onChangeIsVipAction(event.target.checked)}
            className="w-4 h-4"
          />
          VIP
        </label>
        <label className="flex items-center gap-2 text-xs font-extrabold text-studio-text">
          <input
            type="checkbox"
            name="needs_attention"
            checked={needsAttention}
            onChange={(event) => onChangeNeedsAttentionAction(event.target.checked)}
            className="w-4 h-4"
          />
          Atenção
        </label>
        <label className="flex items-center gap-2 text-xs font-extrabold text-studio-text">
          <input
            type="checkbox"
            name="marketing_opt_in"
            checked={marketingOptIn}
            onChange={(event) => onChangeMarketingOptInAction(event.target.checked)}
            className="w-4 h-4"
          />
          Aceita novidades
        </label>
      </div>
    </section>
  );
}
