"use client";

import { useState } from "react";
import { updateClientNotes } from "./actions";
import { Edit2, Save } from "lucide-react";
import { SurfaceCard } from "../../../../components/ui/surface-card";

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
    <SurfaceCard className="relative">
      <div className="flex justify-between items-center mb-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Prontuário</p>
          <h2 className="text-lg font-serif text-studio-text">Observações internas</h2>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs font-extrabold text-studio-green flex items-center gap-1 hover:underline"
          >
            <Edit2 size={12} /> Editar
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            className="w-full bg-studio-light border border-line rounded-2xl p-4 text-studio-text text-sm focus:outline-none focus:ring-2 focus:ring-studio-green/20 resize-none transition-all"
            rows={6}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Escreva aqui observações sobre a cliente..."
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-extrabold text-muted hover:text-studio-text transition"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-studio-green text-white text-xs font-extrabold rounded-xl shadow-soft hover:bg-studio-green-dark transition flex items-center gap-2"
            >
              {isSaving ? "Salvando..." : (
                <>
                  <Save size={14} /> Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="w-full bg-studio-light/60 border border-line rounded-2xl p-4 text-muted text-sm whitespace-pre-wrap cursor-pointer hover:bg-studio-light transition"
          onClick={() => setIsEditing(true)}
          title="Clique para editar"
        >
          {notes || "Nenhuma observação registrada. Clique em editar para adicionar."}
        </div>
      )}
    </SurfaceCard>
  );
}
