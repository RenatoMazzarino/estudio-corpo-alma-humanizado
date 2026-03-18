"use client";

import { useState } from "react";
import { Edit2, Save, StickyNote } from "lucide-react";

import { SurfaceCard } from "../../../../components/ui/surface-card";
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
    <SurfaceCard className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-studio-green" />
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">
            Observações internas
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-studio-green hover:underline"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Editar
          </button>
        )}
      </div>

      <div className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              className="min-h-34 w-full rounded-2xl border border-line bg-paper/70 p-4 text-sm text-studio-text outline-none transition focus:ring-2 focus:ring-studio-green/20"
              rows={6}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Escreva aqui observações internas do cliente..."
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-extrabold text-muted transition hover:text-studio-text"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-studio-green px-4 py-2 text-xs font-extrabold text-white shadow-soft transition hover:bg-studio-green-dark disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" />
                {isSaving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="w-full rounded-2xl border border-line bg-paper/60 p-4 text-left text-sm text-studio-text transition hover:bg-paper"
            onClick={() => setIsEditing(true)}
            title="Clique para editar"
          >
            {notes || "Nenhuma observação registrada. Toque para adicionar."}
          </button>
        )}
      </div>
    </SurfaceCard>
  );
}
