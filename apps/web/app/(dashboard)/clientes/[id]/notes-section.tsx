"use client";

import { useState } from "react";
import { updateClientNotes } from "./actions";
import { Edit2, Save } from "lucide-react";

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
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 mb-6 relative">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-gray-800">Prontuário / Observações</h2>
        {!isEditing && (
            <button 
                onClick={() => setIsEditing(true)}
                className="text-xs font-bold text-studio-green flex items-center gap-1 hover:underline"
            >
                <Edit2 size={12} /> Editar
            </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
             <textarea
                className="w-full bg-yellow-50/50 border border-yellow-100 rounded-xl p-4 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-yellow-200 resize-none transition-all"
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escreva aqui observações sobre a cliente..."
                autoFocus
            />
            <div className="flex justify-end gap-2">
                <button 
                    onClick={handleCancel}
                    className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition"
                    disabled={isSaving}
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-studio-green text-white text-xs font-bold rounded-lg shadow-green-100 shadow-md hover:bg-studio-green-dark transition flex items-center gap-2"
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
            className="w-full bg-yellow-50/30 border border-yellow-50 rounded-xl p-4 text-gray-600 font-medium min-h-[100px] whitespace-pre-wrap cursor-pointer hover:bg-yellow-50/60 transition"
            onClick={() => setIsEditing(true)}
            title="Clique para editar"
        >
            {notes || "Nenhuma observação registrada. Clique em editar para adicionar."}
        </div>
      )}
     
    </div>
  );
}
