"use client";

import { useState } from "react";
import { Edit2, Save, StickyNote } from "lucide-react";

import {
  appointmentFormButtonPrimaryClass,
  appointmentFormButtonSecondaryClass,
  appointmentFormHeaderIconButtonClass,
} from "../../novo/appointment-form.styles";
import { updateClientNotes } from "./actions";

interface NotesSectionProps {
  clientId: string;
  initialNotes: string | null;
}

export function NotesSection({ clientId, initialNotes }: NotesSectionProps) {
  const [notes, setNotes] = useState(initialNotes || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await updateClientNotes(clientId, notes);
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setNotes(initialNotes || "");
    setIsEditing(false);
  };

  return (
    <div className="wl-surface-card overflow-hidden">
      <div className="wl-surface-card-header flex h-10 items-center justify-between border-b border-line px-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-studio-green" />
          <p className="wl-typo-card-name-sm text-studio-text">Observacoes internas</p>
        </div>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className={appointmentFormHeaderIconButtonClass}
            aria-label="Editar observacoes internas"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="wl-surface-card-body px-4 py-4">
        {isEditing ? (
          <div className="space-y-4">
            <textarea
              className="min-h-36 w-full rounded-xl border border-line wl-surface-input p-4 text-sm text-studio-text outline-none transition focus:ring-2 focus:ring-studio-green/20"
              rows={6}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Registre observacoes internas deste cliente..."
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className={appointmentFormButtonSecondaryClass}
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={`${appointmentFormButtonPrimaryClass} inline-flex gap-2`}
              >
                <Save className="h-3.5 w-3.5" />
                {isSaving ? "Salvando..." : "Salvar alteracoes"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="w-full rounded-xl border border-line bg-white p-4 text-left text-sm text-studio-text transition hover:bg-paper"
            onClick={() => setIsEditing(true)}
            title="Clique para editar"
          >
            {notes || "Nenhuma observacao registrada. Toque para adicionar."}
          </button>
        )}
      </div>
    </div>
  );
}

