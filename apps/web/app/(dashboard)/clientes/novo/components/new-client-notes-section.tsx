"use client";

type NewClientNotesSectionProps = {
  notes: string;
  onChangeNotes: (value: string) => void;
};

export function NewClientNotesSection({ notes, onChangeNotes }: NewClientNotesSectionProps) {
  return (
    <section className="bg-white rounded-3xl shadow-soft p-5 border border-white space-y-4">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Observações internas</p>
        <h2 className="text-lg font-serif text-studio-text">Notas do cliente</h2>
      </div>
      <textarea
        name="observacoes_gerais"
        value={notes}
        onChange={(event) => onChangeNotes(event.target.value)}
        placeholder="Observações internas do cliente"
        rows={3}
        className="w-full px-4 py-3 rounded-2xl bg-paper border border-line text-sm"
      />
    </section>
  );
}
