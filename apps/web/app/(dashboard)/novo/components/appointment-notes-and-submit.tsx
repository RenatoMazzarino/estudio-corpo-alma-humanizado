"use client";

import { Check } from "lucide-react";

type AppointmentNotesAndSubmitProps = {
  showNotes: boolean;
  showSubmit: boolean;
  isEditing: boolean;
  sectionCardClass: string;
  labelClass: string;
  inputClass: string;
  internalNotes: string;
  onChangeInternalNotesAction: (value: string) => void;
  canOpenConfirmation: boolean;
  onOpenConfirmationPromptAction: () => void;
};

export function AppointmentNotesAndSubmit({
  showNotes,
  showSubmit,
  isEditing,
  sectionCardClass,
  labelClass,
  inputClass,
  internalNotes,
  onChangeInternalNotesAction,
  canOpenConfirmation,
  onOpenConfirmationPromptAction,
}: AppointmentNotesAndSubmitProps) {
  return (
    <>
      {showNotes && (
        <section className={sectionCardClass}>
          <label className={labelClass}>Observações internas do agendamento</label>
          <textarea
            name="internalNotes"
            rows={2}
            value={internalNotes}
            onChange={(event) => onChangeInternalNotesAction(event.target.value)}
            className={`${inputClass} resize-none`}
            placeholder="Ex: Cliente prefere pressão leve..."
          />
          <p className="text-[10px] text-muted mt-1 ml-1">Aparece no atendimento.</p>
        </section>
      )}

      {isEditing ? (
        <button
          type="submit"
          className="w-full h-14 bg-studio-green text-white font-bold rounded-2xl shadow-lg shadow-green-900/10 text-sm uppercase tracking-wide hover:bg-studio-green-dark transition-all flex items-center justify-center gap-2 mb-4"
        >
          <Check className="w-5 h-5" />
          Agendar
        </button>
      ) : showSubmit ? (
        <button
          type="button"
          onClick={onOpenConfirmationPromptAction}
          disabled={!canOpenConfirmation}
          className={`w-full h-14 font-bold rounded-2xl text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 mb-4 ${
            canOpenConfirmation
              ? "bg-studio-green text-white shadow-lg shadow-green-900/10 hover:bg-studio-green-dark"
              : "bg-stone-200 text-stone-500 cursor-not-allowed"
          }`}
        >
          <Check className="w-5 h-5" />
          Ir para confirmação
        </button>
      ) : null}
    </>
  );
}
