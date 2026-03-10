"use client";

type NewClientHealthSectionProps = {
  allergyTags: string[];
  conditionTags: string[];
  allergyInput: string;
  conditionInput: string;
  contraindications: string;
  preferencesNotes: string;
  clinicalHistory: string;
  anamneseUrl: string;
  onAddAllergyTagAction: () => void;
  onRemoveAllergyTagAction: (tag: string) => void;
  onChangeAllergyInputAction: (value: string) => void;
  onAddConditionTagAction: () => void;
  onRemoveConditionTagAction: (tag: string) => void;
  onChangeConditionInputAction: (value: string) => void;
  onChangeContraindicationsAction: (value: string) => void;
  onChangePreferencesNotesAction: (value: string) => void;
  onChangeClinicalHistoryAction: (value: string) => void;
  onChangeAnamneseUrlAction: (value: string) => void;
};

export function NewClientHealthSection({
  allergyTags,
  conditionTags,
  allergyInput,
  conditionInput,
  contraindications,
  preferencesNotes,
  clinicalHistory,
  anamneseUrl,
  onAddAllergyTagAction,
  onRemoveAllergyTagAction,
  onChangeAllergyInputAction,
  onAddConditionTagAction,
  onRemoveConditionTagAction,
  onChangeConditionInputAction,
  onChangeContraindicationsAction,
  onChangePreferencesNotesAction,
  onChangeClinicalHistoryAction,
  onChangeAnamneseUrlAction,
}: NewClientHealthSectionProps) {
  return (
    <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Saúde & Cuidados</p>
        <h2 className="text-lg font-serif text-studio-text">Tags e informações</h2>
      </div>

      <div>
        <label className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Alergias</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {allergyTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onRemoveAllergyTagAction(tag)}
              className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-[11px] font-extrabold border border-red-100"
            >
              {tag}
            </button>
          ))}
        </div>
        <input
          value={allergyInput}
          onChange={(event) => onChangeAllergyInputAction(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAddAllergyTagAction();
            }
          }}
          placeholder="Adicionar alergia e pressione Enter"
          className="mt-2 w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
        />
      </div>

      <div>
        <label className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Condições & Atenções</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {conditionTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onRemoveConditionTagAction(tag)}
              className="px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-[11px] font-extrabold border border-orange-100"
            >
              {tag}
            </button>
          ))}
        </div>
        <input
          value={conditionInput}
          onChange={(event) => onChangeConditionInputAction(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAddConditionTagAction();
            }
          }}
          placeholder="Adicionar condição e pressione Enter"
          className="mt-2 w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
        />
      </div>

      <textarea
        name="contraindications"
        value={contraindications}
        onChange={(event) => onChangeContraindicationsAction(event.target.value)}
        placeholder="Contraindicações"
        rows={3}
        className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
      />

      <textarea
        name="preferences_notes"
        value={preferencesNotes}
        onChange={(event) => onChangePreferencesNotesAction(event.target.value)}
        placeholder="Preferências"
        rows={3}
        className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
      />

      <textarea
        name="clinical_history"
        value={clinicalHistory}
        onChange={(event) => onChangeClinicalHistoryAction(event.target.value)}
        placeholder="Histórico clínico / anamnese"
        rows={3}
        className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
      />

      <input
        name="anamnese_url"
        value={anamneseUrl}
        onChange={(event) => onChangeAnamneseUrlAction(event.target.value)}
        placeholder="Link da anamnese (opcional)"
        className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
      />
    </section>
  );
}
