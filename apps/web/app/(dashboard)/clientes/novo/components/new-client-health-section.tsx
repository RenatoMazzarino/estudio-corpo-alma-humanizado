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
    <section className="wl-surface-card overflow-hidden">
      <div className="flex h-10 items-center gap-2 border-b border-line px-3 wl-surface-card-header">
        <p className="wl-typo-card-name-sm font-bold text-studio-text">Saude e cuidados</p>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Alergias</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {allergyTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onRemoveAllergyTagAction(tag)}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold text-red-600"
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
            placeholder="Adicionar alergia e pressionar Enter"
            className="mt-2 w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Condicoes e atencoes</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {conditionTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onRemoveConditionTagAction(tag)}
                className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-bold text-orange-700"
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
            placeholder="Adicionar condicao e pressionar Enter"
            className="mt-2 w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
          />
        </div>

        <textarea
          name="contraindications"
          value={contraindications}
          onChange={(event) => onChangeContraindicationsAction(event.target.value)}
          placeholder="Contraindicacoes"
          rows={3}
          className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
        />

        <textarea
          name="preferences_notes"
          value={preferencesNotes}
          onChange={(event) => onChangePreferencesNotesAction(event.target.value)}
          placeholder="Preferencias"
          rows={3}
          className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
        />

        <textarea
          name="clinical_history"
          value={clinicalHistory}
          onChange={(event) => onChangeClinicalHistoryAction(event.target.value)}
          placeholder="Historico clinico / anamnese"
          rows={3}
          className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
        />

        <input
          name="anamnese_url"
          value={anamneseUrl}
          onChange={(event) => onChangeAnamneseUrlAction(event.target.value)}
          placeholder="Link da anamnese (opcional)"
          className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
        />
      </div>
    </section>
  );
}
