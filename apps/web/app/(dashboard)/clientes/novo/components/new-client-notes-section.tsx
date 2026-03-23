"use client";

type NewClientNotesSectionProps = {
  notes: string;
  onChangeNotesAction: (value: string) => void;
};

export function NewClientNotesSection({ notes, onChangeNotesAction }: NewClientNotesSectionProps) {
  return (
    <section className="wl-surface-card overflow-hidden">
      <div className="flex h-10 items-center gap-2 border-b border-line px-3 wl-surface-card-header">
        <p className="wl-typo-card-name-sm font-bold text-studio-text">Observacoes internas</p>
      </div>
      <div className="px-3 py-3">
        <textarea
          name="observacoes_gerais"
          value={notes}
          onChange={(event) => onChangeNotesAction(event.target.value)}
          placeholder="Observacoes importantes sobre este cliente"
          rows={5}
          className="w-full rounded-xl border border-line wl-surface-input px-4 py-3 text-sm"
        />
      </div>
    </section>
  );
}
