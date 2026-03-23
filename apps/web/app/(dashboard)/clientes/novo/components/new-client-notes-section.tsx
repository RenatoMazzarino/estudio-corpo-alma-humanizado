"use client";

import { StickyNote } from "lucide-react";
import {
  appointmentFormSectionHeaderPrimaryClass,
  appointmentFormSectionHeaderTextClass,
} from "../../../novo/appointment-form.styles";

type NewClientNotesSectionProps = {
  notes: string;
  onChangeNotesAction: (value: string) => void;
};

export function NewClientNotesSection({ notes, onChangeNotesAction }: NewClientNotesSectionProps) {
  return (
    <section className="wl-surface-card overflow-hidden">
      <div className={appointmentFormSectionHeaderPrimaryClass}>
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-studio-green" />
          <h3 className={appointmentFormSectionHeaderTextClass}>Observacoes internas</h3>
        </div>
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
