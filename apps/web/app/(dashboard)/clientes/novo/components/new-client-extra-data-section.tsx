"use client";

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
    <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Dados adicionais</p>
        <h2 className="text-lg font-serif text-studio-text">Profissão e origem</h2>
      </div>
      <input
        name="profissao"
        value={profession}
        onChange={(event) => onChangeProfessionAction(event.target.value)}
        placeholder="Profissão"
        className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
      />
      <input
        name="como_conheceu"
        value={referralSource}
        onChange={(event) => onChangeReferralSourceAction(event.target.value)}
        placeholder="Como conheceu?"
        className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
      />
    </section>
  );
}
