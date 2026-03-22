"use client";

import { Check } from "lucide-react";

type AppointmentNotesAndSubmitProps = {
  showNotes: boolean;
  showSubmit: boolean;
  isEditing: boolean;
  sectionCardClass: string;
  sectionNumberClass: string;
  sectionHeaderTextClass: string;
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
  sectionNumberClass,
  sectionHeaderTextClass,
  inputClass,
  internalNotes,
  onChangeInternalNotesAction,
  canOpenConfirmation,
  onOpenConfirmationPromptAction,
}: AppointmentNotesAndSubmitProps) {
  return (
    <>
      {showNotes ? (
        <section className={`${sectionCardClass} overflow-hidden`}>
          <div className="flex h-11 items-center gap-2 border-b border-line px-3 wl-surface-card-header">
            <div className={sectionNumberClass}>5</div>
            <h2 className={`${sectionHeaderTextClass} leading-none`}>Observacoes</h2>
          </div>
          <div className="space-y-3 px-4 py-4 wl-surface-card-body">
            <textarea
              name="internalNotes"
              rows={2}
              value={internalNotes}
              onChange={(event) => onChangeInternalNotesAction(event.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="Observacao do agendamento (ex.: ajustes de atendimento). Para historico da cliente, use o modulo Prontuario."
            />
            <p className="text-[10px] text-muted ml-1">Use este campo apenas para observacoes deste agendamento.</p>
          </div>
        </section>
      ) : null}

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
          Ir para confirmacao
        </button>
      ) : null}
    </>
  );
}
