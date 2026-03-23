"use client";

import { Check } from "lucide-react";
import {
  appointmentFormButtonPrimaryClass,
  appointmentFormSectionHeaderPrimaryClass,
} from "../appointment-form.styles";

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
          <div className={appointmentFormSectionHeaderPrimaryClass}>
            <div className="flex min-w-0 items-center gap-2">
              <div className={sectionNumberClass}>5</div>
              <h2 className={`${sectionHeaderTextClass} leading-none`}>Observacoes</h2>
            </div>
          </div>
          <div className="space-y-3 px-4 py-4 wl-surface-card-body">
            <textarea
              name="internalNotes"
              rows={5}
              value={internalNotes}
              onChange={(event) => onChangeInternalNotesAction(event.target.value)}
              className={`${inputClass} min-h-36 resize-y`}
              placeholder="Observacao do agendamento (ex.: ajustes de atendimento). Para historico da cliente, use o modulo Prontuario."
            />
            <p className="text-[10px] text-muted ml-1">Use este campo apenas para observacoes deste agendamento.</p>
          </div>
        </section>
      ) : null}

      {isEditing ? (
        <button
          type="submit"
          className={`${appointmentFormButtonPrimaryClass} mb-4 w-full gap-2 rounded-xl`}
        >
          <Check className="w-5 h-5" />
          Agendar
        </button>
      ) : showSubmit ? (
        <button
          type="button"
          onClick={onOpenConfirmationPromptAction}
          disabled={!canOpenConfirmation}
          className={`mb-4 w-full gap-2 rounded-xl ${
            canOpenConfirmation
              ? appointmentFormButtonPrimaryClass
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
